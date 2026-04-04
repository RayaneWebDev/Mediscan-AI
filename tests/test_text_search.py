"""
Tests du pipeline de recherche texte-image.

Ce module couvre:
- Le contrat BioMedCLIPEmbedder.encode_text() (forme, type de données, norme L2)
- Le pipeline query_text() avec ressources factices
- La validation et la délégation de SearchService.search_text()
- Le point de terminaison POST /api/search-text (200, 400, 503)
"""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import numpy as np
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.services.search_service import SearchService, SearchUnavailableError
from mediscan.search import SearchResources, query_text


# ---------------------------------------------------------------------------
# Helpers / fake objects
# ---------------------------------------------------------------------------

class FakeTextEmbedder:
    """
    - Intégrateur minimal de type BioMedCLIP avec prise en charge de encode_text.
    """
    name = "biomedclip"
    dim = 512

    def encode_pil(self, image):
        return np.ones((512,), dtype=np.float32)

    def encode_text(self, text: str) -> np.ndarray:
        # Returns a reproducible normalised vector
        vec = np.ones((512,), dtype=np.float32)
        vec /= np.linalg.norm(vec)
        return vec


class FakeNoTextEmbedder:
    """
    - Intégrateur sans encode_text (par exemple DINOv2)
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


def _make_text_resources() -> SearchResources:
    """
    - Crée des ressources de recherche factices 
      avec un embedder de texte et un index sémantique simulés.
    """
    return SearchResources(
        embedder=FakeTextEmbedder(),
        index=FakeSemanticIndex(),
        rows=FAKE_ROWS,
    )


def _make_service_with_semantic() -> SearchService:
    """
    - Crée une instance de SearchService avec des ressources factices
      pour les tests de recherche sémantique.
    """
    resources = _make_text_resources()
    return SearchService(resources={"semantic": resources})


@pytest.fixture()
def client_text():
    """
    - TestClient avec un SearchService factice (avec index sémantique) injecté dans app.state
      pour les tests d'endpoint de recherche textuelle.
    """
    app.state.search_service = _make_service_with_semantic()
    return TestClient(app, raise_server_exceptions=False)


# ---------------------------------------------------------------------------
# 1. encode_text() unit tests (contract)
# ---------------------------------------------------------------------------

def test_encode_text_shape_and_dtype():
    """
    - Vérifie que l'encode_text() de l'embedder de texte 
      retourne un vecteur de la bonne forme et du bon type.
    """
    embedder = FakeTextEmbedder()
    vec = embedder.encode_text("pneumonia chest radiograph")
    assert vec.shape == (512,), f"Expected (512,), got {vec.shape}"
    assert vec.dtype == np.float32, f"Expected float32, got {vec.dtype}"


def test_encode_text_l2_norm():
    """
    - Vérifie que le vecteur retourné par encode_text() est normalisé (norme L2 ≈ 1.0).
    - Cela garantit que les scores de similarité cosinus sont corrects lors de la recherche.
    """
    embedder = FakeTextEmbedder()
    vec = embedder.encode_text("brain MRI tumour")
    norm = float(np.linalg.norm(vec))
    assert abs(norm - 1.0) < 1e-5, f"Expected L2-norm ≈ 1.0, got {norm}"


# ---------------------------------------------------------------------------
# 2. query_text() unit tests
# ---------------------------------------------------------------------------

def test_query_text_returns_k_results():
    """
    - Vérifie que query_text() retourne exactement k résultats.
    """
    resources = _make_text_resources()
    results = query_text(resources=resources, text="chest X-ray", k=2)
    assert len(results) == 2


def test_query_text_results_are_ordered_by_rank():
    """
    - Vérifie que les résultats de query_text() sont triés par ordre croissant.
    """
    resources = _make_text_resources()
    results = query_text(resources=resources, text="chest X-ray", k=3)
    ranks = [r["rank"] for r in results]
    assert ranks == [1, 2, 3]


def test_query_text_scores_descending():
    """
    - Vérifie que les scores de similarité dans les résultats de query_text() 
      sont en ordre décroissant.
    """
    resources = _make_text_resources()
    results = query_text(resources=resources, text="chest X-ray", k=3)
    scores = [r["score"] for r in results]
    assert scores == sorted(scores, reverse=True)


def test_query_text_result_keys():
    """
    - Vérifie que chaque résultat de query_text() contient les clés attendues.
    """
    resources = _make_text_resources()
    results = query_text(resources=resources, text="chest X-ray", k=1)
    assert set(results[0].keys()) == {"rank", "score", "image_id", "path", "caption", "cui"}


def test_query_text_raises_if_no_encode_text():
    """
    - Vérifie que query_text() lève une ValueError 
    si l'embedder de texte ne supporte pas encode_text().
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
    - Vérifie que query_text() lève une ValueError 
      si le texte de requête est vide ou ne contient que des espaces.
    """
    resources = _make_text_resources()
    with pytest.raises(ValueError, match="empty"):
        query_text(resources=resources, text="   ", k=3)


def test_query_text_raises_on_invalid_k():
    """
    - Vérifie que query_text() lève une ValueError si k est inférieur à 1.
    """
    resources = _make_text_resources()
    with pytest.raises(ValueError):
        query_text(resources=resources, text="pneumonia", k=0)


# ---------------------------------------------------------------------------
# 3. SearchService.search_text() validation
# ---------------------------------------------------------------------------

def test_search_service_text_returns_dict():
    """
    - Vérifie que SearchService.search_text() retourne un dictionnaire avec les champs attendus.
    """
    service = _make_service_with_semantic()
    result = service.search_text(text="chest X-ray pneumonia", k=2)
    assert result["mode"] == "semantic"
    assert result["embedder"] == "biomedclip"
    assert result["query_text"] == "chest X-ray pneumonia"
    assert len(result["results"]) == 2


def test_search_service_text_strips_whitespace():
    """
    - Vérifie que SearchService.search_text() supprime les espaces autour du texte de requête.
    """
    service = _make_service_with_semantic()
    result = service.search_text(text="  pneumonia  ", k=1)
    assert result["query_text"] == "pneumonia"


def test_search_service_text_raises_on_empty():
    """
    - Vérifie que SearchService.search_text() lève une ValueError 
      si le texte de requête est vide ou ne contient que des espaces.
    """
    service = _make_service_with_semantic()
    with pytest.raises(ValueError, match="empty"):
        service.search_text(text="   ", k=5)


def test_search_service_text_raises_on_long_text():
    """
    - Vérifie que SearchService.search_text() lève une ValueError
        si le texte de requête dépasse une certaine longueur (par exemple, 500 caractères).
    """
    service = _make_service_with_semantic()
    with pytest.raises(ValueError, match="too long"):
        service.search_text(text="x" * 501, k=5)


def test_search_service_text_raises_on_invalid_k():
    """
    - Vérifie que SearchService.search_text() lève une ValueError si k est inférieur à 1.
    """
    service = _make_service_with_semantic()
    with pytest.raises(ValueError):
        service.search_text(text="pneumonia", k=0)


def test_search_service_text_propagates_unavailable():
    """
    - Vérifie que SearchService.search_text() propage une SearchUnavailableError 
      si les ressources de recherche ne sont pas disponibles.
    """
    service = SearchService(resources={})

    with patch.object(service, "_get_resources", side_effect=SearchUnavailableError("no index")):
        with pytest.raises(SearchUnavailableError):
            service.search_text(text="pneumonia", k=3)


# ---------------------------------------------------------------------------
# 4. POST /api/search-text endpoint
# ---------------------------------------------------------------------------

def test_endpoint_text_search_200(client_text):
    """
    - Teste une recherche textuelle réussie via le point de terminaison POST /api/search-text.
    - Vérifie que la réponse contient les champs attendus et que les résultats ont la structure correcte.
    """
    resp = client_text.post(
        "/api/search-text",
        json={"text": "chest X-ray pneumonia", "k": 2},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["mode"] == "semantic"
    assert data["embedder"] == "biomedclip"
    assert data["query_text"] == "chest X-ray pneumonia"
    assert len(data["results"]) == 2
    first = data["results"][0]
    assert {"rank", "score", "image_id", "caption", "cui", "path"} <= set(first.keys())


def test_endpoint_text_search_default_k(client_text):
    """
    - Vérifie que l'enpoint POST /api/search-text utilise une valeur par défaut pour k (par exemple, 5)
      lorsque k n'est pas fourni dans la requête.
    """
    resp = client_text.post("/api/search-text", json={"text": "pneumonia"})
    assert resp.status_code == 200
    assert len(resp.json()["results"]) <= 5


def test_endpoint_text_search_400_empty_text(client_text):
    """
    - Vérifie que l'endpoint POST /api/search-text retourne une erreur 400 
      si le texte de requête est vide.
    """
    resp = client_text.post("/api/search-text", json={"text": "", "k": 3})
    assert resp.status_code == 400


def test_endpoint_text_search_400_k_zero(client_text):
    """- Vérifie que l'endpoint POST /api/search-text retourne une erreur 400
        si k est inférieur à 1.
    """
    resp = client_text.post("/api/search-text", json={"text": "pneumonia", "k": 0})
    assert resp.status_code == 400


def test_endpoint_text_search_400_k_too_large(client_text):
    """
    - Vérifie que l'endpoint POST /api/search-text retourne une erreur 400
        si k est supérieur à une certaine limite (par exemple, 100).
    """
    resp = client_text.post("/api/search-text", json={"text": "pneumonia", "k": 999})
    assert resp.status_code == 400


def test_endpoint_text_search_503_unavailable():
    """
    - Vérifie que l'endpoint POST /api/search-text retourne une erreur 503.
    """
    service = SearchService(resources={})
    with patch.object(
        service, "_get_resources", side_effect=SearchUnavailableError("no artifacts")
    ):
        app.state.search_service = service
        client = TestClient(app, raise_server_exceptions=False)
        resp = client.post("/api/search-text", json={"text": "pneumonia", "k": 3})
    assert resp.status_code == 503
