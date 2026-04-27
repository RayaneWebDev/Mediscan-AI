"""Tests for FastAPI application construction."""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app import main


@pytest.mark.anyio
async def test_lifespan_initializes_services(monkeypatch: pytest.MonkeyPatch) -> None:
    """Application lifespan attaches lazy search and email services."""
    search_service = MagicMock()
    email_service = MagicMock()
    monkeypatch.setattr(main, "SearchService", MagicMock(return_value=search_service))
    monkeypatch.setattr(main, "EmailService", MagicMock(return_value=email_service))

    application = FastAPI()
    async with main.lifespan(application):
        assert application.state.search_service is search_service
        assert application.state.email_service is email_service

    main.SearchService.assert_called_once_with(resources={})
    main.EmailService.assert_called_once_with()


def test_configure_cors_adds_cors_middleware() -> None:
    """CORS middleware is installed with the configured origins."""
    application = FastAPI()

    main.configure_cors(application)

    middleware = application.user_middleware[0]
    assert middleware.cls is CORSMiddleware
    assert middleware.kwargs["allow_origins"] == main.CORS_ALLOWED_ORIGINS
    assert middleware.kwargs["allow_methods"] == main.ALLOWED_CORS_METHODS


def test_create_app_configures_router_and_metadata(monkeypatch: pytest.MonkeyPatch) -> None:
    """Application factory sets metadata and includes API routes."""
    configure_cors = MagicMock()
    monkeypatch.setattr(main, "configure_cors", configure_cors)

    application = main.create_app()

    assert application.title == "MEDISCAN API"
    assert application.version == "1.0"
    assert any(route.path == "/api/health" for route in application.routes)
    configure_cors.assert_called_once_with(application)
