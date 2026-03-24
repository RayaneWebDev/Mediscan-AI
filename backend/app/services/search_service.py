from __future__ import annotations

from pathlib import Path
from tempfile import NamedTemporaryFile

from PIL import Image, UnidentifiedImageError

from backend.app.config import ALLOWED_CONTENT_TYPES, ALLOWED_MODES, MAX_K
from mediscan.search import SearchResources, query


class SearchUnavailableError(RuntimeError):
    """Raised when a requested retrieval mode is not available at runtime."""


class SearchService:
    """Validates user input and delegates to the mediscan search pipeline."""

    def __init__(self, resources: dict[str, SearchResources]) -> None:
        self._resources = resources

    @staticmethod
    def _normalize_mode(mode: str) -> str:
        normalized_mode = mode.strip().lower()
        if normalized_mode not in ALLOWED_MODES:
            raise ValueError(f"Unsupported mode: {mode}")
        return normalized_mode

    @staticmethod
    def _validate_k(k: int) -> None:
        if not 0 < k <= MAX_K:
            raise ValueError(f"k must be between 1 and {MAX_K}")

    @staticmethod
    def _validate_content_type(content_type: str | None) -> None:
        if content_type and content_type not in ALLOWED_CONTENT_TYPES:
            raise ValueError("Only JPEG and PNG images are accepted")

    @staticmethod
    def _validate_image_bytes(image_bytes: bytes) -> None:
        if not image_bytes:
            raise ValueError("Uploaded image is empty")

    @staticmethod
    def _pick_suffix(filename: str) -> str:
        suffix = Path(filename or "query.png").suffix.lower()
        return suffix if suffix in {".jpg", ".jpeg", ".png"} else ".png"

    @staticmethod
    def _verify_image(temp_path: Path) -> None:
        try:
            with Image.open(temp_path) as image:
                image.verify()
        except (UnidentifiedImageError, OSError) as exc:
            raise ValueError("Invalid image file") from exc

    def _get_resources(self, mode: str) -> SearchResources:
        resources = self._resources.get(mode)
        if resources is None:
            raise SearchUnavailableError(
                f"Search mode '{mode}' is unavailable on this instance. "
                "Install the required data/artifacts or rebuild the stable indexes."
            )
        return resources

    def search(
        self,
        *,
        image_bytes: bytes,
        filename: str,
        content_type: str | None,
        mode: str = "visual",
        k: int = 5,
    ) -> dict:
        normalized_mode = self._normalize_mode(mode)
        self._validate_k(k)
        self._validate_content_type(content_type)
        self._validate_image_bytes(image_bytes)

        temp_path: Path | None = None
        try:
            with NamedTemporaryFile(delete=False, suffix=self._pick_suffix(filename)) as handle:
                handle.write(image_bytes)
                temp_path = Path(handle.name)

            self._verify_image(temp_path)
            resources = self._get_resources(normalized_mode)
            results = query(resources=resources, image=temp_path, k=k)
            return {
                "mode": normalized_mode,
                "embedder": resources.embedder.name,
                "query_image": filename,
                "results": results,
            }
        finally:
            if temp_path is not None:
                temp_path.unlink(missing_ok=True)
