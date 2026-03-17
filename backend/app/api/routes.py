from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from backend.app.models.schema import SearchResponse
from backend.app.services.search_service import SearchService

router = APIRouter()
service = SearchService()


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.post("/search", response_model=SearchResponse)
async def search_image(
    image: UploadFile = File(...),
    mode: str = Form("visual"),
    k: int = Form(5),
) -> SearchResponse:
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
    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
