from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel

from backend.app.config import ALLOWED_MODES
from backend.app.models.schema import SearchResponse, TextSearchResponse
from backend.app.services.search_service import SearchUnavailableError
from mediscan.runtime import PROJECT_ROOT

router = APIRouter()

IMAGES_DIR = PROJECT_ROOT / "data" / "roco_train_full" / "images"


def _get_service(request: Request):
    """Retrieve the SearchService loaded at startup."""
    return request.app.state.search_service


def _sanitize_image_id(image_id: str) -> str:
    """Allow only the stable dataset ID characters used by the project."""
    safe_id = "".join(c for c in image_id if c.isalnum() or c in ("_", "-"))
    if safe_id != image_id:
        raise HTTPException(status_code=400, detail="Invalid image ID")
    return safe_id


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
    try:
        image_bytes = await image.read()
        payload = service.search(
            image_bytes=image_bytes,
            filename=image.filename or "query.png",
            content_type=image.content_type,
            mode=mode,
            k=k,
        )
        return SearchResponse(**payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except SearchUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


class TextSearchRequest(BaseModel):
    text: str
    k: int = 5


@router.post("/search-text", response_model=TextSearchResponse)
async def search_text(body: TextSearchRequest, request: Request) -> TextSearchResponse:
    """Text-to-image search using BioMedCLIP semantic index.

    Accepts a medical text query (English) and returns top-k matching images.
    Always uses the semantic mode (BioMedCLIP). No image upload required.
    """
    service = _get_service(request)
    try:
        payload = service.search_text(text=body.text, k=body.k)
        return TextSearchResponse(**payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except SearchUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/images/{image_id}")
def get_image(image_id: str) -> FileResponse:
    """Serve a dataset image by its ID."""
    safe_id = _sanitize_image_id(image_id)
    for ext in (".png", ".jpg", ".jpeg"):
        path = IMAGES_DIR / f"{safe_id}{ext}"
        if path.exists():
            return FileResponse(path, media_type=f"image/{ext.lstrip('.')}")

    raise HTTPException(status_code=404, detail="Image not found")
