"""
Tests unitaires pour l'embedder BioMedCLIP.

Vérifie que l'intégration avec PyTorch et le modèle multimodal 
(BioMedCLIP) fonctionne notamment la normalisation L2
des vecteurs générés.
"""

from types import SimpleNamespace
from unittest.mock import patch

import numpy as np
import torch
from PIL import Image

from mediscan.embedders.biomedclip import BioMedCLIPEmbedder


class FakeBioMedModel:
    """ 
    - Simule le comportement d'un modèle CLIP (Contrastive Language-Image Pretraining).
    Permet de tester la transformation d'image en vecteur sans charger de poids réels.
    """
    def __init__(self) -> None:
        self.visual = SimpleNamespace(output_dim=4)

    def to(self, device):
        """ 
        - Simule le transfert vers CPU/GPU. 
        """
        return self

    def eval(self):
        """ 
        - Simule le passage en mode évaluation (désactive le dropout). 
        """
        return self

    def encode_image(self, input_tensor):
        """ 
        Simule l'encodage : renvoie un tenseur PyTorch fixe. 
        """
        return torch.tensor([[1.0, 2.0, 3.0, 4.0]], dtype=torch.float32)


def test_biomedclip_embedding_shape():
    """
    - Vérifie que l'embedder BioMedCLIP génère un vecteur de la bonne dimension et normalisé.
    """
    fake_model = FakeBioMedModel()

    with patch(
        "mediscan.embedders.biomedclip.open_clip.create_model_and_transforms",
        return_value=(fake_model, None, lambda image: torch.ones((3, 2, 2), dtype=torch.float32)),
    ):
        embedder = BioMedCLIPEmbedder(model_name="hf-hub:test")

    vector = embedder.encode_pil(Image.new("RGB", (224, 224), color=(255, 0, 0)))
    assert vector.shape == (embedder.dim,)
    assert np.isfinite(vector).all()
    np.testing.assert_almost_equal(np.linalg.norm(vector), 1.0, decimal=5)
