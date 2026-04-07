from __future__ import annotations

from threading import Lock

from mediscan.search import SearchResources, load_resources


class SearchResourceRegistry:
    """Thread-safe cache for lazily loaded search resources."""

    def __init__(self, resources: dict[str, SearchResources] | None = None) -> None:
        self._resources = dict(resources or {})
        self._lock = Lock()

    def get_or_load(self, mode: str) -> SearchResources:
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
