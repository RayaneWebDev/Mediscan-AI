"""
BioMedCLIP image embedder implementation (CPU-only).

BioMedCLIP is used for the semantic branch. Unlike general CLIP checkpoints, it
is aligned on biomedical image-text pairs and therefore better suited to
medical content retrieval on mixed ROCOv2 radiology data.
"""

from __future__ import annotations

import open_clip
import torch
from PIL import Image as PILImage

from .base import Embedder
from .utils import configure_torch_cpu_threads, normalize_embedding


class BioMedCLIPEmbedder(Embedder):
    """BioMedCLIP image encoder for semantic retrieval."""

    name = "biomedclip"
    dim = 512

    def __init__(
        self,
        model_name: str = "hf-hub:microsoft/BiomedCLIP-PubMedBERT_256-vit_base_patch16_224",
    ) -> None:
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
        if not isinstance(image, PILImage.Image):
            raise TypeError("encode_pil expects a PIL.Image.Image instance")

        rgb_image = image.convert("RGB")
        input_tensor = self._preprocess(rgb_image).unsqueeze(0).to(self._device)

        with torch.no_grad():
            features = self._model.encode_image(input_tensor)

        return normalize_embedding(features.squeeze(0).cpu().numpy(), self.dim)

    def encode_text(self, text: str) -> np.ndarray:
        """Encode a text query into a 512-dim L2-normalised float32 vector.

        Uses BioMedCLIP's text encoder (PubMedBERT), aligned with the image
        encoder in the same embedding space. Truncates to 77 tokens automatically.
        Only English medical text is supported.
        """
        tokens = self._tokenizer([text]).to(self._device)
        with torch.no_grad():
            features = self._model.encode_text(tokens)
        return normalize_embedding(features.squeeze(0).float().cpu().numpy(), self.dim)


__all__ = ["BioMedCLIPEmbedder"]
