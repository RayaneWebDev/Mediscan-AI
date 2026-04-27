"""Tests for temporary image storage and remote image helpers."""

from __future__ import annotations

from io import BytesIO
from pathlib import Path
from unittest.mock import MagicMock

import numpy as np
import pytest
from PIL import Image

from backend.app.services import image_store


def make_png_bytes() -> bytes:
    """Create a tiny valid PNG payload."""
    buffer = BytesIO()
    Image.new("RGB", (8, 8), color=(255, 0, 0)).save(buffer, format="PNG")
    return buffer.getvalue()


def test_verify_image_accepts_valid_image(tmp_path: Path) -> None:
    """Valid images pass verification."""
    path = tmp_path / "image.png"
    path.write_bytes(make_png_bytes())

    image_store.verify_image(path)


def test_verify_image_rejects_corrupted_image(tmp_path: Path) -> None:
    """Corrupted images are converted to ValueError."""
    path = tmp_path / "image.png"
    path.write_bytes(b"not an image")

    with pytest.raises(ValueError, match="Invalid image file"):
        image_store.verify_image(path)


def test_temporary_image_path_removes_file_after_context() -> None:
    """Temporary upload files are cleaned up after use."""
    with image_store.temporary_image_path(suffix=".png") as path:
        assert path.exists()
        path.write_bytes(b"data")

    assert not path.exists()


def test_downloaded_image_writes_and_verifies_remote_bytes(monkeypatch: pytest.MonkeyPatch) -> None:
    """Remote image downloads are written to a temporary path."""
    response = MagicMock()
    response.__enter__.return_value = BytesIO(make_png_bytes())
    response.__exit__.return_value = None
    urlopen = MagicMock(return_value=response)
    monkeypatch.setattr(image_store, "urlopen", urlopen)

    with image_store.downloaded_image("ROCOv2_2023_train_000001") as path:
        assert path.exists()
        assert path.suffix == ".png"

    assert not path.exists()
    urlopen.assert_called_once()


def test_downloaded_image_wraps_download_errors(monkeypatch: pytest.MonkeyPatch) -> None:
    """Network and OS errors become RuntimeError with image context."""
    monkeypatch.setattr(image_store, "urlopen", MagicMock(side_effect=OSError("offline")))

    with pytest.raises(RuntimeError, match="Unable to download image"):
        with image_store.downloaded_image("ROCOv2_2023_train_000001"):
            pass


def test_encode_remote_image_opens_downloaded_image(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    """Downloaded images are opened and passed to the embedder."""
    path = tmp_path / "image.png"
    path.write_bytes(make_png_bytes())

    class DownloadContext:
        """Context manager double returning a prepared image path."""

        def __enter__(self) -> Path:
            """Yield the prepared image path."""
            return path

        def __exit__(self, *args: object) -> None:
            """Leave cleanup to the test fixture."""
            return None

    embedder = MagicMock()
    embedder.encode_pil.return_value = np.array([1.0, 2.0], dtype=np.float32)
    monkeypatch.setattr(image_store, "downloaded_image", MagicMock(return_value=DownloadContext()))

    embedding = image_store.encode_remote_image("img1", embedder=embedder)

    np.testing.assert_allclose(embedding, np.array([1.0, 2.0], dtype=np.float32))
    embedder.encode_pil.assert_called_once()


def test_build_centroid_embedding_uses_mean_pooling(monkeypatch: pytest.MonkeyPatch) -> None:
    """Centroid embeddings are mean pooled over encoded remote images."""
    embeddings = {
        "img1": np.array([1.0, 3.0], dtype=np.float32),
        "img2": np.array([5.0, 7.0], dtype=np.float32),
    }

    def fake_encode_remote_image(image_id: str, *, embedder: object) -> np.ndarray:
        """Return a deterministic embedding for each requested image id."""
        return embeddings[image_id]

    monkeypatch.setattr(image_store, "encode_remote_image", fake_encode_remote_image)

    centroid = image_store.build_centroid_embedding(
        image_ids=["img1", "img2"],
        embedder=object(),
        max_download_workers=1,
    )

    np.testing.assert_allclose(centroid, np.array([[3.0, 5.0]], dtype=np.float32))
    assert centroid.dtype == np.float32
