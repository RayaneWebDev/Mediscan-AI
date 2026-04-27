"""Tests for the top-level mediscan package."""

from __future__ import annotations

import mediscan


def test_mediscan_package_imports() -> None:
    """The package must stay importable from the local src layout."""
    assert mediscan is not None
