"""
BioMedCLIP image embedder implementation (CPU-only).

BioMedCLIP is used for the semantic branch. Unlike general CLIP checkpoints, it
is aligned on biomedical image-text pairs and therefore better suited to
medical content retrieval on mixed ROCOv2 radiology data.
"""

from __future__ import annotations

import os

import numpy as np
import open_clip
import torch
from PIL import Image as PILImage

from .base import Embedder


class BioMedCLIPEmbedder(Embedder):
    """BioMedCLIP image encoder for semantic retrieval."""

    name = "biomedclip"
    dim = 512

    def __init__(
        self,
        model_name: str = "hf-hub:microsoft/BiomedCLIP-PubMedBERT_256-vit_base_patch16_224",
    ) -> None:
        thread_count = self._safe_int(os.getenv("MEDISCAN_TORCH_THREADS"), default=1)
        torch.set_num_threads(max(1, thread_count))
        try:
            torch.set_num_interop_threads(1)
        except RuntimeError:
            pass

        self._device = torch.device("cpu")
        self._model_name = model_name

        self._model, _, self._preprocess = open_clip.create_model_and_transforms(
            self._model_name
        )
        self._model.to(self._device)
        self._model.eval()

        output_dim = getattr(getattr(self._model, "visual", None), "output_dim", None)
        if output_dim is None:
            output_dim = getattr(self._model, "embed_dim", None)
        if output_dim is not None:
            self.dim = int(output_dim)

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
        input_tensor = self._preprocess(rgb_image).unsqueeze(0).to(self._device)

        with torch.no_grad():
            features = self._model.encode_image(input_tensor)

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


__all__ = ["BioMedCLIPEmbedder"]
