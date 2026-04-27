"""User input validation functions for the MediScan search pipeline."""

from __future__ import annotations

from pathlib import Path

from backend.app.config import ALLOWED_CONTENT_TYPES, ALLOWED_MODES, MAX_K, MAX_UPLOAD_BYTES
from backend.app.image_utils import sanitize_image_id

MAX_TEXT_QUERY_LENGTH = 500
MAX_SELECTION_SIZE = 20
ALLOWED_IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png"}


def normalize_mode(mode: str) -> str:
    """Check that the selected search mode is supported and normalize it."""
    normalized_mode = mode.strip().lower()
    if normalized_mode not in ALLOWED_MODES:
        raise ValueError(f"Unsupported mode: {mode}")
    return normalized_mode


def validate_k(k: int) -> None:
    """Check that the requested result count k is within allowed limits."""
    if not 0 < k <= MAX_K:
        raise ValueError(f"k must be between 1 and {MAX_K}")


def validate_content_type(content_type: str | None) -> None:
    """Check that the image MIME type is allowed (JPEG or PNG)."""
    if content_type and content_type not in ALLOWED_CONTENT_TYPES:
        raise ValueError("Only JPEG and PNG images are accepted")


def validate_image_bytes(image_bytes: bytes) -> None:
    """Check that image bytes are not empty and do not exceed the limit."""
    if not image_bytes:
        raise ValueError("Uploaded image is empty")
    if len(image_bytes) > MAX_UPLOAD_BYTES:
        max_size_mb = MAX_UPLOAD_BYTES / (1024 * 1024)
        raise ValueError(f"Uploaded image exceeds the {max_size_mb:.0f} MB limit")


def validate_text_query(text: str) -> str:
    """Check and normalize a text query before sending it to the semantic pipeline."""
    normalized_text = text.strip()
    if not normalized_text:
        raise ValueError("Query text is empty")
    if len(normalized_text) > MAX_TEXT_QUERY_LENGTH:
        raise ValueError(f"Query text too long (max {MAX_TEXT_QUERY_LENGTH} characters)")
    return normalized_text


def validate_selected_image_ids(image_ids: list[str]) -> list[str]:
    """Check and sanitize a list of selected image identifiers."""
    if not image_ids:
        raise ValueError("La liste d'image_ids est vide")
    if len(image_ids) > MAX_SELECTION_SIZE:
        raise ValueError(f"Maximum {MAX_SELECTION_SIZE} images selectionnables")
    return [sanitize_image_id(image_id) for image_id in image_ids]


def pick_image_suffix(filename: str) -> str:
    """Determine the file extension to use for the temporary image."""
    suffix = Path(filename or "query.png").suffix.lower()
    return suffix if suffix in ALLOWED_IMAGE_SUFFIXES else ".png"
