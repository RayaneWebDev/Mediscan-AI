"""
Tests unitaires pour le script de benchmark (performance) de MEDISCAN.

Vérifie que les calculs de temps (latence), les statistiques (moyenne, stabilité)
et la gestion des fichiers d'index fonctionnent comme prévu.
"""

from pathlib import Path

import pytest
from PIL import Image

from scripts.evaluation import benchmark as module


class FakeEmbedder:
    def encode_pil(self, image):
        """ 
        - Simule un modèle qui renvoie un vecteur constant instantanément. 
        """
        import numpy as np

        return np.ones((4,), dtype=np.float32)


class FakeIndex:
    """ 
    - Simule un index Faiss qui ne fait rien (juste pour tester le temps). 
    """
    def search(self, vector, k):
        return None


def test_measure_one_query_returns_timings(tmp_path):
    """
    - Vérifie que la fonction de mesure renvoie bien les différents 
      indicateurs de temps (tembed, tsearch, te2e) et qu'ils sont cohérents.
    """
    image_path = tmp_path / "query.png"
    Image.new("RGB", (8, 8)).save(image_path)

    result = module.measure_one_query(image_path, FakeEmbedder(), FakeIndex(), k=3)
    assert result["tembed"] >= 0.0
    assert result["tsearch"] >= 0.0
    assert result["te2e"] >= result["tembed"]


def test_compute_stats_and_load_index_missing():
    """
    - Teste la logique mathématique des statistiques et la sécurité 
      lors du chargement d'un index inexistant.
    """
    stats = module.compute_stats([1.0, 2.0, 3.0])
    assert stats["moyenne"] == 2.0
    assert stats["stabilite_ratio"] == 1.0

    with pytest.raises(FileNotFoundError):
        module.load_index(Path("missing.faiss"))
