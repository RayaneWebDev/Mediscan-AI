from __future__ import annotations

from argparse import Namespace
from pathlib import Path
from tempfile import NamedTemporaryFile

from PIL import Image, UnidentifiedImageError

from backend.app.config import ALLOWED_CONTENT_TYPES, ALLOWED_MODES, MAX_K
from scripts import query as query_module


class SearchService:
    def search(
        self,
        *,
        image_bytes: bytes,
        filename: str,
        content_type: str | None,
        mode: str = "visual",
        k: int = 5,
    ) -> dict:
        normalized_mode = mode.strip().lower()
        if normalized_mode not in ALLOWED_MODES:
            raise ValueError(f"Unsupported mode: {mode}")
        if not 0 < k <= MAX_K:
            raise ValueError(f"k must be between 1 and {MAX_K}")
        if content_type and content_type not in ALLOWED_CONTENT_TYPES:
            raise ValueError("Only JPEG and PNG images are accepted")
        if not image_bytes:
            raise ValueError("Uploaded image is empty")

        suffix = Path(filename or "query.png").suffix.lower()
        if suffix not in {".jpg", ".jpeg", ".png"}:
            suffix = ".png"

        temp_path: Path | None = None
        try:
            with NamedTemporaryFile(delete=False, suffix=suffix) as handle:
                handle.write(image_bytes)
                temp_path = Path(handle.name)

            try:
                with Image.open(temp_path) as image:
                    image.verify()
            except (UnidentifiedImageError, OSError) as exc:
                raise ValueError("Invalid image file") from exc

            args = Namespace(
                mode=normalized_mode,
                image=str(temp_path),
                k=k,
                embedder=None,
                model_name=None,
                index_path=None,
                ids_path=None,
                exclude_self=False,
            )
            embedder_name, _, results = query_module.run_query(args)
            return {
                "mode": normalized_mode,
                "embedder": embedder_name,
                "query_image": filename,
                "results": results,
            }
        finally:
            if temp_path is not None:
                temp_path.unlink(missing_ok=True)
