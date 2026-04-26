"""
Implémentation de l'encodeur DINOv2 base pour MediScan AI (CPU uniquement).

DINOv2 est un Vision Transformer (ViT) développé par Meta AI, entraîné par
apprentissage auto-supervisé sur 142 millions d'images naturelles (LVD-142M)
sans annotation. Il produit des embeddings visuels de 768 dimensions capturant
la texture, la forme et la structure spatiale des images.

Dans MediScan AI, DINOv2 est utilisé pour la branche visuelle — il retrouve
des images médicalement similaires sur la base de leur apparence visuelle,
indépendamment de leur signification médicale.
"""

from __future__ import annotations

import torch
from PIL import Image as PILImage
from transformers import AutoImageProcessor, AutoModel

from .base import Embedder
from .utils import configure_torch_cpu_threads, normalize_embedding


class DINOv2BaseEmbedder(Embedder):
    """
    Encodeur d'images DINOv2 base pour la recherche visuelle.

    Utilise le modèle 'facebook/dinov2-base' via HuggingFace Transformers
    pour extraire des représentations visuelles de 768 dimensions. Le vecteur
    d'embedding correspond au token [CLS] du Vision Transformer, qui capture
    une représentation globale de l'image.

    Attributes:
        name (str): Identifiant de l'embedder ('dinov2_base').
        dim (int): Dimension des embeddings (768 par défaut, ajustée depuis
            la configuration du modèle chargé).
    """
    name = "dinov2_base"
    dim = 768

    def __init__(self, model_name: str = "facebook/dinov2-base") -> None:
        """
        Initialise l'encodeur DINOv2 et charge le modèle en mémoire.

        Args:
            model_name (str): Identifiant HuggingFace du modèle à charger.
                Défaut : 'facebook/dinov2-base'.

        Notes:
            La dimension de sortie est récupérée dynamiquement depuis
            `model.config.hidden_size` et peut différer de 768 selon
            la variante chargée (ex: dinov2-large = 1024).
        """
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
        Encode une image PIL en vecteur d'embedding visuel.

        Convertit l'image en RGB, applique le prétraitement du processeur
        DINOv2 et encode via le Vision Transformer. Utilise le token [CLS]
        comme représentation globale de l'image.

        Args:
            image (PILImage.Image): Image d'entrée à encoder.
                Doit être une instance de PIL.Image.Image.

        Returns:
            np.ndarray: Vecteur d'embedding 1D normalisé L2 de forme (768,),
                type float32. Représente les caractéristiques visuelles
                (texture, forme, structure spatiale) de l'image.

        Raises:
            TypeError: Si l'argument n'est pas une instance de PIL.Image.Image.
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