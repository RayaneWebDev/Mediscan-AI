"""Tests for high-level search service orchestration."""

from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock

import numpy as np
import pytest

from backend.app.services import search_service
from backend.app.services.search_service import SearchService, SearchUnavailableError


class PathContext:
    """Simple context manager yielding a path."""

    def __init__(self, path: Path) -> None:
        """Store the path yielded by the context manager."""
        self.path = path

    def __enter__(self) -> Path:
        """Return the configured path."""
        return self.path

    def __exit__(self, *args: object) -> None:
        """Leave the temporary path untouched for assertions."""
        return None


def make_resources() -> SimpleNamespace:
    """Build fake search resources."""
    index = MagicMock()
    index.ntotal = 5
    index.search.return_value = (
        np.array([[0.99, 0.75, 0.5]], dtype=np.float32),
        np.array([[0, 1, 2]], dtype=np.int64),
    )
    return SimpleNamespace(
        embedder=SimpleNamespace(name="fake_embedder"),
        index=index,
        rows=[
            {"image_id": "ROCOv2_2023_train_000001", "path": "a.png", "caption": "A", "cui": "C1"},
            {"image_id": "ROCOv2_2023_train_000002", "path": "b.png", "caption": "B", "cui": "C2"},
            {"image_id": "ROCOv2_2023_train_000003", "path": "c.png", "caption": "C", "cui": "C3"},
        ],
    )


@pytest.fixture()
def service(monkeypatch: pytest.MonkeyPatch) -> SearchService:
    """Search service with Mongo enrichment disabled."""
    monkeypatch.setattr(search_service.MongoResultEnricher, "from_environment", MagicMock(return_value=MagicMock()))
    svc = SearchService(resources={"visual": make_resources(), "semantic": make_resources()})
    svc._result_enricher.enrich.side_effect = lambda results: results
    return svc


def test_static_validation_helpers_delegate_to_validation_module() -> None:
    """Compatibility wrappers expose the centralized validators."""
    assert SearchService._normalize_mode(" VISUAL ") == "visual"
    assert SearchService._validate_text_query(" text ") == "text"
    assert SearchService._validate_selected_image_ids(["ROCOv2_2023_train_000001"]) == [
        "ROCOv2_2023_train_000001"
    ]
    assert SearchService._pick_suffix("scan.JPG") == ".jpg"


def test_get_resources_wraps_loading_failures(monkeypatch: pytest.MonkeyPatch) -> None:
    """Registry failures become SearchUnavailableError."""
    svc = SearchService(resources={})
    svc._resource_registry.get_or_load = MagicMock(side_effect=FileNotFoundError("missing"))

    with pytest.raises(SearchUnavailableError, match="unavailable"):
        svc._get_resources("visual")


def test_downloaded_image_wrapper_delegates_to_image_store(monkeypatch: pytest.MonkeyPatch) -> None:
    """The instance wrapper delegates remote-image context creation."""
    context = object()
    monkeypatch.setattr(search_service, "downloaded_image", MagicMock(return_value=context))
    svc = SearchService(resources={})

    assert svc._downloaded_image("ROCOv2_2023_train_000001") is context
    search_service.downloaded_image.assert_called_once_with("ROCOv2_2023_train_000001")


def test_query_image_path_runs_query_and_enriches(service: SearchService, monkeypatch: pytest.MonkeyPatch) -> None:
    """Image path queries fetch resources, query, then enrich results."""
    raw_results = [{"image_id": "img1"}]
    monkeypatch.setattr(search_service, "query", MagicMock(return_value=raw_results))

    resources, results = service._query_image_path(image_path=Path("query.png"), mode="visual", k=1, exclude_self=True)

    assert resources.embedder.name == "fake_embedder"
    assert results == raw_results
    search_service.query.assert_called_once()
    service._result_enricher.enrich.assert_called_with(raw_results)


def test_build_payload_includes_query_field() -> None:
    """Payload builder applies the requested query field name."""
    payload = SearchService._build_payload(
        mode="visual",
        resources=SimpleNamespace(embedder=SimpleNamespace(name="embedder")),
        query_field="query_image",
        query_value="q.png",
        results=[],
    )

    assert payload == {"mode": "visual", "embedder": "embedder", "query_image": "q.png", "results": []}


def test_search_writes_upload_to_temp_file_and_returns_payload(
    service: SearchService,
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    """Uploaded bytes are written, verified, searched, and returned in a payload."""
    temp_path = tmp_path / "query.png"
    resources = make_resources()
    monkeypatch.setattr(service, "_temporary_image_path", MagicMock(return_value=PathContext(temp_path)))
    monkeypatch.setattr(service, "_verify_image", MagicMock())
    monkeypatch.setattr(service, "_query_image_path", MagicMock(return_value=(resources, [{"image_id": "img1"}])))

    payload = service.search(
        image_bytes=b"png",
        filename="scan.png",
        content_type="image/png",
        mode=" VISUAL ",
        k=1,
    )

    assert temp_path.read_bytes() == b"png"
    assert payload["query_image"] == "scan.png"
    assert payload["mode"] == "visual"
    service._verify_image.assert_called_once_with(temp_path)


def test_search_text_queries_semantic_resources(service: SearchService, monkeypatch: pytest.MonkeyPatch) -> None:
    """Text search always targets the semantic resources."""
    monkeypatch.setattr(search_service, "query_text", MagicMock(return_value=[{"image_id": "img1"}]))

    payload = service.search_text(text=" lung opacity ", k=1)

    assert payload["mode"] == "semantic"
    assert payload["query_text"] == "lung opacity"
    search_service.query_text.assert_called_once()


def test_search_by_id_downloads_image_and_excludes_self(
    service: SearchService,
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    """Search-by-ID downloads the selected image and excludes itself."""
    path = tmp_path / "remote.png"
    monkeypatch.setattr(service, "_downloaded_image", MagicMock(return_value=PathContext(path)))
    resources = make_resources()
    monkeypatch.setattr(service, "_query_image_path", MagicMock(return_value=(resources, [])))

    payload = service.search_by_id(image_id="ROCOv2_2023_train_000001", mode="visual", k=1)

    assert payload["query_image_id"] == "ROCOv2_2023_train_000001"
    service._query_image_path.assert_called_once_with(image_path=path, mode="visual", k=1, exclude_self=True)


def test_search_by_ids_builds_centroid_and_collects_results(
    service: SearchService,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Multi-ID search builds a centroid, normalizes it, and filters selected IDs."""
    centroid = np.array([[1.0, 2.0]], dtype=np.float32)
    build_centroid = MagicMock(return_value=centroid)
    normalize_l2 = MagicMock()
    monkeypatch.setattr(search_service, "build_centroid_embedding", build_centroid)
    monkeypatch.setattr(search_service.faiss_lib, "normalize_L2", normalize_l2)

    payload = service.search_by_ids(
        image_ids=["ROCOv2_2023_train_000001", "ROCOv2_2023_train_000002"],
        mode="visual",
        k=1,
    )

    assert payload["query_image_ids"] == ["ROCOv2_2023_train_000001", "ROCOv2_2023_train_000002"]
    assert payload["results"][0]["image_id"] == "ROCOv2_2023_train_000003"
    build_centroid.assert_called_once()
    normalize_l2.assert_called_once_with(centroid)
