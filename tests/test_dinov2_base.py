"""
Tests unitaires pour l'embedder DINOv2 Base.

Vérifie l'intégration avec la bibliothèque 'transformers' de HuggingFace, 
le traitement des images (FakeProcessor) et la normalisation des vecteurs 
de sortie pour le modèle DINOv2.
"""

from types import SimpleNamespace
from unittest.mock import patch

import numpy as np
import torch
from PIL import Image

from mediscan.embedders.dinov2_base import DINOv2BaseEmbedder


class FakeProcessor:
    """ 
    - Simule l'AutoImageProcessor (redimensionnement, normalisation pixel). 
    - Renvoie un tenseur fixe pour les tests d'encodage.
    """
    def __call__(self, *, images, return_tensors):
        return {"pixel_values": torch.ones((1, 3, 2, 2), dtype=torch.float32)}


class FakeDINOModel:
    """ 
    - Simule le modèle DINOv2 (AutoModel).
    Renvoie un pooler_output (vecteur global de l'image) de dimension 4.
    """
    def __init__(self) -> None:
        self.config = SimpleNamespace(hidden_size=4)

    def to(self, device):
        return self

    def eval(self):
        return self

    def __call__(self, *, pixel_values):
        return SimpleNamespace(
            pooler_output=torch.tensor([[1.0, 2.0, 3.0, 4.0]], dtype=torch.float32)
        )


def test_dinov2_embedding_shape():
    """
    - Vérifie que l'embedding DINOv2 a la bonne forme, que les valeurs sont finies et que le vecteur est normalisé (norme L2 = 1).
    """
    with patch(
        "mediscan.embedders.dinov2_base.AutoImageProcessor.from_pretrained",
        return_value=FakeProcessor(),
    ), patch(
        "mediscan.embedders.dinov2_base.AutoModel.from_pretrained",
        return_value=FakeDINOModel(),
    ):
        embedder = DINOv2BaseEmbedder(model_name="facebook/dinov2-base")

    vector = embedder.encode_pil(Image.new("RGB", (224, 224), color=(0, 255, 0)))
    assert vector.shape == (embedder.dim,)
    assert np.isfinite(vector).all()
    np.testing.assert_almost_equal(np.linalg.norm(vector), 1.0, decimal=5)
