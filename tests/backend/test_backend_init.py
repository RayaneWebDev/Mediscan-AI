"""Tests for the backend package marker."""

from __future__ import annotations

import backend


def test_backend_package_imports() -> None:
    """The backend package can be imported."""
    assert backend.__name__ == "backend"
