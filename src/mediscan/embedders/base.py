"""Base interface for image embedders."""

from __future__ import annotations

from abc import ABC, abstractmethod

import numpy as np
from PIL import Image as PILImage


class Embedder(ABC):
    """Common contract for all embedders used in indexing/query."""

    name: str
    dim: int

    @abstractmethod
    def encode_pil(self, image: PILImage.Image) -> np.ndarray:
        """Encode a PIL image into a 1D L2-normalized float32 vector."""


__all__ = ["Embedder"]
