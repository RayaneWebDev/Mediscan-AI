"""Configuration contract tests for local and production backend setup."""

from __future__ import annotations

import builtins
import importlib
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app import config, main
from mediscan.runtime import PROJECT_ROOT, STABLE_MODE_CONFIGS, get_mode_config


REPO_ROOT = Path(__file__).resolve().parents[3]
ENV_EXAMPLE_REQUIRED_KEYS = {
    "MEDISCAN_CORS_ORIGINS",
    "MEDISCAN_MAX_UPLOAD_BYTES",
    "MEDISCAN_REMOTE_IMAGE_TIMEOUT_SECONDS",
    "MEDISCAN_TORCH_THREADS",
    "MEDISCAN_RATE_LIMIT_WINDOW_SECONDS",
    "MEDISCAN_RATE_LIMIT_SEARCH",
    "MEDISCAN_RATE_LIMIT_SEARCH_TEXT",
    "MEDISCAN_RATE_LIMIT_SEARCH_BY_ID",
    "MEDISCAN_RATE_LIMIT_SEARCH_BY_IDS",
    "MEDISCAN_RATE_LIMIT_CONCLUSION",
    "MEDISCAN_RATE_LIMIT_CONTACT",
    "MEDISCAN_SEARCH_CONCURRENCY_LIMIT",
    "MEDISCAN_CONCLUSION_CONCURRENCY_LIMIT",
    "MEDISCAN_CONTACT_CONCURRENCY_LIMIT",
    "MEDISCAN_TRUST_PROXY_HEADERS",
    "MEDISCAN_MONGO_SERVER_SELECTION_TIMEOUT_MS",
    "MEDISCAN_MONGO_CONNECT_TIMEOUT_MS",
    "MONGO_URI",
    "GROQ_KEY_API",
    "MEDISCAN_GROQ_MODEL",
    "MEDISCAN_MAX_CONCLUSION_RESULTS",
    "MEDISCAN_SMTP_HOST",
    "MEDISCAN_SMTP_PORT",
    "MEDISCAN_SMTP_USERNAME",
    "MEDISCAN_SMTP_PASSWORD",
    "MEDISCAN_SMTP_USE_TLS",
    "MEDISCAN_SMTP_USE_SSL",
    "MEDISCAN_CONTACT_FROM_EMAIL",
    "MEDISCAN_CONTACT_TO_EMAIL",
    "MEDISCAN_CONTACT_REPLY_TO_EMAIL",
    "DATA_DIR",
    "ARTIFACTS_DIR",
}
OPTIONAL_BACKEND_ENV_KEYS = ENV_EXAMPLE_REQUIRED_KEYS | {"PYTHONPATH"}


def _dotenv_keys(path: Path) -> set[str]:
    """Parse dotenv-style assignment keys from .env.example."""
    return {
        line.split("=", 1)[0].strip()
        for line in path.read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.lstrip().startswith("#") and "=" in line
    }


def test_env_example_documents_backend_runtime_configuration() -> None:
    """The repository documents every environment variable used by the backend."""
    env_example = REPO_ROOT / ".env.example"
    production_env_example = REPO_ROOT / "production.env.example"

    assert env_example.is_file()
    assert production_env_example.is_file()
    assert ENV_EXAMPLE_REQUIRED_KEYS <= _dotenv_keys(env_example)
    assert ENV_EXAMPLE_REQUIRED_KEYS - {"DATA_DIR", "ARTIFACTS_DIR"} <= _dotenv_keys(production_env_example)


def test_backend_config_uses_safe_defaults_when_optional_env_is_missing(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Missing optional environment variables keep search usable and disable optional services."""
    real_import = builtins.__import__

    def fake_import(name: str, *args: object, **kwargs: object):
        """Raise only for dotenv while delegating every other import."""
        if name == "dotenv":
            raise ImportError("dotenv disabled for this test")
        return real_import(name, *args, **kwargs)

    for key in OPTIONAL_BACKEND_ENV_KEYS:
        monkeypatch.delenv(key, raising=False)
    monkeypatch.setattr(builtins, "__import__", fake_import)

    reloaded = importlib.reload(config)

    assert reloaded.CORS_ALLOWED_ORIGINS == list(reloaded.DEFAULT_CORS_ORIGINS)
    assert reloaded.MAX_UPLOAD_BYTES == 10 * 1024 * 1024
    assert reloaded.REMOTE_IMAGE_TIMEOUT_SECONDS == 15
    assert reloaded.GROQ_API_KEY == ""
    assert reloaded.MONGO_URI is None
    assert reloaded.RATE_LIMIT_WINDOW_SECONDS == 60
    assert reloaded.RATE_LIMITS == {
        "search": 12,
        "search_text": 20,
        "search_by_id": 30,
        "search_by_ids": 10,
        "conclusion": 5,
        "contact": 3,
    }
    assert reloaded.CONCURRENCY_LIMITS == {"search": 2, "conclusion": 2, "contact": 5}
    assert reloaded.TRUST_PROXY_HEADERS is False
    assert reloaded.MONGO_SERVER_SELECTION_TIMEOUT_MS == 2000
    assert reloaded.MONGO_CONNECT_TIMEOUT_MS == 2000

    monkeypatch.setattr(builtins, "__import__", real_import)
    importlib.reload(config)


def test_configure_cors_exposes_only_configured_frontend_policy() -> None:
    """The backend CORS middleware mirrors the central configuration module."""
    application = FastAPI()

    main.configure_cors(application)

    middleware = application.user_middleware[0]
    assert middleware.cls is CORSMiddleware
    assert middleware.kwargs["allow_origins"] == main.CORS_ALLOWED_ORIGINS
    assert middleware.kwargs["allow_methods"] == ["GET", "POST"]
    assert middleware.kwargs["allow_headers"] == ["*"]


@pytest.mark.parametrize("mode", sorted(STABLE_MODE_CONFIGS))
def test_runtime_artifact_paths_are_project_local(mode: str) -> None:
    """Stable backend modes resolve artifacts inside the repository artifacts directory."""
    config_for_mode = get_mode_config(mode)

    assert config_for_mode.index_path.is_absolute()
    assert config_for_mode.ids_path.is_absolute()
    assert config_for_mode.manifest_path.is_absolute()
    assert config_for_mode.index_path.is_relative_to(PROJECT_ROOT / "artifacts")
    assert config_for_mode.ids_path.is_relative_to(PROJECT_ROOT / "artifacts")
    assert config_for_mode.manifest_path.is_relative_to(PROJECT_ROOT / "artifacts" / "manifests")
