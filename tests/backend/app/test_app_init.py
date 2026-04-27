"""Tests for the backend.app package marker."""

from __future__ import annotations

import backend.app


def test_backend_app_package_imports() -> None:
    """The backend.app package can be imported."""
    assert backend.app.__name__ == "backend.app"
