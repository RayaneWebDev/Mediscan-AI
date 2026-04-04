"""
Tests unitaires et d'intégration pour l'API MEDISCAN.

Vérifie le bon fonctionnement des endpoints, la validation des entrées
et la gestion des erreurs sans charger les modèles IA réels (utilisation de Mocks).
"""

from io import BytesIO
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from backend.app.main import app
from backend.app.services.search_service import SearchService, SearchUnavailableError
from mediscan.search import SearchResources


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

class FakeEmbedder:
    """ 
    - Simule un modèle d'IA pour les tests. 
    """
    name = "dinov2_base"
    dim = 768


def _make_fake_service() -> SearchService:
    """
    - Créez un service de recherche avec des ressources simulées (aucun modèle réel chargé).
    """
    fake_resources = MagicMock(spec=SearchResources)
    fake_resources.embedder = FakeEmbedder()
    return SearchService(resources={"visual": fake_resources, "semantic": fake_resources})


@pytest.fixture()
def client():
    """
    - TestClient avec un faux SearchService injecté dans app.state
    """
    app.state.search_service = _make_fake_service()
    return TestClient(app, raise_server_exceptions=False)


def make_png_bytes() -> bytes:
    """
    - Génère un petit fichier PNG en mémoire pour les tests de téléchargement d'images.
    """
    buffer = BytesIO()
    Image.new("RGB", (8, 8), color=(255, 0, 0)).save(buffer, format="PNG")
    return buffer.getvalue()


def make_jpeg_bytes() -> bytes:
    """
    - Génère un petit fichier JPEG en mémoire pour les tests de téléchargement d'images.
    """
    buffer = BytesIO()
    Image.new("RGB", (8, 8), color=(0, 255, 0)).save(buffer, format="JPEG")
    return buffer.getvalue()


# ---------------------------------------------------------------------------
# GET /api/health
# ---------------------------------------------------------------------------

def test_health_endpoint(client):
    """ 
    - Vérifie que l'API répond 'ok' sur la route de santé. 
    """
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


# ---------------------------------------------------------------------------
# POST /api/search — success cases
# ---------------------------------------------------------------------------

@patch("backend.app.services.search_service.query")
def test_search_returns_results_visual(mock_query, client):
    """ 
    - Teste une recherche visuelle réussie.
    - On simule (mock) la réponse du moteur de recherche Faiss.
    """
    mock_query.return_value = [
        {"rank": 1, "image_id": "img1", "score": 0.9, "path": "p.png", "caption": "c", "cui": "[]"},
    ]
    response = client.post(
        "/api/search",
        files={"image": ("query.png", make_png_bytes(), "image/png")},
        data={"mode": "visual", "k": "1"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["mode"] == "visual"
    assert payload["embedder"] == "dinov2_base"
    assert len(payload["results"]) == 1
    assert payload["results"][0]["image_id"] == "img1"


@patch("backend.app.services.search_service.query")
def test_search_returns_results_semantic(mock_query, client):
    """
    - Teste une recherche sémantique réussie.
    - On simule (mock) la réponse du moteur de recherche Faiss.
    """
    mock_query.return_value = [
        {"rank": 1, "image_id": "img2", "score": 0.85, "path": "p.png", "caption": "c", "cui": "[]"},
    ]
    response = client.post(
        "/api/search",
        files={"image": ("query.jpg", make_jpeg_bytes(), "image/jpeg")},
        data={"mode": "semantic", "k": "3"},
    )
    assert response.status_code == 200
    assert response.json()["mode"] == "semantic"


@patch("backend.app.services.search_service.query")
def test_search_default_mode_and_k(mock_query, client):
    """
    - Teste les valeurs par défaut pour le mode et k.
    """
    mock_query.return_value = []
    response = client.post(
        "/api/search",
        files={"image": ("q.png", make_png_bytes(), "image/png")},
    )
    assert response.status_code == 200
    assert response.json()["mode"] == "visual"


# ---------------------------------------------------------------------------
# POST /api/search — error cases
# ---------------------------------------------------------------------------

def test_search_rejects_invalid_mode(client):
    """ 
    - Vérifie que l'API refuse un mode de recherche inconnu (Erreur 400). 
    """
    response = client.post(
        "/api/search",
        files={"image": ("q.png", make_png_bytes(), "image/png")},
        data={"mode": "invalid", "k": "5"},
    )
    assert response.status_code == 400
    assert "Unsupported mode" in response.json()["detail"]


def test_search_rejects_k_zero(client):
    """ 
    - Vérifie que l'API détecte et refuse un fichier qui n'est pas une vraie image. 
    """
    response = client.post(
        "/api/search",
        files={"image": ("q.png", make_png_bytes(), "image/png")},
        data={"mode": "visual", "k": "0"},
    )
    assert response.status_code == 400
    assert "k must be" in response.json()["detail"]


def test_search_rejects_k_too_large(client):
    """ 
    - Vérifie que l'API refuse une valeur de k trop grande (Erreur 400). 
    """
    response = client.post(
        "/api/search",
        files={"image": ("q.png", make_png_bytes(), "image/png")},
        data={"mode": "visual", "k": "999"},
    )
    assert response.status_code == 400
    assert "k must be" in response.json()["detail"]


def test_search_rejects_invalid_content_type(client):
    """
    - Vérifie que l'API refuse un fichier avec un type de contenu non supporté (Erreur 400). 
    """
    response = client.post(
        "/api/search",
        files={"image": ("q.txt", b"not-an-image", "text/plain")},
        data={"mode": "visual", "k": "5"},
    )
    assert response.status_code == 400
    assert "JPEG and PNG" in response.json()["detail"]


def test_search_rejects_empty_image(client):
    """
    - Vérifie que l'API détecte et refuse un fichier image vide. 
    """
    response = client.post(
        "/api/search",
        files={"image": ("q.png", b"", "image/png")},
        data={"mode": "visual", "k": "5"},
    )
    assert response.status_code == 400
    assert "empty" in response.json()["detail"].lower()


def test_search_rejects_corrupted_image(client):
    """
    - Vérifie que l'API détecte et refuse un fichier qui n'est pas une vraie image. 
    """
    response = client.post(
        "/api/search",
        files={"image": ("q.png", b"not-a-real-png", "image/png")},
        data={"mode": "visual", "k": "5"},
    )
    assert response.status_code == 400
    assert "Invalid image" in response.json()["detail"]


def test_search_returns_503_when_mode_resources_are_missing():
    """
    - Simule une situation où les ressources nécessaires pour un mode de recherche ne sont pas chargées.
    """
    fake_resources = MagicMock(spec=SearchResources)
    fake_resources.embedder = FakeEmbedder()
    app.state.search_service = SearchService(resources={"visual": fake_resources})
    client = TestClient(app, raise_server_exceptions=False)

    response = client.post(
        "/api/search",
        files={"image": ("q.png", make_png_bytes(), "image/png")},
        data={"mode": "semantic", "k": "5"},
    )

    assert response.status_code == 503
    assert "unavailable" in response.json()["detail"].lower()


# ---------------------------------------------------------------------------
# GET /api/images/{image_id}
# ---------------------------------------------------------------------------

def test_get_image_returns_file(client, tmp_path):
    """
    - Vérifie que l'API retourne une image existante avec le bon type de contenu.
    """
    image_path = tmp_path / "test_img.png"
    Image.new("RGB", (8, 8)).save(image_path)

    with patch("backend.app.api.routes.IMAGES_DIR", tmp_path):
        response = client.get("/api/images/test_img")
    assert response.status_code == 200
    assert response.headers["content-type"] == "image/png"


def test_get_image_returns_404_for_missing(client):
    """
    - Vérifie que l'API retourne une erreur 404 pour une image non existante.
    """
    with patch("backend.app.api.routes.IMAGES_DIR", Path("/nonexistent")):
        response = client.get("/api/images/does_not_exist")
    assert response.status_code == 404


def test_get_image_rejects_dots_in_id(client):
    """ 
    - Test de sécurité : vérifie que l'on ne peut pas injecter de caractères 
      spéciaux dans l'ID pour tenter d'accéder à des fichiers système.
    """
    response = client.get("/api/images/..passwd")
    assert response.status_code == 400
    assert "Invalid image ID" in response.json()["detail"]


def test_get_image_rejects_special_characters(client):
    """ 
    - Test de sécurité : vérifie que l'on ne peut pas injecter de caractères 
      spéciaux dans l'ID pour tenter d'accéder à des fichiers système.
    """
    response = client.get("/api/images/img@evil")
    assert response.status_code == 400
    assert "Invalid image ID" in response.json()["detail"]
