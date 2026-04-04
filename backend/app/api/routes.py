"""
Endpoints de l'API de recherche Mediscan.

Ce module définit les routes FastAPI pour la recherche d'images médicales 
par téléchargement, par texte, ou par IDs.
"""

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

from backend.app.models.schema import SearchResponse, TextSearchResponse, IdSearchResponse
from backend.app.config import ALLOWED_MODES, HF_BASE_URL
from backend.app.models.schema import SearchResponse, TextSearchResponse
from backend.app.services.search_service import SearchUnavailableError
from backend.app.models.schema import SearchResponse, TextSearchResponse, IdSearchResponse, IdsSearchResponse

router = APIRouter()


def _get_service(request: Request):
    """ 
    - Récupère l'instance globale de SearchService.
    - Le service est stocké dans l'état de l'application (app.state) lors du démarrage.
    """
    return request.app.state.search_service


def _sanitize_image_id(image_id: str) -> str:
    """
    Args:
        image_id: L'ID brut à vérifier.
    
    Returns:
        L'ID nettoyé s'il est valide.
        
    Raises:
        HTTPException: Si l'ID contient des caractères non autorisés.
    """
    safe_id = "".join(c for c in image_id if c.isalnum() or c in ("_", "-"))
    if safe_id != image_id:
        raise HTTPException(status_code=400, detail="Invalid image ID")
    return safe_id


def _hf_image_url(image_id: str) -> str:
    """
    Génère l'URL HuggingFace correspondant à un identifiant d'image. 

    - Détermine dynamiquement le dossier (images_01, images_02, etc.) en fonction
    du numéro de séquence présent dans l'ID ROCOv2.
    - Les identifiants d'images suivent le format ROCOv2_2023_train_XXXXXX.
    """
    num_str = image_id.split("_")[-1]
    folder_idx = (int(num_str) - 1) // 1000 + 1
    folder_name = f"images_{folder_idx:02d}"
    return f"{HF_BASE_URL}/{folder_name}/{image_id}.png"


@router.get("/health")
def health() -> dict[str, str]:
    """Vérifie si l'API est opérationnelle."""
    return {"status": "ok"}


@router.post("/search", response_model=SearchResponse)
async def search_image(request: Request, image: UploadFile = File(...), mode: str = Form("visual"), k: int = Form(5),) -> SearchResponse:
    """
    Recherche par similarité à partir d'un fichier image.
    
    - Le fichier image autorisé (PNG, JPG).
    - Le mode 'visual' ou 'semantic'.
    - Le nombre k de résultats voulus.
    """
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
        # Replace local paths with HuggingFace URLs
        for res in payload.get("results", []):
            try:
                res["path"] = _hf_image_url(_sanitize_image_id(res["image_id"]))
            except Exception:
                pass
        return SearchResponse(**payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except SearchUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except (FileNotFoundError, RuntimeError) as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


class TextSearchRequest(BaseModel):
    text: str
    k: int = 5


@router.post("/search-text", response_model=TextSearchResponse)
async def search_text(body: TextSearchRequest, request: Request) -> TextSearchResponse:
    """
    - Recherche 'Text-to-Image' via l'index sémantique.
    - Permet de trouver des images médicales à partir d'une description textuelle
      en utilisant les capacités multimodales de BioMedCLIP.
    """
    service = _get_service(request)
    try:
        payload = service.search_text(text=body.text, k=body.k)
        # Replace local paths with HuggingFace URLs
        for res in payload.get("results", []):
            try:
                res["path"] = _hf_image_url(_sanitize_image_id(res["image_id"]))
            except Exception:
                pass
        return TextSearchResponse(**payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except SearchUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/images/{image_id}")
async def get_image(image_id: str) -> RedirectResponse:
    """ 
    - Redirige directement vers l'image hébergée sur HuggingFace. 
    """
    safe_id = _sanitize_image_id(image_id)
    return RedirectResponse(url=_hf_image_url(safe_id))


class IdSearchRequest(BaseModel):
    image_id: str
    mode: str = "visual"
    k: int = 5


@router.post("/search-by-id", response_model=IdSearchResponse)
async def search_by_id(body: IdSearchRequest, request: Request) -> IdSearchResponse:
    """
    - Lance une recherche de similarité à partir d'une seule image existante (via ID).
    """
    service = _get_service(request)
    try:
        safe_id = _sanitize_image_id(body.image_id)
        payload = service.search_by_id(
            image_id=safe_id,
            mode=body.mode,
            k=body.k,
        )
        for res in payload.get("results", []):
            try:
                res["path"] = _hf_image_url(_sanitize_image_id(res["image_id"]))
            except Exception:
                pass
        return IdSearchResponse(**payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except SearchUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except (FileNotFoundError, RuntimeError) as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    


class IdsSearchRequest(BaseModel):
    image_ids: list[str]
    mode: str = "visual"
    k: int = 5


@router.post("/search-by-ids", response_model=IdsSearchResponse)
async def search_by_ids(body: IdsSearchRequest, request: Request) -> IdsSearchResponse:
    """
    - Recherche par centroïde à partir d'une sélection de plusieurs images sélectionnées.
    - Combine les vecteurs des images sélectionnées en utilisant le max des embeddings.
    """
    service = _get_service(request)
    try:
        safe_ids = [_sanitize_image_id(iid) for iid in body.image_ids]
        payload = service.search_by_ids(
            image_ids=safe_ids,
            mode=body.mode,
            k=body.k,
        )
        for res in payload.get("results", []):
            try:
                res["path"] = _hf_image_url(_sanitize_image_id(res["image_id"]))
            except Exception:
                pass
        return IdsSearchResponse(**payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except SearchUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except (FileNotFoundError, RuntimeError) as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc