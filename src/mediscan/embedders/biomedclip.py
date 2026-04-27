"""BioMedCLIP embedder implementation for MediScan AI (CPU only)."""

from __future__ import annotations

import open_clip
import torch
import numpy as np
from PIL import Image as PILImage

from .base import Embedder
from .utils import configure_torch_cpu_threads, normalize_embedding


class BioMedCLIPEmbedder(Embedder):
    """
    BioMedCLIP image and text embedder for semantic medical search.

    The image and text encoders share the same vector space, allowing text prompts
    and medical images to query the same semantic FAISS index.
    """
    name = "biomedclip"
    dim = 512

    def __init__(
        self,
        model_name: str = "hf-hub:Ozantsk/biomedclip-rocov2-finetuned",
    ) -> None:
        """Load the OpenCLIP model, preprocessing transform, and tokenizer on CPU."""
        configure_torch_cpu_threads()
        self._device = torch.device("cpu")
        self._model_name = model_name

        self._model, _, self._preprocess = open_clip.create_model_and_transforms(
            self._model_name
        )
        self._model.to(self._device)
        self._model.eval()
        self._tokenizer = open_clip.get_tokenizer(self._model_name)

        output_dim = getattr(getattr(self._model, "visual", None), "output_dim", None)
        if output_dim is None:
            output_dim = getattr(self._model, "embed_dim", None)
        if output_dim is not None:
            self.dim = int(output_dim)

    def encode_pil(self, image: PILImage.Image) -> np.ndarray:
        """Encode a PIL image into the normalized semantic vector space."""
        if not isinstance(image, PILImage.Image):
            raise TypeError("encode_pil expects a PIL.Image.Image instance")

        rgb_image = image.convert("RGB")
        input_tensor = self._preprocess(rgb_image).unsqueeze(0).to(self._device)

        with torch.no_grad():
            features = self._model.encode_image(input_tensor)

        return normalize_embedding(features.squeeze(0).cpu().numpy(), self.dim)

    def encode_text(self, text: str) -> np.ndarray:
        """Encode a text query into the same normalized space as image embeddings."""
        tokens = self._tokenizer([text]).to(self._device)
        with torch.no_grad():
            features = self._model.encode_text(tokens)
        return normalize_embedding(features.squeeze(0).float().cpu().numpy(), self.dim)


__all__ = ["BioMedCLIPEmbedder"]
