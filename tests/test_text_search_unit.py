"""
Tests unitaires pour la recherche texte-image — aucun client HTTP requis.

Tests : contrat encode_text(), pipeline query_text(), validation de SearchService.search_text().
Les tests des endpoints de l’API (nécessitant httpx) se trouvent dans test_text_search.py.
"""

from __future__ import annotations

from unittest.mock import patch

import numpy as np
import pytest

from backend.app.services.search_service import SearchService, SearchUnavailableError
from mediscan.search import SearchResources, query_text


# ---------------------------------------------------------------------------
# Fake objects
# ---------------------------------------------------------------------------

class FakeTextEmbedder:
    """ 
    - Simule un modèle CLIP capable d'encoder du texte.
    """
    name = "biomedclip"
    dim = 512

    def encode_pil(self, image):
        return np.ones((512,), dtype=np.float32)

    def encode_text(self, text: str) -> np.ndarray:
        vec = np.ones((512,), dtype=np.float32)
        vec /= np.linalg.norm(vec)
        return vec


class FakeNoTextEmbedder:
    """
    - Simule un embedder qui ne supporte pas l'encodage de texte pour tester les erreurs.
    """
    name = "dinov2_base"
    dim = 768

    def encode_pil(self, image):
        return np.ones((768,), dtype=np.float32)


class FakeSemanticIndex:
    """
    - Simule un index Faiss pour BioMedCLIP (512 dimensions).
    """
    ntotal = 3
    d = 512

    def search(self, query_vector, search_k):
        scores = np.array([[0.95, 0.80, 0.60]], dtype=np.float32)
        indices = np.array([[0, 1, 2]], dtype=np.int64)
        return scores, indices


FAKE_ROWS = [
    {"image_id": "img001", "path": "images/img001.jpg", "caption": "chest X-ray", "cui": "C0024117"},
    {"image_id": "img002", "path": "images/img002.jpg", "caption": "brain MRI",   "cui": "C0006104"},
    {"image_id": "img003", "path": "images/img003.jpg", "caption": "knee X-ray",  "cui": "C0022742"},
]


def _make_resources() -> SearchResources:
    """
    - Crée des ressources de recherche factices pour les tests de query_text() et SearchService.
    """ 
    return SearchResources(
        embedder=FakeTextEmbedder(),
        index=FakeSemanticIndex(),
        rows=FAKE_ROWS,
    )


def _make_service() -> SearchService:
    """
    - Crée une instance de SearchService avec des ressources factices 
      pour les tests de search_text().
    """
    return SearchService(resources={"semantic": _make_resources()})


# ---------------------------------------------------------------------------
# encode_text() contract
# ---------------------------------------------------------------------------

def test_encode_text_shape_and_dtype():
    """
    - Vérifie que encode_text() retourne un vecteur de la bonne forme et type.
    """
    vec = FakeTextEmbedder().encode_text("pneumonia chest radiograph")
    assert vec.shape == (512,)
    assert vec.dtype == np.float32


def test_encode_text_l2_norm():
    """
    - Vérifie que le vecteur de texte est normalisé (norme L2 = 1).
    """
    vec = FakeTextEmbedder().encode_text("brain MRI tumour")
    assert abs(float(np.linalg.norm(vec)) - 1.0) < 1e-5


# ---------------------------------------------------------------------------
# query_text()
# ---------------------------------------------------------------------------

def test_query_text_returns_k_results():
    """
    - Vérifie que query_text() retourne exactement k résultats.
    """
    results = query_text(resources=_make_resources(), text="chest X-ray", k=2)
    assert len(results) == 2


def test_query_text_results_ordered_by_rank():
    """
    - Vérifie que les résultats de query_text() sont triés par rang.
    """
    results = query_text(resources=_make_resources(), text="chest X-ray", k=3)
    assert [r["rank"] for r in results] == [1, 2, 3]


def test_query_text_scores_descending():
    """
    - Vérifie que les scores de similarité dans les résultats de query_text() sont en ordre décroissant.
    """
    results = query_text(resources=_make_resources(), text="chest X-ray", k=3)
    scores = [r["score"] for r in results]
    assert scores == sorted(scores, reverse=True)


def test_query_text_result_keys():
    """
    - Vérifie que chaque résultat de query_text() contient les clés attendues.
    """
    results = query_text(resources=_make_resources(), text="chest X-ray", k=1)
    assert set(results[0].keys()) == {"rank", "score", "image_id", "path", "caption", "cui"}


def test_query_text_raises_if_no_encode_text():
    """
    - Vérifie que query_text() lève une erreur si l'embedder ne supporte pas encode_text().
    """
    resources = SearchResources(
        embedder=FakeNoTextEmbedder(),
        index=FakeSemanticIndex(),
        rows=FAKE_ROWS,
    )
    with pytest.raises(ValueError, match="encode_text"):
        query_text(resources=resources, text="test", k=3)


def test_query_text_raises_on_empty_text():
    """
    - Vérifie que query_text() lève une erreur si le texte de requête est vide ou ne contient que des espaces.
    """
    with pytest.raises(ValueError, match="empty"):
        query_text(resources=_make_resources(), text="   ", k=3)


def test_query_text_raises_on_invalid_k():
    """
    - Vérifie que query_text() lève une erreur si k est inférieur à 1.
    """
    with pytest.raises(ValueError):
        query_text(resources=_make_resources(), text="pneumonia", k=0)


# ---------------------------------------------------------------------------
# SearchService.search_text()
# ---------------------------------------------------------------------------

def test_search_service_returns_correct_structure():
    """
    - Vérifie que SearchService.search_text() retourne une structure de résultat correcte 
      avec les champs attendus.
    """
    result = _make_service().search_text(text="chest X-ray pneumonia", k=2)
    assert result["mode"] == "semantic"
    assert result["embedder"] == "biomedclip"
    assert result["query_text"] == "chest X-ray pneumonia"
    assert len(result["results"]) == 2


def test_search_service_strips_whitespace():
    """
    - Vérifie que SearchService.search_text() supprime les espaces autour du texte de requête.
    """
    result = _make_service().search_text(text="  pneumonia  ", k=1)
    assert result["query_text"] == "pneumonia"


def test_search_service_raises_on_empty():
    """
    - Vérifie que SearchService.search_text() lève une erreur 
      si le texte de requête est vide ou ne contient que des espaces.
    """
    with pytest.raises(ValueError, match="empty"):
        _make_service().search_text(text="   ", k=5)


def test_search_service_raises_on_long_text():
    """
    - Vérifie que SearchService.search_text() lève une erreur
        si le texte de requête dépasse une certaine longueur (par exemple, 500 caractères).
    """
    with pytest.raises(ValueError, match="too long"):
        _make_service().search_text(text="x" * 501, k=5)


def test_search_service_raises_on_invalid_k():
    """
    - Vérifie que SearchService.search_text() lève une erreur si k est inférieur à 1.
    """
    with pytest.raises(ValueError):
        _make_service().search_text(text="pneumonia", k=0)


def test_search_service_propagates_unavailable():
    """
    - Vérifie que SearchService.search_text() propage une SearchUnavailableError 
      si les ressources de recherche ne sont pas disponibles.
    """
    service = SearchService(resources={})
    with patch.object(service, "_get_resources", side_effect=SearchUnavailableError("no index")):
        with pytest.raises(SearchUnavailableError):
            service.search_text(text="pneumonia", k=3)
