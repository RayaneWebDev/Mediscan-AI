"""
Endpoints de l'API de recherche Mediscan.

Ce module définit les routes FastAPI pour la recherche d'images médicales
par téléchargement d'image, par texte, ou par identifiants d'images existants.
Il expose également les routes de génération de synthèse IA et de contact.
"""

from collections.abc import Callable
from typing import Any, TypeVar

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

from backend.app.config import MAX_UPLOAD_BYTES
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
from backend.app.services.search_service import SearchService, SearchUnavailableError

router = APIRouter()
ResponseModelT = TypeVar("ResponseModelT", bound=BaseModel)
UPLOAD_CHUNK_SIZE = 1024 * 1024


def _get_service(request: Request) -> SearchService:
    """
    Récupère l'instance globale de SearchService.
    Le service est stocké dans l'état de l'application (app.state) lors du démarrage.
    """
    return request.app.state.search_service


def _get_email_service(request: Request) -> EmailService:
    """
    Récupère l'instance globale de EmailService.
    Le service est initialisé au démarrage à partir des variables d'environnement SMTP.
    """
    return request.app.state.email_service


def _sanitize_image_id_or_400(image_id: str) -> str:
    """
    Nettoie et valide un identifiant d'image, ou lève une HTTPException 400.

    Args:
        image_id: L'identifiant brut à vérifier.

    Returns:
        L'identifiant nettoyé s'il est valide.

    Raises:
        HTTPException (400): Si l'identifiant contient des caractères non autorisés.
    """
    try:
        return sanitize_image_id(image_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


def _as_http_exception(exc: Exception) -> HTTPException:
    """Convertit une exception métier en HTTPException avec le bon code HTTP."""
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
    Convertit un dictionnaire de résultats bruts en modèle de réponse Pydantic.
    Remplace les chemins locaux par les URLs HuggingFace publiques avant la validation.
    """
    return model_class.model_validate(with_public_result_paths(payload))


def _run_service_call(
    model_class: type[ResponseModelT],
    call: Callable[[], dict[str, Any]],
) -> ResponseModelT:
    """
    Exécute un appel au service de recherche et gère les exceptions de manière uniforme.

    Args:
        model_class: Le modèle Pydantic cible pour la réponse.
        call: La fonction lambda qui appelle le service.

    Returns:
        Une instance du modèle de réponse remplie avec les résultats.

    Raises:
        HTTPException: En cas d'erreur métier (400, 503, 500).
    """
    try:
        return _response_from_payload(model_class, call())
    except (ValueError, SearchUnavailableError, FileNotFoundError, RuntimeError) as exc:
        raise _as_http_exception(exc) from exc


async def _read_upload_bytes(image: UploadFile) -> bytes:
    """
    Lit le fichier image uploadé par chunks et vérifie que la taille ne dépasse pas la limite.

    Args:
        image: Le fichier image uploadé via la requête multipart.

    Returns:
        Les octets du fichier image.

    Raises:
        HTTPException (413): Si la taille du fichier dépasse MAX_UPLOAD_BYTES.
    """
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
    """Vérifie si l'API est opérationnelle."""
    return {"status": "ok"}


@router.post("/search", response_model=SearchResponse)
async def search_image(
    request: Request,
    image: UploadFile = File(...),
    mode: str = Form("visual"),
    k: int = Form(5),
) -> SearchResponse:
    """
    Recherche par similarité à partir d'un fichier image uploadé.

    - Le fichier image doit être au format PNG ou JPEG.
    - Le mode peut être 'visual' (similarité visuelle via DinoV2)
      ou 'semantic' (similarité sémantique via BioMedCLIP).
    - Retourne les k images les plus similaires du dataset ROCOv2.
    """
    service = _get_service(request)
    image_bytes = await _read_upload_bytes(image)

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
    """
    Recherche Text-to-Image via l'index sémantique BioMedCLIP.
    Permet de trouver des images médicales à partir d'une description textuelle
    en exploitant les capacités multimodales du modèle BioMedCLIP.
    """
    service = _get_service(request)
    return _run_service_call(
        TextSearchResponse,
        lambda: service.search_text(text=body.text, k=body.k),
    )


@router.get("/images/{image_id}")
async def get_image(image_id: str) -> RedirectResponse:
    """
    Redirige directement vers l'image hébergée sur HuggingFace.
    Détermine dynamiquement le sous-dossier (images_01, images_02, etc.)
    à partir du numéro de séquence présent dans l'identifiant ROCOv2.
    """
    return RedirectResponse(url=hf_image_url(_sanitize_image_id_or_400(image_id)))


class IdSearchRequest(BaseModel):
    image_id: str
    mode: str = "visual"
    k: int = 5


@router.post("/search-by-id", response_model=IdSearchResponse)
async def search_by_id(body: IdSearchRequest, request: Request) -> IdSearchResponse:
    """
    Lance une recherche de similarité à partir d'une seule image existante (via son ID).
    Utile pour relancer une recherche depuis un résultat déjà affiché.
    """
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
    """
    Recherche par centroïde à partir d'une sélection de plusieurs images.
    Combine les vecteurs des images sélectionnées via mean-pooling des embeddings
    pour produire un vecteur requête unique représentatif de la sélection.
    """
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


@router.post("/generate-conclusion", response_model=ConclusionResponse)
async def get_conclusion(body: ConclusionRequest) -> ConclusionResponse:
    """
    Génère une synthèse IA prudente à partir des résultats de recherche.
    Utilise le LLM Groq pour produire un résumé cliniquement prudent
    à partir des descriptions des images les plus similaires trouvées.
    Ne remplace pas l'avis d'un professionnel de santé.
    """
    try:
        conclusion = generate_clinical_conclusion(body.model_dump())
    except (ValueError, ClinicalConclusionError) as exc:
        raise _as_http_exception(exc) from exc

    return ConclusionResponse(conclusion=conclusion)


@router.post("/contact", response_model=ContactResponse)
async def contact(body: ContactRequest, request: Request) -> ContactResponse:
    """
    Envoie un message de contact par email via le service SMTP configuré.
    Nécessite que les variables d'environnement MEDISCAN_SMTP_* soient définies.
    """
    email_service = _get_email_service(request)

    try:
        email_service.send_contact_email(
            name=body.name,
            email=body.email,
            subject=body.subject,
            message=body.message,
        )
    except EmailConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except EmailDeliveryError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return ContactResponse(success=True, message="Contact email sent successfully.")
