"""
Implémentation de l'encodeur BioMedCLIP pour MediScan AI (CPU uniquement).

BioMedCLIP est un modèle multimodal (image + texte) entraîné sur des données
biomédicales. Il encode images et textes dans un espace vectoriel commun de
512 dimensions, permettant la recherche text-to-image et image-to-image
par similarité sémantique médicale.

La version utilisée par défaut est fine-tunée sur le dataset ROCOv2 et hébergée
sur HuggingFace (hf-hub:Ozantsk/biomedclip-rocov2-finetuned), afin d'aligner
la recherche avec les artefacts sémantiques du projet.
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
    Encodeur d'images et de texte BioMedCLIP pour la recherche sémantique.

    Utilise le modèle BioMedCLIP via la librairie open_clip pour encoder
    des images médicales et des requêtes textuelles dans un espace vectoriel
    commun de 512 dimensions. Les vecteurs produits sont normalisés L2,
    permettant d'utiliser le produit scalaire FAISS comme mesure de similarité.

    Attributes:
        name (str): Identifiant de l'embedder ('biomedclip').
        dim (int): Dimension des embeddings (512 par défaut, ajustée dynamiquement
            depuis la configuration du modèle chargé).
    """
    name = "biomedclip"
    dim = 512

    def __init__(
        self,
        model_name: str = "hf-hub:Ozantsk/biomedclip-rocov2-finetuned",
    ) -> None:
        """
        Initialise l'encodeur BioMedCLIP et charge le modèle en mémoire.

        Args:
            model_name (str): Identifiant HuggingFace du modèle à charger.
                Défaut : 'hf-hub:Ozantsk/biomedclip-rocov2-finetuned'
                (version fine-tunée sur ROCOv2).

        Notes:
            La dimension de sortie est récupérée dynamiquement depuis la
            configuration du modèle chargé et peut différer de 512 selon
            la variante utilisée.
        """
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
        """
        Encode une image PIL en vecteur d'embedding sémantique.

        Convertit l'image en RGB, applique le prétraitement du modèle
        et encode via l'encodeur visuel de BioMedCLIP.

        Args:
            image (PILImage.Image): Image d'entrée à encoder.
                Doit être une instance de PIL.Image.Image.

        Returns:
            np.ndarray: Vecteur d'embedding 1D normalisé L2 de forme (dim,),
                type float32. Représente le contenu médical sémantique de l'image.

        Raises:
            TypeError: Si l'argument n'est pas une instance de PIL.Image.Image.
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
        Encode une requête textuelle en vecteur d'embedding sémantique.

        Utilise l'encodeur de texte de BioMedCLIP (PubMedBERT), aligné avec
        l'encodeur visuel dans le même espace latent de 512 dimensions.
        Permet la recherche text-to-image par comparaison directe des vecteurs.

        Args:
            text (str): Requête textuelle médicale en anglais à encoder.
                Automatiquement tronquée à 77 tokens si nécessaire.

        Returns:
            np.ndarray: Vecteur d'embedding 1D normalisé L2 de forme (dim,),
                type float32. Comparable directement aux embeddings d'images
                via produit scalaire (similarité cosinus).

        Notes:
            Seul le texte médical en anglais est supporté — BioMedCLIP a été
            entraîné exclusivement sur des données biomédicales anglophones.
        """
        tokens = self._tokenizer([text]).to(self._device)
        with torch.no_grad():
            features = self._model.encode_text(tokens)
        return normalize_embedding(features.squeeze(0).float().cpu().numpy(), self.dim)


__all__ = ["BioMedCLIPEmbedder"]