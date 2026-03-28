"""Unit tests for text-to-image search — no HTTP client required.

Tests: encode_text() contract, query_text() pipeline, SearchService.search_text() validation.
API endpoint tests (require httpx) are in test_text_search.py.
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
    name = "biomedclip"
    dim = 512

    def encode_pil(self, image):
        return np.ones((512,), dtype=np.float32)

    def encode_text(self, text: str) -> np.ndarray:
        vec = np.ones((512,), dtype=np.float32)
        vec /= np.linalg.norm(vec)
        return vec


class FakeNoTextEmbedder:
    name = "dinov2_base"
    dim = 768

    def encode_pil(self, image):
        return np.ones((768,), dtype=np.float32)


class FakeSemanticIndex:
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
    return SearchResources(
        embedder=FakeTextEmbedder(),
        index=FakeSemanticIndex(),
        rows=FAKE_ROWS,
    )


def _make_service() -> SearchService:
    return SearchService(resources={"semantic": _make_resources()})


# ---------------------------------------------------------------------------
# encode_text() contract
# ---------------------------------------------------------------------------

def test_encode_text_shape_and_dtype():
    vec = FakeTextEmbedder().encode_text("pneumonia chest radiograph")
    assert vec.shape == (512,)
    assert vec.dtype == np.float32


def test_encode_text_l2_norm():
    vec = FakeTextEmbedder().encode_text("brain MRI tumour")
    assert abs(float(np.linalg.norm(vec)) - 1.0) < 1e-5


# ---------------------------------------------------------------------------
# query_text()
# ---------------------------------------------------------------------------

def test_query_text_returns_k_results():
    results = query_text(resources=_make_resources(), text="chest X-ray", k=2)
    assert len(results) == 2


def test_query_text_results_ordered_by_rank():
    results = query_text(resources=_make_resources(), text="chest X-ray", k=3)
    assert [r["rank"] for r in results] == [1, 2, 3]


def test_query_text_scores_descending():
    results = query_text(resources=_make_resources(), text="chest X-ray", k=3)
    scores = [r["score"] for r in results]
    assert scores == sorted(scores, reverse=True)


def test_query_text_result_keys():
    results = query_text(resources=_make_resources(), text="chest X-ray", k=1)
    assert set(results[0].keys()) == {"rank", "score", "image_id", "path", "caption", "cui"}


def test_query_text_raises_if_no_encode_text():
    resources = SearchResources(
        embedder=FakeNoTextEmbedder(),
        index=FakeSemanticIndex(),
        rows=FAKE_ROWS,
    )
    with pytest.raises(ValueError, match="encode_text"):
        query_text(resources=resources, text="test", k=3)


def test_query_text_raises_on_empty_text():
    with pytest.raises(ValueError, match="empty"):
        query_text(resources=_make_resources(), text="   ", k=3)


def test_query_text_raises_on_invalid_k():
    with pytest.raises(ValueError):
        query_text(resources=_make_resources(), text="pneumonia", k=0)


# ---------------------------------------------------------------------------
# SearchService.search_text()
# ---------------------------------------------------------------------------

def test_search_service_returns_correct_structure():
    result = _make_service().search_text(text="chest X-ray pneumonia", k=2)
    assert result["mode"] == "semantic"
    assert result["embedder"] == "biomedclip"
    assert result["query_text"] == "chest X-ray pneumonia"
    assert len(result["results"]) == 2


def test_search_service_strips_whitespace():
    result = _make_service().search_text(text="  pneumonia  ", k=1)
    assert result["query_text"] == "pneumonia"


def test_search_service_raises_on_empty():
    with pytest.raises(ValueError, match="empty"):
        _make_service().search_text(text="   ", k=5)


def test_search_service_raises_on_long_text():
    with pytest.raises(ValueError, match="too long"):
        _make_service().search_text(text="x" * 501, k=5)


def test_search_service_raises_on_invalid_k():
    with pytest.raises(ValueError):
        _make_service().search_text(text="pneumonia", k=0)


def test_search_service_propagates_unavailable():
    service = SearchService(resources={})
    with patch.object(service, "_get_resources", side_effect=SearchUnavailableError("no index")):
        with pytest.raises(SearchUnavailableError):
            service.search_text(text="pneumonia", k=3)
