"""Search API endpoints for MediScan."""

from collections.abc import Callable
from contextlib import contextmanager
from typing import Any, TypeVar

from anyio import to_thread
from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse, RedirectResponse
from pydantic import BaseModel

from backend.app.config import (
    CONCURRENCY_LIMITS,
    MAX_UPLOAD_BYTES,
    RATE_LIMITS,
    RATE_LIMIT_WINDOW_SECONDS,
    TRUST_PROXY_HEADERS,
)
from backend.app.image_utils import hf_image_url, sanitize_image_id, with_public_result_paths
from backend.app.models.schema import (
    ConclusionRequest,
    ConclusionResponse,
    ContactRequest,
    ContactResponse,
    IdSearchResponse,
    IdsSearchResponse,
    SearchResponse,
    TextSearchResponse,
)
from backend.app.services.analysis_service import ClinicalConclusionError, generate_clinical_conclusion
from backend.app.services.email_service import EmailConfigurationError, EmailDeliveryError, EmailService
from backend.app.services.request_guards import (
    InMemoryRateLimiter,
    RequestConcurrencyLimiter,
    TooManyConcurrentRequests,
    client_identifier,
)
from backend.app.services.readiness import build_readiness_report
from backend.app.services.search_service import SearchService, SearchUnavailableError

router = APIRouter()
ResponseModelT = TypeVar("ResponseModelT", bound=BaseModel)
UPLOAD_CHUNK_SIZE = 1024 * 1024
CONCURRENCY_BUCKET_SEARCH = "search"
CONCURRENCY_BUCKET_CONCLUSION = "conclusion"
CONCURRENCY_BUCKET_CONTACT = "contact"


def _get_service(request: Request) -> SearchService:
    """Return the global SearchService instance."""
    return request.app.state.search_service


def _get_email_service(request: Request) -> EmailService:
    """Return the global EmailService instance."""
    return request.app.state.email_service


def _get_rate_limiter(request: Request) -> InMemoryRateLimiter:
    """Get or create the process-local rate limiter shared by all requests."""
    limiter = getattr(request.app.state, "rate_limiter", None)
    if limiter is None:
        limiter = InMemoryRateLimiter(RATE_LIMITS, RATE_LIMIT_WINDOW_SECONDS)
        request.app.state.rate_limiter = limiter
    return limiter


def _get_concurrency_limiter(request: Request) -> RequestConcurrencyLimiter:
    """Get or create the limiter used to protect expensive CPU/model work."""
    limiter = getattr(request.app.state, "concurrency_limiter", None)
    if limiter is None:
        limiter = RequestConcurrencyLimiter(CONCURRENCY_LIMITS)
        request.app.state.concurrency_limiter = limiter
    return limiter


def _enforce_rate_limit(request: Request, bucket: str) -> None:
    """Apply the per-client quota for a public endpoint bucket."""
    identifier = client_identifier(request, trust_proxy_headers=TRUST_PROXY_HEADERS)
    decision = _get_rate_limiter(request).check(bucket, identifier)
    if decision.allowed:
        return

    raise HTTPException(
        status_code=429,
        detail="Too many requests. Please retry later.",
        headers={"Retry-After": str(decision.retry_after_seconds)},
    )


@contextmanager
def _guard_concurrency(request: Request, bucket: str):
    """Reserve an expensive-processing slot or surface a retryable 429 error."""
    try:
        with _get_concurrency_limiter(request).acquire(bucket):
            yield
    except TooManyConcurrentRequests as exc:
        raise HTTPException(
            status_code=429,
            detail="Too many concurrent requests. Please retry shortly.",
            headers={"Retry-After": "1"},
        ) from exc


def _sanitize_image_id_or_400(image_id: str) -> str:
    """Clean and validate an image identifier at the HTTP boundary."""
    try:
        return sanitize_image_id(image_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


def _as_http_exception(exc: Exception) -> HTTPException:
    """Map domain/service exceptions to the HTTP status expected by clients."""
    if isinstance(exc, ValueError):
        return HTTPException(status_code=400, detail=str(exc))
    if isinstance(exc, SearchUnavailableError):
        return HTTPException(status_code=503, detail=str(exc))
    if isinstance(exc, ClinicalConclusionError):
        return HTTPException(status_code=503, detail=str(exc))
    return HTTPException(status_code=500, detail=str(exc))


def _response_from_payload(
    model_class: type[ResponseModelT],
    payload: dict[str, Any],
) -> ResponseModelT:
    """
    Convert a raw result dictionary into a Pydantic response model.

    Replace local paths with public HuggingFace URLs before validation.
    """
    return model_class.model_validate(with_public_result_paths(payload))


async def _run_guarded_service_call(
    request: Request,
    *,
    concurrency_bucket: str,
    model_class: type[ResponseModelT],
    call: Callable[[], dict[str, Any]],
) -> ResponseModelT:
    """
    Run a blocking service call in a worker thread behind concurrency limits.

    Model inference and FAISS work are synchronous, so this helper keeps FastAPI's
    event loop responsive while still applying the same error mapping everywhere.
    """
    try:
        with _guard_concurrency(request, concurrency_bucket):
            payload = await to_thread.run_sync(call)
        return _response_from_payload(model_class, payload)
    except (ValueError, SearchUnavailableError, FileNotFoundError, RuntimeError) as exc:
        raise _as_http_exception(exc) from exc


async def _read_upload_bytes(image: UploadFile) -> bytes:
    """Read an uploaded file in chunks while enforcing the configured size limit."""
    chunks: list[bytes] = []
    total_size = 0

    while True:
        chunk = await image.read(UPLOAD_CHUNK_SIZE)
        if not chunk:
            break

        total_size += len(chunk)
        if total_size > MAX_UPLOAD_BYTES:
            max_size_mb = MAX_UPLOAD_BYTES / (1024 * 1024)
            raise HTTPException(
                status_code=413,
                detail=f"Uploaded image exceeds the {max_size_mb:.0f} MB limit",
            )
        chunks.append(chunk)

    return b"".join(chunks)


@router.get("/health")
def health() -> dict[str, str]:
    """Check only that the API process responds."""
    return {"status": "ok"}


@router.get("/ready")
def ready(request: Request) -> JSONResponse:
    """Check that dependencies required for production traffic are ready."""
    report = build_readiness_report(_get_email_service(request))
    return JSONResponse(status_code=report.http_status, content=report.payload)


@router.post("/search", response_model=SearchResponse)
async def search_image(
    request: Request,
    image: UploadFile = File(...),
    mode: str = Form("visual"),
    k: int = Form(5),
) -> SearchResponse:
    """Run visual or semantic similarity search from an uploaded image file."""
    _enforce_rate_limit(request, "search")
    service = _get_service(request)
    image_bytes = await _read_upload_bytes(image)

    return await _run_guarded_service_call(
        request,
        concurrency_bucket=CONCURRENCY_BUCKET_SEARCH,
        model_class=SearchResponse,
        call=lambda: service.search(
            image_bytes=image_bytes,
            filename=image.filename or "query.png",
            content_type=image.content_type,
            mode=mode,
            k=k,
        ),
    )


class TextSearchRequest(BaseModel):
    """Request body for text-to-image search."""

    text: str
    k: int = 5


@router.post("/search-text", response_model=TextSearchResponse)
async def search_text(body: TextSearchRequest, request: Request) -> TextSearchResponse:
    """Run text-to-image search through the BioMedCLIP semantic index."""
    _enforce_rate_limit(request, "search_text")
    service = _get_service(request)
    return await _run_guarded_service_call(
        request,
        concurrency_bucket=CONCURRENCY_BUCKET_SEARCH,
        model_class=TextSearchResponse,
        call=lambda: service.search_text(text=body.text, k=body.k),
    )


@router.get("/images/{image_id}")
async def get_image(image_id: str) -> RedirectResponse:
    """Redirect directly to the image hosted on HuggingFace."""
    return RedirectResponse(url=hf_image_url(_sanitize_image_id_or_400(image_id)))


class IdSearchRequest(BaseModel):
    """Request body for relaunching a search from one image_id."""

    image_id: str
    mode: str = "visual"
    k: int = 5


@router.post("/search-by-id", response_model=IdSearchResponse)
async def search_by_id(body: IdSearchRequest, request: Request) -> IdSearchResponse:
    """Run similarity search from one existing image by ID."""
    _enforce_rate_limit(request, "search_by_id")
    service = _get_service(request)
    safe_id = _sanitize_image_id_or_400(body.image_id)

    return await _run_guarded_service_call(
        request,
        concurrency_bucket=CONCURRENCY_BUCKET_SEARCH,
        model_class=IdSearchResponse,
        call=lambda: service.search_by_id(
            image_id=safe_id,
            mode=body.mode,
            k=body.k,
        ),
    )


class IdsSearchRequest(BaseModel):
    """Request body for relaunching a search from multiple image_ids."""

    image_ids: list[str]
    mode: str = "visual"
    k: int = 5


@router.post("/search-by-ids", response_model=IdsSearchResponse)
async def search_by_ids(body: IdsSearchRequest, request: Request) -> IdsSearchResponse:
    """Run centroid search from a sanitized multi-image selection."""
    _enforce_rate_limit(request, "search_by_ids")
    service = _get_service(request)
    safe_ids = [_sanitize_image_id_or_400(image_id) for image_id in body.image_ids]

    return await _run_guarded_service_call(
        request,
        concurrency_bucket=CONCURRENCY_BUCKET_SEARCH,
        model_class=IdsSearchResponse,
        call=lambda: service.search_by_ids(
            image_ids=safe_ids,
            mode=body.mode,
            k=body.k,
        ),
    )


@router.post("/generate-conclusion", response_model=ConclusionResponse)
async def get_conclusion(body: ConclusionRequest, request: Request) -> ConclusionResponse:
    """Generate a cautious AI summary from server-owned search-result context."""
    _enforce_rate_limit(request, "conclusion")
    try:
        with _guard_concurrency(request, CONCURRENCY_BUCKET_CONCLUSION):
            conclusion = await to_thread.run_sync(
                lambda: generate_clinical_conclusion(body.model_dump())
            )
    except (ValueError, ClinicalConclusionError) as exc:
        raise _as_http_exception(exc) from exc

    return ConclusionResponse(conclusion=conclusion)


@router.post("/contact", response_model=ContactResponse)
async def contact(body: ContactRequest, request: Request) -> ContactResponse:
    """Send a contact message by email through the configured SMTP service."""
    _enforce_rate_limit(request, "contact")
    if body.website:
        raise HTTPException(status_code=400, detail="Invalid contact submission.")

    email_service = _get_email_service(request)

    try:
        with _guard_concurrency(request, CONCURRENCY_BUCKET_CONTACT):
            await to_thread.run_sync(
                lambda: email_service.send_contact_email(
                    name=body.name,
                    email=body.email,
                    subject=body.subject,
                    message=body.message,
                )
            )
    except EmailConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except EmailDeliveryError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return ContactResponse(success=True, message="Contact email sent successfully.")
