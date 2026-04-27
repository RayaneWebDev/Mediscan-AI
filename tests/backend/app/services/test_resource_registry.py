"""Tests for lazy search resource registry."""

from __future__ import annotations

from unittest.mock import MagicMock

from backend.app.services import resource_registry
from backend.app.services.resource_registry import SearchResourceRegistry


def test_get_or_load_returns_preloaded_resources() -> None:
    """Preloaded resources are returned without loading."""
    resources = object()
    registry = SearchResourceRegistry(resources={"visual": resources})

    assert registry.get_or_load("visual") is resources


def test_get_or_load_loads_and_caches_missing_resources(monkeypatch) -> None:
    """Missing modes are loaded once and cached."""
    loaded = object()
    load_resources = MagicMock(return_value=loaded)
    monkeypatch.setattr(resource_registry, "load_resources", load_resources)
    registry = SearchResourceRegistry()

    assert registry.get_or_load("semantic") is loaded
    assert registry.get_or_load("semantic") is loaded
    load_resources.assert_called_once_with(mode="semantic")


def test_get_or_load_returns_resource_added_while_waiting_for_lock(monkeypatch) -> None:
    """Double-checked locking reuses a resource inserted before lock acquisition completes."""
    registry = SearchResourceRegistry()
    loaded_elsewhere = object()

    class PopulatingLock:
        """Lock double that populates the registry during acquisition."""

        def __enter__(self):
            """Insert a resource before the registry performs its second lookup."""
            registry._resources["visual"] = loaded_elsewhere

        def __exit__(self, *args: object) -> None:
            """Release the fake lock without extra work."""
            return None

    registry._lock = PopulatingLock()
    load_resources = MagicMock()
    monkeypatch.setattr(resource_registry, "load_resources", load_resources)

    assert registry.get_or_load("visual") is loaded_elsewhere
    load_resources.assert_not_called()
