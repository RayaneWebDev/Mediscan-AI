from collections.abc import Callable
from typing import Any, TypeVar

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

from backend.app.image_utils import hf_image_url, sanitize_image_id, with_public_result_paths
from backend.app.models.schema import IdSearchResponse, IdsSearchResponse, SearchResponse, TextSearchResponse
from backend.app.services.analysis_service import generate_clinical_conclusion
from backend.app.services.search_service import SearchService, SearchUnavailableError

router = APIRouter()
ResponseModelT = TypeVar("ResponseModelT", bound=BaseModel)


def _get_service(request: Request) -> SearchService:
    """Retrieve the SearchService loaded at startup."""
    return request.app.state.search_service


def _sanitize_image_id_or_400(image_id: str) -> str:
    try:
        return sanitize_image_id(image_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


def _as_http_exception(exc: Exception) -> HTTPException:
    if isinstance(exc, ValueError):
        return HTTPException(status_code=400, detail=str(exc))
    if isinstance(exc, SearchUnavailableError):
        return HTTPException(status_code=503, detail=str(exc))
    return HTTPException(status_code=500, detail=str(exc))


def _response_from_payload(
    model_class: type[ResponseModelT],
    payload: dict[str, Any],
) -> ResponseModelT:
    return model_class.model_validate(with_public_result_paths(payload))


def _run_service_call(
    model_class: type[ResponseModelT],
    call: Callable[[], dict[str, Any]],
) -> ResponseModelT:
    try:
        return _response_from_payload(model_class, call())
    except (ValueError, SearchUnavailableError, FileNotFoundError, RuntimeError) as exc:
        raise _as_http_exception(exc) from exc


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.post("/search", response_model=SearchResponse)
async def search_image(
    request: Request,
    image: UploadFile = File(...),
    mode: str = Form("visual"),
    k: int = Form(5),
) -> SearchResponse:
    service = _get_service(request)
    image_bytes = await image.read()

    return _run_service_call(
        SearchResponse,
        lambda: service.search(
            image_bytes=image_bytes,
            filename=image.filename or "query.png",
            content_type=image.content_type,
            mode=mode,
            k=k,
        ),
    )


class TextSearchRequest(BaseModel):
    text: str
    k: int = 5


@router.post("/search-text", response_model=TextSearchResponse)
async def search_text(body: TextSearchRequest, request: Request) -> TextSearchResponse:
    """Text-to-image search using BioMedCLIP semantic index."""
    service = _get_service(request)
    return _run_service_call(
        TextSearchResponse,
        lambda: service.search_text(text=body.text, k=body.k),
    )


@router.get("/images/{image_id}")
async def get_image(image_id: str) -> RedirectResponse:
    """Redirect to the HuggingFace dataset image."""
    return RedirectResponse(url=hf_image_url(_sanitize_image_id_or_400(image_id)))


class IdSearchRequest(BaseModel):
    image_id: str
    mode: str = "visual"
    k: int = 5


@router.post("/search-by-id", response_model=IdSearchResponse)
async def search_by_id(body: IdSearchRequest, request: Request) -> IdSearchResponse:
    """Relance une recherche depuis un image_id existant."""
    service = _get_service(request)
    safe_id = _sanitize_image_id_or_400(body.image_id)

    return _run_service_call(
        IdSearchResponse,
        lambda: service.search_by_id(
            image_id=safe_id,
            mode=body.mode,
            k=body.k,
        ),
    )


class IdsSearchRequest(BaseModel):
    image_ids: list[str]
    mode: str = "visual"
    k: int = 5


@router.post("/search-by-ids", response_model=IdsSearchResponse)
async def search_by_ids(body: IdsSearchRequest, request: Request) -> IdsSearchResponse:
    """Recherche par centroide depuis plusieurs image_ids selectionnes."""
    service = _get_service(request)
    safe_ids = [_sanitize_image_id_or_400(image_id) for image_id in body.image_ids]

    return _run_service_call(
        IdsSearchResponse,
        lambda: service.search_by_ids(
            image_ids=safe_ids,
            mode=body.mode,
            k=body.k,
        ),
    )


@router.post("/generate-conclusion")
async def get_conclusion(payload: dict) -> dict:
    """Génère une synthèse IA via LLM à partir des résultats de recherche."""
    conclusion = generate_clinical_conclusion(payload)
    return {"conclusion": conclusion}
