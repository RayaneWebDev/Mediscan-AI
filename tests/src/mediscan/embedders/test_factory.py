"""Tests for embedder factory selection."""

from __future__ import annotations

import numpy as np
import pytest
from PIL import Image as PILImage

from mediscan.embedders.base import Embedder
from mediscan.embedders import factory


class DummyEmbedder(Embedder):
    """Small test double used to avoid loading model weights."""

    name = "dummy"
    dim = 2

    def __init__(self, marker: str = "ok") -> None:
        """Store a marker proving keyword arguments were forwarded."""
        self.marker = marker

    def encode_pil(self, image: PILImage.Image) -> np.ndarray:
        """Return a deterministic embedding for factory tests."""
        return np.array([1.0, 0.0], dtype=np.float32)


def test_get_embedder_instantiates_registered_embedder(monkeypatch) -> None:
    """The factory normalizes names and forwards keyword arguments."""
    monkeypatch.setitem(factory.EMBEDDER_REGISTRY, "dummy", DummyEmbedder)

    embedder = factory.get_embedder(" Dummy ", marker="custom")

    assert isinstance(embedder, DummyEmbedder)
    assert embedder.marker == "custom"


def test_get_embedder_rejects_unknown_name() -> None:
    """Unknown embedder names fail with supported choices."""
    with pytest.raises(ValueError, match="Unknown embedder"):
        factory.get_embedder("missing")
