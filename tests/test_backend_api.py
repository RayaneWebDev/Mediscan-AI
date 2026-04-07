from io import BytesIO
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from backend.app.image_utils import hf_image_url
from backend.app.main import app
from backend.app.services.search_service import SearchService, SearchUnavailableError
from mediscan.search import SearchResources


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

class FakeEmbedder:
    name = "dinov2_base"
    dim = 768


def _make_fake_service() -> SearchService:
    """Build a SearchService with mocked resources (no real model loaded)."""
    fake_resources = MagicMock(spec=SearchResources)
    fake_resources.embedder = FakeEmbedder()
    return SearchService(resources={"visual": fake_resources, "semantic": fake_resources})


@pytest.fixture()
def client():
    """TestClient with a fake SearchService injected into app.state."""
    app.state.search_service = _make_fake_service()
    return TestClient(app, raise_server_exceptions=False)


def make_png_bytes() -> bytes:
    buffer = BytesIO()
    Image.new("RGB", (8, 8), color=(255, 0, 0)).save(buffer, format="PNG")
    return buffer.getvalue()


def make_jpeg_bytes() -> bytes:
    buffer = BytesIO()
    Image.new("RGB", (8, 8), color=(0, 255, 0)).save(buffer, format="JPEG")
    return buffer.getvalue()


# ---------------------------------------------------------------------------
# GET /api/health
# ---------------------------------------------------------------------------

def test_health_endpoint(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


# ---------------------------------------------------------------------------
# POST /api/search — success cases
# ---------------------------------------------------------------------------

@patch("backend.app.services.search_service.query")
def test_search_returns_results_visual(mock_query, client):
    mock_query.return_value = [
        {
            "rank": 1,
            "image_id": "ROCOv2_2023_train_000001",
            "score": 0.9,
            "path": "p.png",
            "caption": "c",
            "cui": "[]",
        },
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
    assert payload["results"][0]["image_id"] == "ROCOv2_2023_train_000001"
    assert payload["results"][0]["path"] == hf_image_url("ROCOv2_2023_train_000001")


@patch("backend.app.services.search_service.query")
def test_search_returns_results_semantic(mock_query, client):
    mock_query.return_value = [
        {
            "rank": 1,
            "image_id": "ROCOv2_2023_train_000002",
            "score": 0.85,
            "path": "p.png",
            "caption": "c",
            "cui": "[]",
        },
    ]
    response = client.post(
        "/api/search",
        files={"image": ("query.jpg", make_jpeg_bytes(), "image/jpeg")},
        data={"mode": "semantic", "k": "3"},
    )
    assert response.status_code == 200
    assert response.json()["mode"] == "semantic"
    assert response.json()["results"][0]["path"] == hf_image_url("ROCOv2_2023_train_000002")


@patch("backend.app.services.search_service.query")
def test_search_default_mode_and_k(mock_query, client):
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
    response = client.post(
        "/api/search",
        files={"image": ("q.png", make_png_bytes(), "image/png")},
        data={"mode": "invalid", "k": "5"},
    )
    assert response.status_code == 400
    assert "Unsupported mode" in response.json()["detail"]


def test_search_rejects_k_zero(client):
    response = client.post(
        "/api/search",
        files={"image": ("q.png", make_png_bytes(), "image/png")},
        data={"mode": "visual", "k": "0"},
    )
    assert response.status_code == 400
    assert "k must be" in response.json()["detail"]


def test_search_rejects_k_too_large(client):
    response = client.post(
        "/api/search",
        files={"image": ("q.png", make_png_bytes(), "image/png")},
        data={"mode": "visual", "k": "999"},
    )
    assert response.status_code == 400
    assert "k must be" in response.json()["detail"]


def test_search_rejects_invalid_content_type(client):
    response = client.post(
        "/api/search",
        files={"image": ("q.txt", b"not-an-image", "text/plain")},
        data={"mode": "visual", "k": "5"},
    )
    assert response.status_code == 400
    assert "JPEG and PNG" in response.json()["detail"]


def test_search_rejects_empty_image(client):
    response = client.post(
        "/api/search",
        files={"image": ("q.png", b"", "image/png")},
        data={"mode": "visual", "k": "5"},
    )
    assert response.status_code == 400
    assert "empty" in response.json()["detail"].lower()


def test_search_rejects_corrupted_image(client):
    response = client.post(
        "/api/search",
        files={"image": ("q.png", b"not-a-real-png", "image/png")},
        data={"mode": "visual", "k": "5"},
    )
    assert response.status_code == 400
    assert "Invalid image" in response.json()["detail"]


def test_search_returns_503_when_mode_resources_are_missing():
    fake_resources = MagicMock(spec=SearchResources)
    fake_resources.embedder = FakeEmbedder()
    service = SearchService(resources={"visual": fake_resources})

    with patch.object(service, "_get_resources", side_effect=SearchUnavailableError("mode unavailable")):
        app.state.search_service = service
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

def test_get_image_redirects_to_huggingface(client):
    image_id = "ROCOv2_2023_train_000123"
    response = client.get(f"/api/images/{image_id}", follow_redirects=False)
    assert response.status_code == 307
    assert response.headers["location"] == hf_image_url(image_id)


def test_get_image_rejects_dots_in_id(client):
    response = client.get("/api/images/..passwd")
    assert response.status_code == 400
    assert "Invalid image ID" in response.json()["detail"]


def test_get_image_rejects_special_characters(client):
    response = client.get("/api/images/img@evil")
    assert response.status_code == 400
    assert "Invalid image ID" in response.json()["detail"]
