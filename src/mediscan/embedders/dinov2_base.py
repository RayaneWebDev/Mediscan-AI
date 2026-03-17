"""
DINOv2 base embedder implementation (CPU-only).

This embedder uses the public `facebook/dinov2-base` vision transformer as a
strong image-only feature extractor. It is a good fit for the visual branch:
the model is optimized for general-purpose image representations rather than
image-text alignment.
"""

from __future__ import annotations

import os

import numpy as np
import torch
from PIL import Image as PILImage
from transformers import AutoImageProcessor, AutoModel

from .base import Embedder


class DINOv2BaseEmbedder(Embedder):
    """DINOv2 base image embedder for the visual branch."""

    name = "dinov2_base"
    dim = 768

    def __init__(self, model_name: str = "facebook/dinov2-base") -> None:
        thread_count = self._safe_int(os.getenv("MEDISCAN_TORCH_THREADS"), default=1)
        torch.set_num_threads(max(1, thread_count))
        try:
            torch.set_num_interop_threads(1)
        except RuntimeError:
            pass

        self._device = torch.device("cpu")
        self._model_name = model_name

        self._processor = AutoImageProcessor.from_pretrained(self._model_name, use_fast=True)
        self._model = AutoModel.from_pretrained(self._model_name)
        self._model.to(self._device)
        self._model.eval()

        hidden_size = getattr(self._model.config, "hidden_size", None)
        if hidden_size is not None:
            self.dim = int(hidden_size)

    @staticmethod
    def _safe_int(value: str | None, default: int) -> int:
        if value is None:
            return default
        try:
            return int(value)
        except ValueError:
            return default

    def encode_pil(self, image: PILImage.Image) -> np.ndarray:
        if not isinstance(image, PILImage.Image):
            raise TypeError("encode_pil expects a PIL.Image.Image instance")

        rgb_image = image.convert("RGB")
        inputs = self._processor(images=rgb_image, return_tensors="pt")
        pixel_values = inputs["pixel_values"].to(self._device)

        with torch.no_grad():
            outputs = self._model(pixel_values=pixel_values)

        if getattr(outputs, "pooler_output", None) is not None:
            features = outputs.pooler_output
        else:
            features = outputs.last_hidden_state[:, 0]

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


__all__ = ["DINOv2BaseEmbedder"]
