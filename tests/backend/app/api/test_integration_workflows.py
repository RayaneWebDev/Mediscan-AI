"""Integration-style API workflow tests using real FastAPI routes."""

from __future__ import annotations

from io import BytesIO
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient
from PIL import Image

from backend.app.config import CONCURRENCY_LIMITS, RATE_LIMITS, RATE_LIMIT_WINDOW_SECONDS
from backend.app.image_utils import hf_image_url
from backend.app.main import app
from backend.app.services.request_guards import InMemoryRateLimiter, RequestConcurrencyLimiter


def _png_bytes() -> bytes:
    """Build a small valid PNG upload payload."""
    buffer = BytesIO()
    Image.new("RGB", (8, 8), color=(0, 128, 255)).save(buffer, format="PNG")
    return buffer.getvalue()


def _result(image_id: str, *, rank: int = 1, score: float = 0.9) -> dict[str, object]:
    """Return one service-level search result row."""
    return {
        "rank": rank,
        "image_id": image_id,
        "score": score,
        "path": "local/path.png",
        "caption": "A short indexed caption.",
        "cui": "[]",
    }


def test_search_conclusion_and_contact_workflow_through_real_routes() -> None:
    """The public backend workflows delegate correctly and return API-shaped payloads."""
    search_service = MagicMock()
    email_service = MagicMock()

    search_service.search.return_value = {
        "mode": "visual",
        "embedder": "dinov2_base",
        "query_image": "query.png",
        "results": [_result("ROCOv2_2023_train_000101")],
    }
    search_service.search_text.return_value = {
        "mode": "semantic",
        "embedder": "biomedclip",
        "query_text": "lung opacity",
        "results": [_result("ROCOv2_2023_train_000102")],
    }
    search_service.search_by_id.return_value = {
        "mode": "visual",
        "embedder": "dinov2_base",
        "query_image_id": "ROCOv2_2023_train_000103",
        "results": [_result("ROCOv2_2023_train_000104")],
    }
    search_service.search_by_ids.return_value = {
        "mode": "semantic",
        "embedder": "biomedclip",
        "query_image_ids": ["ROCOv2_2023_train_000105", "ROCOv2_2023_train_000106"],
        "results": [_result("ROCOv2_2023_train_000107")],
    }

    app.state.search_service = search_service
    app.state.email_service = email_service
    app.state.rate_limiter = InMemoryRateLimiter(RATE_LIMITS, RATE_LIMIT_WINDOW_SECONDS)
    app.state.concurrency_limiter = RequestConcurrencyLimiter(CONCURRENCY_LIMITS)
    client = TestClient(app, raise_server_exceptions=False)
    image_bytes = _png_bytes()

    image_response = client.post(
        "/api/search",
        files={"image": ("query.png", image_bytes, "image/png")},
        data={"mode": "visual", "k": "2"},
    )
    assert image_response.status_code == 200
    assert image_response.json()["results"][0]["path"] == hf_image_url("ROCOv2_2023_train_000101")
    search_service.search.assert_called_once_with(
        image_bytes=image_bytes,
        filename="query.png",
        content_type="image/png",
        mode="visual",
        k=2,
    )

    text_response = client.post("/api/search-text", json={"text": " lung opacity ", "k": 3})
    assert text_response.status_code == 200
    assert text_response.json()["query_text"] == "lung opacity"
    assert text_response.json()["results"][0]["path"] == hf_image_url("ROCOv2_2023_train_000102")
    search_service.search_text.assert_called_once_with(text=" lung opacity ", k=3)

    by_id_response = client.post(
        "/api/search-by-id",
        json={"image_id": "ROCOv2_2023_train_000103", "mode": "visual", "k": 4},
    )
    assert by_id_response.status_code == 200
    assert by_id_response.json()["query_image_id"] == "ROCOv2_2023_train_000103"
    assert by_id_response.json()["results"][0]["path"] == hf_image_url("ROCOv2_2023_train_000104")
    search_service.search_by_id.assert_called_once_with(
        image_id="ROCOv2_2023_train_000103",
        mode="visual",
        k=4,
    )

    by_ids_response = client.post(
        "/api/search-by-ids",
        json={
            "image_ids": ["ROCOv2_2023_train_000105", "ROCOv2_2023_train_000106"],
            "mode": "semantic",
            "k": 5,
        },
    )
    assert by_ids_response.status_code == 200
    assert by_ids_response.json()["query_image_ids"] == [
        "ROCOv2_2023_train_000105",
        "ROCOv2_2023_train_000106",
    ]
    assert by_ids_response.json()["results"][0]["path"] == hf_image_url("ROCOv2_2023_train_000107")
    search_service.search_by_ids.assert_called_once_with(
        image_ids=["ROCOv2_2023_train_000105", "ROCOv2_2023_train_000106"],
        mode="semantic",
        k=5,
    )

    with patch("backend.app.api.routes.generate_clinical_conclusion", return_value="Clinical summary."):
        conclusion_response = client.post(
            "/api/generate-conclusion",
            json={
                "mode": "semantic",
                "embedder": "biomedclip",
                "results": [
                    {
                        "rank": 1,
                        "image_id": "ROCOv2_2023_train_000107",
                        "score": 0.91,
                    }
                ],
            },
        )
    assert conclusion_response.status_code == 200
    assert conclusion_response.json() == {"conclusion": "Clinical summary."}

    contact_response = client.post(
        "/api/contact",
        json={
            "name": " Alice Martin ",
            "email": " alice@example.com ",
            "subject": " Question produit ",
            "message": " Bonjour, je souhaite en savoir plus. ",
        },
    )
    assert contact_response.status_code == 200
    assert contact_response.json() == {
        "success": True,
        "message": "Contact email sent successfully.",
    }
    email_service.send_contact_email.assert_called_once_with(
        name="Alice Martin",
        email="alice@example.com",
        subject="Question produit",
        message="Bonjour, je souhaite en savoir plus.",
    )
