from __future__ import annotations

from pathlib import Path

from backend.app.config import ALLOWED_CONTENT_TYPES, ALLOWED_MODES, MAX_K
from backend.app.image_utils import sanitize_image_id

MAX_TEXT_QUERY_LENGTH = 500
MAX_SELECTION_SIZE = 20
ALLOWED_IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png"}


def normalize_mode(mode: str) -> str:
    normalized_mode = mode.strip().lower()
    if normalized_mode not in ALLOWED_MODES:
        raise ValueError(f"Unsupported mode: {mode}")
    return normalized_mode


def validate_k(k: int) -> None:
    if not 0 < k <= MAX_K:
        raise ValueError(f"k must be between 1 and {MAX_K}")


def validate_content_type(content_type: str | None) -> None:
    if content_type and content_type not in ALLOWED_CONTENT_TYPES:
        raise ValueError("Only JPEG and PNG images are accepted")


def validate_image_bytes(image_bytes: bytes) -> None:
    if not image_bytes:
        raise ValueError("Uploaded image is empty")


def validate_text_query(text: str) -> str:
    normalized_text = text.strip()
    if not normalized_text:
        raise ValueError("Query text is empty")
    if len(normalized_text) > MAX_TEXT_QUERY_LENGTH:
        raise ValueError(f"Query text too long (max {MAX_TEXT_QUERY_LENGTH} characters)")
    return normalized_text


def validate_selected_image_ids(image_ids: list[str]) -> list[str]:
    if not image_ids:
        raise ValueError("La liste d'image_ids est vide")
    if len(image_ids) > MAX_SELECTION_SIZE:
        raise ValueError(f"Maximum {MAX_SELECTION_SIZE} images selectionnables")
    return [sanitize_image_id(image_id) for image_id in image_ids]


def pick_image_suffix(filename: str) -> str:
    suffix = Path(filename or "query.png").suffix.lower()
    return suffix if suffix in ALLOWED_IMAGE_SUFFIXES else ".png"
