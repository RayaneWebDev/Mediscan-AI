"""DINOv2 base embedder implementation for MediScan AI (CPU only)."""

from __future__ import annotations

import torch
from PIL import Image as PILImage
from transformers import AutoImageProcessor, AutoModel

from .base import Embedder
from .utils import configure_torch_cpu_threads, normalize_embedding


class DINOv2BaseEmbedder(Embedder):
    """
    DINOv2 base image embedder for visual similarity search.

    This model is used for appearance-driven retrieval. It compares image content
    directly and does not require text supervision at query time.
    """
    name = "dinov2_base"
    dim = 768

    def __init__(self, model_name: str = "facebook/dinov2-base") -> None:
        """Load the processor/model pair on CPU and infer the runtime vector size."""
        configure_torch_cpu_threads()
        self._device = torch.device("cpu")
        self._model_name = model_name

        self._processor = AutoImageProcessor.from_pretrained(self._model_name, use_fast=True)
        self._model = AutoModel.from_pretrained(self._model_name)
        self._model.to(self._device)
        self._model.eval()

        hidden_size = getattr(self._model.config, "hidden_size", None)
        if hidden_size is not None:
            self.dim = int(hidden_size)

    def encode_pil(self, image: PILImage.Image) -> np.ndarray:
        """
        Encode a PIL image into a normalized visual embedding vector.

        Pooler output is preferred when available. Some DINOv2 checkpoints expose
        only hidden states, so the CLS token is used as a stable fallback.
        """
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

        return normalize_embedding(features.squeeze(0).cpu().numpy(), self.dim)


__all__ = ["DINOv2BaseEmbedder"]
