"""Base interface for image embedders."""

from __future__ import annotations

from abc import ABC, abstractmethod

import numpy as np
from PIL import Image as PILImage


def safe_int(value: str | None, default: int) -> int:
    """Parse an integer from an environment value, or return the fallback."""
    if value is None:
        return default
    try:
        return int(value)
    except ValueError:
        return default


class Embedder(ABC):
    """Abstract base class for all embedders."""

    name: str
    dim: int

    @abstractmethod
    def encode_pil(self, image: PILImage.Image) -> np.ndarray:
        """Encode a PIL image into an embedding vector."""
        raise NotImplementedError


__all__ = ["Embedder", "safe_int"]
