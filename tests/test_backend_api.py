from io import BytesIO
from unittest.mock import patch

from fastapi.testclient import TestClient
from PIL import Image

from backend.app.main import app
from backend.app.services.search_service import SearchService

client = TestClient(app)


def make_png_bytes() -> bytes:
    buffer = BytesIO()
    Image.new("RGB", (8, 8), color=(255, 0, 0)).save(buffer, format="PNG")
    return buffer.getvalue()


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@patch("backend.app.services.search_service.query_module.run_query")
def test_search_endpoint_returns_results(mock_run_query):
    mock_run_query.return_value = (
        "dinov2_base",
        "query.png",
        [
            {
                "rank": 1,
                "image_id": "img1",
                "score": 0.9,
                "path": "data/roco_small/images/img1.png",
                "caption": "caption",
                "cui": "[]",
            }
        ],
    )

    response = client.post(
        "/api/search",
        files={"image": ("query.png", make_png_bytes(), "image/png")},
        data={"mode": "visual", "k": "1"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["mode"] == "visual"
    assert payload["embedder"] == "dinov2_base"
    assert payload["results"][0]["image_id"] == "img1"


def test_search_service_rejects_invalid_content_type():
    service = SearchService()
    try:
        service.search(
            image_bytes=b"not-an-image",
            filename="query.txt",
            content_type="text/plain",
            mode="visual",
            k=5,
        )
    except ValueError as exc:
        assert "JPEG and PNG" in str(exc)
    else:
        raise AssertionError("ValueError expected")
