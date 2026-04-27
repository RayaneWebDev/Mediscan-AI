"""Tests for production readiness checks."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock

from backend.app.services import readiness


def test_readiness_reports_ready_when_required_components_are_available(monkeypatch) -> None:
    """Artifacts are required; optional Mongo/LLM/SMTP can be disabled."""
    monkeypatch.setattr(readiness, "MONGO_URI", "")
    monkeypatch.setattr(readiness, "GROQ_API_KEY", "")
    monkeypatch.setattr(
        readiness,
        "STABLE_MODE_CONFIGS",
        {"visual": SimpleNamespace(index_path="index.faiss", ids_path="ids.json")},
    )
    monkeypatch.setattr(readiness, "ensure_artifacts_exist", MagicMock(return_value=("index.faiss", "ids.json")))
    monkeypatch.setattr(readiness, "load_indexed_rows", MagicMock(return_value=[{"image_id": "img1"}]))
    email_service = MagicMock()
    email_service.validate.side_effect = RuntimeError("smtp missing")

    report = readiness.build_readiness_report(email_service)

    assert report.http_status == 200
    assert report.payload["status"] == "ready"
    assert report.payload["components"]["artifacts"]["status"] == "ok"
    assert report.payload["components"]["mongo"]["status"] == "disabled"
    assert report.payload["components"]["llm"]["status"] == "disabled"
    assert report.payload["components"]["smtp"]["status"] == "disabled"


def test_readiness_fails_when_artifacts_are_missing(monkeypatch) -> None:
    """Missing FAISS/IDs artifacts make the instance not ready for traffic."""
    monkeypatch.setattr(readiness, "MONGO_URI", "")
    monkeypatch.setattr(
        readiness,
        "STABLE_MODE_CONFIGS",
        {"visual": SimpleNamespace(index_path="missing.faiss", ids_path="missing.json")},
    )
    monkeypatch.setattr(readiness, "ensure_artifacts_exist", MagicMock(side_effect=FileNotFoundError("missing")))

    report = readiness.build_readiness_report(MagicMock())

    assert report.http_status == 503
    assert report.payload["status"] == "not_ready"
    assert report.payload["blocking_errors"] == ["artifacts"]


def test_readiness_fails_when_configured_mongo_cannot_ping(monkeypatch) -> None:
    """A configured but unreachable MongoDB is a production readiness failure."""
    monkeypatch.setattr(readiness, "MONGO_URI", "mongodb://example")
    monkeypatch.setattr(
        readiness,
        "STABLE_MODE_CONFIGS",
        {"visual": SimpleNamespace(index_path="index.faiss", ids_path="ids.json")},
    )
    monkeypatch.setattr(readiness, "ensure_artifacts_exist", MagicMock(return_value=("index.faiss", "ids.json")))
    monkeypatch.setattr(readiness, "load_indexed_rows", MagicMock(return_value=[{"image_id": "img1"}]))
    mongo_client = MagicMock()
    mongo_client.return_value.admin.command.side_effect = RuntimeError("mongo down")
    monkeypatch.setitem(__import__("sys").modules, "pymongo", SimpleNamespace(MongoClient=mongo_client))

    report = readiness.build_readiness_report(MagicMock())

    assert report.http_status == 503
    assert report.payload["status"] == "not_ready"
    assert report.payload["components"]["mongo"]["status"] == "error"
    assert report.payload["blocking_errors"] == ["mongo"]


def test_readiness_reports_configured_optional_services(monkeypatch) -> None:
    """Configured LLM and SMTP appear in the readiness payload without exposing secrets."""
    monkeypatch.setattr(readiness, "MONGO_URI", "")
    monkeypatch.setattr(readiness, "GROQ_API_KEY", "secret")
    monkeypatch.setattr(readiness, "GROQ_MODEL", "llama-test")
    monkeypatch.setattr(
        readiness,
        "STABLE_MODE_CONFIGS",
        {"visual": SimpleNamespace(index_path="index.faiss", ids_path="ids.json")},
    )
    monkeypatch.setattr(readiness, "ensure_artifacts_exist", MagicMock(return_value=("index.faiss", "ids.json")))
    monkeypatch.setattr(readiness, "load_indexed_rows", MagicMock(return_value=[{"image_id": "img1"}]))
    email_service = MagicMock(host="smtp.example.com", port=587)
    email_service.validate.return_value = None

    report = readiness.build_readiness_report(email_service)

    assert report.payload["components"]["llm"] == {
        "status": "configured",
        "provider": "groq",
        "model": "llama-test",
    }
    assert report.payload["components"]["smtp"] == {
        "status": "configured",
        "host": "smtp.example.com",
        "port": 587,
    }
