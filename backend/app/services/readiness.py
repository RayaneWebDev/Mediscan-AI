"""Production readiness checks for the MediScan backend."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

from mediscan.runtime import STABLE_MODE_CONFIGS, ensure_artifacts_exist, load_indexed_rows

from backend.app.config import (
    COLLECTION_NAME,
    DB_NAME,
    GROQ_API_KEY,
    GROQ_MODEL,
    MONGO_CONNECT_TIMEOUT_MS,
    MONGO_SERVER_SELECTION_TIMEOUT_MS,
    MONGO_URI,
)
from backend.app.services.email_service import EmailService

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class ReadinessResult:
    """Structured readiness payload plus the HTTP status it should use."""

    http_status: int
    payload: dict[str, Any]


def _component(status: str, **details: Any) -> dict[str, Any]:
    """Build a normalized status block for one dependency category."""
    return {"status": status, **details}


def _check_artifacts() -> dict[str, Any]:
    """
    Validate the local FAISS and IDs artifacts required for traffic.

    Artifact failures are blocking because search cannot run without a readable
    index and metadata rows for each configured mode.
    """
    modes: dict[str, dict[str, Any]] = {}
    healthy = True

    for mode, mode_config in sorted(STABLE_MODE_CONFIGS.items()):
        try:
            index_path, ids_path = ensure_artifacts_exist(mode_config.index_path, mode_config.ids_path)
            rows = load_indexed_rows(ids_path)
            modes[mode] = _component(
                "ok",
                index=str(index_path),
                ids=str(ids_path),
                rows=len(rows),
            )
        except Exception as exc:
            healthy = False
            logger.error("Readiness artifact check failed for %s: %s", mode, exc)
            modes[mode] = _component("error", error=str(exc))

    return _component("ok" if healthy else "error", modes=modes)


def _check_mongo() -> dict[str, Any]:
    """
    Ping MongoDB only when enrichment is configured.

    A missing URI is non-blocking because search results still work without the
    optional metadata enrichment layer.
    """
    if not MONGO_URI:
        return _component("disabled", reason="MONGO_URI is not set")

    try:
        from pymongo import MongoClient

        client = MongoClient(
            MONGO_URI,
            serverSelectionTimeoutMS=MONGO_SERVER_SELECTION_TIMEOUT_MS,
            connectTimeoutMS=MONGO_CONNECT_TIMEOUT_MS,
        )
        client.admin.command("ping")
    except Exception as exc:
        logger.error("Readiness MongoDB check failed: %s", exc)
        return _component("error", database=DB_NAME, collection=COLLECTION_NAME, error=str(exc))

    return _component(
        "ok",
        database=DB_NAME,
        collection=COLLECTION_NAME,
        serverSelectionTimeoutMS=MONGO_SERVER_SELECTION_TIMEOUT_MS,
        connectTimeoutMS=MONGO_CONNECT_TIMEOUT_MS,
    )


def _check_llm() -> dict[str, Any]:
    """Report whether optional conclusion generation has a configured LLM key."""
    if not GROQ_API_KEY:
        return _component("disabled", provider="groq", reason="GROQ_KEY_API is not set")
    return _component("configured", provider="groq", model=GROQ_MODEL)


def _check_smtp(email_service: EmailService | None = None) -> dict[str, Any]:
    """Validate SMTP settings without opening a network connection."""
    service = email_service or EmailService()
    try:
        service.validate()
    except Exception as exc:
        return _component("disabled", reason=str(exc))

    return _component("configured", host=service.host, port=service.port)


def build_readiness_report(email_service: EmailService | None = None) -> ReadinessResult:
    """
    Build a production readiness report.

    Required for readiness: local FAISS/IDs artifacts must be present and any configured
    MongoDB URI must answer quickly. LLM and SMTP are optional features, so missing
    secrets are reported as disabled without failing the whole backend.
    """
    components = {
        "artifacts": _check_artifacts(),
        "mongo": _check_mongo(),
        "llm": _check_llm(),
        "smtp": _check_smtp(email_service),
    }

    blocking_errors = [
        name
        for name, component in components.items()
        if name in {"artifacts", "mongo"} and component["status"] == "error"
    ]
    ready = not blocking_errors
    payload = {
        "status": "ready" if ready else "not_ready",
        "components": components,
    }
    if blocking_errors:
        payload["blocking_errors"] = blocking_errors

    return ReadinessResult(http_status=200 if ready else 503, payload=payload)
