"""
CLIP ViT-B/32 embedder implementation (CPU-only).

This embedder uses a pretrained CLIP model to encode images into a semantic
embedding space. Unlike classical CNN features focused on appearance, CLIP
features are trained to align with language and therefore capture higher-level
concepts better.
"""

from __future__ import annotations

import os
from pathlib import Path

import numpy as np
import torch
from PIL import Image as PILImage
from transformers import CLIPImageProcessor, CLIPModel

from .base import Embedder


class CLIPViTB32Embedder(Embedder):
    """
    CLIP ViT-B/32 image embedder (semantic).

    Default model:
    - openai/clip-vit-base-patch32
    """

    name = "clip_vit_b32"
    dim = 512

    def __init__(
        self,
        model_name: str = "openai/clip-vit-base-patch32",
        weights_path: str | Path | None = None,
    ) -> None:
        # Keep CPU execution deterministic and lightweight.
        thread_count = self._safe_int(os.getenv("MEDISCAN_TORCH_THREADS"), default=1)
        torch.set_num_threads(max(1, thread_count))
        try:
            torch.set_num_interop_threads(1)
        except RuntimeError:
            # Can only be set once per process.
            pass

        self._device = torch.device("cpu")
        self._model_name = model_name
        # `weights_path` is intentionally unused for this embedder; it is kept
        # for compatibility with scripts that always pass this argument.
        self._weights_path = weights_path

        # CLIPImageProcessor handles CLIP-specific resizing/cropping/normalization.
        self._processor = CLIPImageProcessor.from_pretrained(self._model_name)
        self._model = CLIPModel.from_pretrained(self._model_name)
        self._model.to(self._device)
        self._model.eval()

        projection_dim = getattr(self._model.config, "projection_dim", None)
        if projection_dim is not None:
            self.dim = int(projection_dim)

    @staticmethod
    def _safe_int(value: str | None, default: int) -> int:
        if value is None:
            return default
        try:
            return int(value)
        except ValueError:
            return default

    def encode_pil(self, image: PILImage.Image) -> np.ndarray:
        """
        Encode one PIL image into the CLIP semantic embedding space.

        Steps:
        1) RGB conversion
        2) CLIP preprocessing
        3) CPU forward pass (`get_image_features`)
        4) float32 conversion
        5) L2 normalization
        """
        if not isinstance(image, PILImage.Image):
            raise TypeError("encode_pil expects a PIL.Image.Image instance")

        rgb_image = image.convert("RGB")
        inputs = self._processor(images=rgb_image, return_tensors="pt")
        pixel_values = inputs["pixel_values"].to(self._device)

        with torch.no_grad():
            features = self._model.get_image_features(pixel_values=pixel_values)

        vector = features.squeeze(0).cpu().numpy().astype(np.float32, copy=False)
        if vector.shape != (self.dim,):
            raise RuntimeError(
                f"Unexpected embedding shape: got {vector.shape}, expected ({self.dim},)"
            )

        norm = float(np.linalg.norm(vector))
        if not np.isfinite(norm) or norm <= 0.0:
            raise RuntimeError("Embedding norm is invalid; cannot apply L2 normalization")

        vector /= norm
        return vector


__all__ = ["CLIPViTB32Embedder"]
