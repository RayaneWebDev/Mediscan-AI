"""
Tests de base pour les Embedders de MEDISCAN.

Vérifie que la classe parente (Base) se comporte correctement et que 
l'implémentation minimale (Dummy) respecte le cahier des recettes.
"""

import numpy as np
import pytest
from PIL import Image

from mediscan.embedders.base import Embedder


class DummyEmbedder(Embedder):
    """ 
    - Implémentation minimale de Embedder pour les tests unitaires. 
    - Ne fait que retourner un vecteur de 1.0 de la dimension spécifiée
    """
    name = "dummy"
    dim = 4

    def encode_pil(self, image):
        return np.ones(self.dim, dtype=np.float32)


def test_embedder_is_abstract():
    """ 
    - Vérifie que la classe de base Embedder ne peut pas être instanciée directement
    """
    with pytest.raises(TypeError):
        Embedder()


def test_dummy_embedder_encode():
    """
    - Vérifie que DummyEmbedder encode une image PIL en un vecteur de la bonne forme et type.
    """
    vector = DummyEmbedder().encode_pil(Image.new("RGB", (32, 32)))
    assert vector.shape == (4,)
    assert vector.dtype == np.float32
