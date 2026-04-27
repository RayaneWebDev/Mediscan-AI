"""Tests for optional MongoDB result enrichment."""

from __future__ import annotations

from unittest.mock import MagicMock
from types import SimpleNamespace

from backend.app.services import result_enricher
from backend.app.services.result_enricher import MongoResultEnricher


def test_load_mongo_collection_returns_none_without_uri(monkeypatch) -> None:
    """Mongo loading is skipped when no URI is configured."""
    monkeypatch.setattr(result_enricher, "MONGO_URI", "")
    assert result_enricher._load_mongo_collection() is None


def test_load_mongo_collection_returns_none_on_connection_error(monkeypatch) -> None:
    """Mongo import/connection errors are non-fatal."""
    monkeypatch.setattr(result_enricher, "MONGO_URI", "mongodb://example")
    monkeypatch.setitem(__import__("sys").modules, "pymongo", None)

    assert result_enricher._load_mongo_collection() is None


def test_load_mongo_collection_returns_configured_collection(monkeypatch) -> None:
    """Mongo loading indexes database then collection from MongoClient."""
    collection = object()
    database = {"results": collection}
    client = MagicMock()
    client.__getitem__.return_value = database
    mongo_client = MagicMock(return_value=client)
    pymongo = SimpleNamespace(MongoClient=mongo_client)
    monkeypatch.setattr(result_enricher, "MONGO_URI", "mongodb://example")
    monkeypatch.setitem(__import__("sys").modules, "pymongo", pymongo)

    assert result_enricher._load_mongo_collection() is collection
    client.admin.command.assert_called_once_with("ping")
    mongo_client.assert_called_once_with(
        "mongodb://example",
        serverSelectionTimeoutMS=result_enricher.MONGO_SERVER_SELECTION_TIMEOUT_MS,
        connectTimeoutMS=result_enricher.MONGO_CONNECT_TIMEOUT_MS,
    )


def test_from_environment_uses_loaded_collection(monkeypatch) -> None:
    """Factory method stores the environment collection."""
    collection = object()
    monkeypatch.setattr(result_enricher, "_load_mongo_collection", MagicMock(return_value=collection))

    enricher = MongoResultEnricher.from_environment()

    assert enricher._collection is collection


def test_enrich_returns_original_when_no_collection_or_empty_results() -> None:
    """Unavailable Mongo or empty results keep the original list."""
    results = [{"image_id": "img1"}]

    assert MongoResultEnricher(collection=None).enrich(results) is results
    assert MongoResultEnricher(collection=MagicMock()).enrich([]) == []


def test_enrich_merges_caption_and_cui_from_collection() -> None:
    """Mongo documents enrich matching results while preserving missing rows."""
    collection = MagicMock()
    collection.find.return_value = [
        {"image_id": "img1", "caption": "from db", "cui": ["C001"]},
    ]
    results = [
        {"rank": 1, "image_id": "img1", "score": "0.9", "caption": "old", "cui": "", "path": "p.png"},
        {"rank": 2, "image_id": "img2", "score": 0.7, "caption": "kept", "cui": "", "path": "q.png"},
    ]

    enriched = MongoResultEnricher(collection=collection).enrich(results)

    assert enriched[0] == {
        "rank": 1,
        "image_id": "img1",
        "score": 0.9,
        "caption": "from db",
        "cui": ["C001"],
        "path": "p.png",
    }
    assert enriched[1] is results[1]
    collection.find.assert_called_once_with(
        {"image_id": {"$in": ["img1", "img2"]}},
        {"image_id": 1, "caption": 1, "cui": 1},
    )


def test_enrich_returns_original_on_query_error() -> None:
    """Mongo query failures leave results untouched."""
    collection = MagicMock()
    collection.find.side_effect = RuntimeError("mongo down")
    results = [{"image_id": "img1"}]

    assert MongoResultEnricher(collection=collection).enrich(results) is results
