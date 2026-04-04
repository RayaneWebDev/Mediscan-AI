"""
Implémentation de l'encodeur d'images BioMedCLIP (version CPU uniquement).

BioMedCLIP est utilisé pour la branche sémantique. Contrairement aux modèles CLIP 
génériques, il est aligné sur des paires image-texte biomédicales et est donc 
mieux adapté à la recherche de contenu médical sur les données de radiologie ROCOv2.
"""

from __future__ import annotations

import open_clip
import torch
import numpy as np
from PIL import Image as PILImage

from .base import Embedder
from .utils import configure_torch_cpu_threads, normalize_embedding


class BioMedCLIPEmbedder(Embedder):
    """
    - Encodeur d'images BioMedCLIP pour la recherche sémantique.
    """
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

        # Récupération dynamique de la dimension de sortie du modèle
        output_dim = getattr(getattr(self._model, "visual", None), "output_dim", None)
        if output_dim is None:
            output_dim = getattr(self._model, "embed_dim", None)
        if output_dim is not None:
            self.dim = int(output_dim)

    def encode_pil(self, image: PILImage.Image) -> np.ndarray:
        """
        - Encode une image PIL en un vecteur d'embedding.
        
        Paramètres
        ----------
        image : PIL.Image.Image
            L'image d'entrée à encoder.
            
        Retours
        -------
        np.ndarray
            Vecteur d'embedding normalisé L2.
        """
        if not isinstance(image, PILImage.Image):
            raise TypeError("encode_pil attend une instance de PIL.Image.Image")

        rgb_image = image.convert("RGB")
        input_tensor = self._preprocess(rgb_image).unsqueeze(0).to(self._device)

        with torch.no_grad():
            features = self._model.encode_image(input_tensor)

        return normalize_embedding(features.squeeze(0).cpu().numpy(), self.dim)

    def encode_text(self, text: str) -> np.ndarray:
        """
        - Encode une requête textuelle en un vecteur float32 de 512-dim normalisé L2.

        - Utilise l'encodeur de texte de BioMedCLIP (PubMedBERT), aligné avec 
          l'encodeur d'images dans le même espace latent. Tronque automatiquement 
          à 77 jetons (tokens). Seul le texte médical en anglais est supporté.
        """
        tokens = self._tokenizer([text]).to(self._device)
        with torch.no_grad():
            features = self._model.encode_text(tokens)
        return normalize_embedding(features.squeeze(0).float().cpu().numpy(), self.dim)


__all__ = ["BioMedCLIPEmbedder"]