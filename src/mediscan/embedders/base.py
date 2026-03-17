"""Base interface for image embedders."""

from __future__ import annotations

from abc import ABC, abstractmethod

import numpy as np
from PIL import Image as PILImage


class Embedder(ABC):
    """Abstract base class implemented by all image embedders."""

    name: str
    dim: int

    @abstractmethod
    def encode_pil(self, image: PILImage.Image) -> np.ndarray:
        """
        Encode a PIL image into an embedding vector.

        Parameters
        ----------
        image : PIL.Image.Image
            Input image (already loaded). Implementations may convert to RGB,
            resize, normalize, etc. depending on model requirements.

        Returns
        -------
        np.ndarray
            A 1D L2-normalized embedding vector of shape (dim,), dtype float32.

        Raises
        ------
        ValueError
            If the image is invalid or cannot be processed.
        """
        raise NotImplementedError


__all__ = ["Embedder"]
