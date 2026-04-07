from __future__ import annotations

from collections.abc import Iterator
from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager
from functools import partial
from pathlib import Path
from tempfile import NamedTemporaryFile
import urllib.request

import numpy as np
from PIL import Image, UnidentifiedImageError

from backend.app.image_utils import hf_image_url

MAX_DOWNLOAD_WORKERS = 8


def verify_image(temp_path: Path) -> None:
    try:
        with Image.open(temp_path) as image:
            image.verify()
    except (UnidentifiedImageError, OSError) as exc:
        raise ValueError("Invalid image file") from exc


@contextmanager
def temporary_image_path(*, suffix: str) -> Iterator[Path]:
    with NamedTemporaryFile(delete=False, suffix=suffix) as handle:
        temp_path = Path(handle.name)

    try:
        yield temp_path
    finally:
        temp_path.unlink(missing_ok=True)


@contextmanager
def downloaded_image(image_id: str) -> Iterator[Path]:
    with temporary_image_path(suffix=".png") as temp_path:
        urllib.request.urlretrieve(hf_image_url(image_id), temp_path)
        verify_image(temp_path)
        yield temp_path


def encode_remote_image(image_id: str, embedder) -> object:
    with downloaded_image(image_id) as temp_path:
        with Image.open(temp_path) as pil_image:
            return embedder.encode_pil(pil_image)


def build_centroid_embedding(
    *,
    image_ids: list[str],
    embedder,
    max_download_workers: int = MAX_DOWNLOAD_WORKERS,
) -> np.ndarray:
    worker_count = min(len(image_ids), max_download_workers)
    with ThreadPoolExecutor(max_workers=worker_count) as executor:
        embeddings = list(executor.map(partial(encode_remote_image, embedder=embedder), image_ids))

    return np.mean(embeddings, axis=0).reshape(1, -1).astype(np.float32)
