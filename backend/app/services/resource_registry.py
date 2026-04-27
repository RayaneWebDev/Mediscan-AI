"""Thread-safe registry for lazily loaded search resources."""

from __future__ import annotations

from threading import Lock

from mediscan.search import SearchResources, load_resources


class SearchResourceRegistry:
    """
    Thread-safe cache for lazily loaded search resources.

    The first request for a mode pays the cost of loading the FAISS index and
    model. Subsequent requests reuse the same objects, while the lock prevents
    two concurrent requests from loading duplicate copies.
    """

    def __init__(self, resources: dict[str, SearchResources] | None = None) -> None:
        """Initialize the registry, optionally with preloaded resources."""
        self._resources = dict(resources or {})
        self._lock = Lock()

    def get_or_load(self, mode: str) -> SearchResources:
        """Return cached resources for a mode, loading them exactly once if needed."""
        resources = self._resources.get(mode)
        if resources is not None:
            return resources

        with self._lock:
            resources = self._resources.get(mode)
            if resources is not None:
                return resources

            resources = load_resources(mode=mode)
            self._resources[mode] = resources
            return resources
