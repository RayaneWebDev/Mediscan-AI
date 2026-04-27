"""Temporary storage and image download handling for the search pipeline."""

from __future__ import annotations

from collections.abc import Iterator
from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager
from functools import partial
from pathlib import Path
from shutil import copyfileobj
from tempfile import NamedTemporaryFile
from urllib.error import URLError
from urllib.request import urlopen

import numpy as np
from PIL import Image, UnidentifiedImageError

from backend.app.config import REMOTE_IMAGE_TIMEOUT_SECONDS
from backend.app.image_utils import hf_image_url

MAX_DOWNLOAD_WORKERS = 8


def verify_image(temp_path: Path) -> None:
    """Check that a temporary image file is valid and not corrupted."""
    try:
        with Image.open(temp_path) as image:
            image.verify()
    except (UnidentifiedImageError, OSError) as exc:
        raise ValueError("Invalid image file") from exc


@contextmanager
def temporary_image_path(*, suffix: str) -> Iterator[Path]:
    """Context manager that creates a temporary file and removes it on exit."""
    with NamedTemporaryFile(delete=False, suffix=suffix) as handle:
        temp_path = Path(handle.name)

    try:
        yield temp_path
    finally:
        temp_path.unlink(missing_ok=True)


@contextmanager
def downloaded_image(image_id: str) -> Iterator[Path]:
    """Context manager that downloads a HuggingFace image into a temporary file."""
    with temporary_image_path(suffix=".png") as temp_path:
        try:
            with urlopen(
                hf_image_url(image_id),
                timeout=REMOTE_IMAGE_TIMEOUT_SECONDS,
            ) as response, temp_path.open("wb") as handle:
                copyfileobj(response, handle)
        except (OSError, URLError) as exc:
            raise RuntimeError(f"Unable to download image '{image_id}'.") from exc

        verify_image(temp_path)
        yield temp_path


def encode_remote_image(image_id: str, embedder) -> object:
    """Download a remote image and compute its embedding with the provided encoder."""
    with downloaded_image(image_id) as temp_path:
        with Image.open(temp_path) as pil_image:
            return embedder.encode_pil(pil_image)


def build_centroid_embedding(
    *,
    image_ids: list[str],
    embedder,
    max_download_workers: int = MAX_DOWNLOAD_WORKERS,
) -> np.ndarray:
    """Compute a centroid embedding from a selected image set using mean pooling."""
    worker_count = max(1, min(len(image_ids), max_download_workers))
    with ThreadPoolExecutor(max_workers=worker_count) as executor:
        embeddings = list(executor.map(partial(encode_remote_image, embedder=embedder), image_ids))

    return np.mean(np.stack(embeddings, axis=0), axis=0).reshape(1, -1).astype(np.float32)
