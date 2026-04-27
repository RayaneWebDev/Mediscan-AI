"""Tests for shared runtime helpers."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from mediscan import runtime


def test_resolve_path_returns_absolute_paths_unchanged(tmp_path) -> None:
    """Absolute paths are returned as-is."""
    assert runtime.resolve_path(tmp_path) == tmp_path


def test_resolve_path_uses_base_dir_for_relative_paths(tmp_path) -> None:
    """Relative paths prefer the provided base directory."""
    assert runtime.resolve_path("file.txt", base_dir=tmp_path) == tmp_path / "file.txt"


def test_get_mode_config_accepts_case_and_spaces() -> None:
    """Mode lookup normalizes user input."""
    config = runtime.get_mode_config(" Semantic ")

    assert config.mode == "semantic"
    assert config.embedder == "biomedclip"


def test_get_mode_config_rejects_unknown_modes() -> None:
    """Unknown retrieval modes fail with a clear error."""
    with pytest.raises(ValueError, match="Unsupported mode"):
        runtime.get_mode_config("unknown")


def test_load_indexed_rows_loads_json_list(tmp_path) -> None:
    """Indexed row metadata is loaded from JSON lists."""
    ids_path = tmp_path / "ids.json"
    ids_path.write_text(json.dumps([{"image_id": "img-1"}]), encoding="utf-8")

    assert runtime.load_indexed_rows(ids_path) == [{"image_id": "img-1"}]


def test_load_indexed_rows_rejects_empty_or_non_list_json(tmp_path) -> None:
    """Invalid IDs payloads are rejected before search starts."""
    ids_path = tmp_path / "ids.json"
    ids_path.write_text(json.dumps({}), encoding="utf-8")

    with pytest.raises(RuntimeError, match="expected a JSON list"):
        runtime.load_indexed_rows(ids_path)

    ids_path.write_text(json.dumps([]), encoding="utf-8")

    with pytest.raises(RuntimeError, match="IDs file is empty"):
        runtime.load_indexed_rows(ids_path)


def test_load_indexed_rows_rejects_missing_file(tmp_path) -> None:
    """Missing IDs files fail with a clear error."""
    with pytest.raises(FileNotFoundError, match="IDs file not found"):
        runtime.load_indexed_rows(tmp_path / "missing.json")


def test_ensure_artifacts_exist_returns_resolved_paths(tmp_path) -> None:
    """Existing index and IDs files are resolved together."""
    index_path = tmp_path / "index.faiss"
    ids_path = tmp_path / "ids.json"
    index_path.write_bytes(b"index")
    ids_path.write_text("[]", encoding="utf-8")

    assert runtime.ensure_artifacts_exist(index_path, ids_path) == (index_path, ids_path)


def test_ensure_artifacts_exist_reports_missing_index_or_ids(tmp_path) -> None:
    """Both artifact paths are validated before search starts."""
    index_path = tmp_path / "index.faiss"
    ids_path = tmp_path / "ids.json"

    with pytest.raises(FileNotFoundError, match="FAISS index not found"):
        runtime.ensure_artifacts_exist(index_path, ids_path)

    index_path.write_bytes(b"index")

    with pytest.raises(FileNotFoundError, match="IDs file not found"):
        runtime.ensure_artifacts_exist(index_path, ids_path)


def test_compute_search_k_accounts_for_optional_self_exclusion() -> None:
    """The FAISS candidate count is capped by index size."""
    assert runtime.compute_search_k(5, ntotal=20) == 5
    assert runtime.compute_search_k(5, ntotal=20, exclude_self=True) == 6
    assert runtime.compute_search_k(5, ntotal=3, exclude_self=True) == 3


def test_set_faiss_threads_calls_optional_setter() -> None:
    """FAISS thread configuration is best effort."""
    calls: list[int] = []

    class FakeFaiss:
        """FAISS-like module exposing the optional thread setter."""

        @staticmethod
        def omp_set_num_threads(count: int) -> None:
            """Record the requested OpenMP thread count."""
            calls.append(count)

    runtime.set_faiss_threads(FakeFaiss, count=2)

    assert calls == [2]


def test_set_faiss_threads_ignores_modules_without_setter() -> None:
    """FAISS builds without omp_set_num_threads remain supported."""
    runtime.set_faiss_threads(object(), count=2)


def test_build_embedder_forwards_optional_model_name(monkeypatch) -> None:
    """Embedder construction only forwards model_name when supplied."""
    calls: list[tuple[str, dict[str, object]]] = []

    def fake_get_embedder(name: str, **kwargs: object) -> object:
        """Record factory arguments and return a placeholder embedder."""
        calls.append((name, kwargs))
        return object()

    monkeypatch.setattr(runtime, "get_embedder", fake_get_embedder)

    runtime.build_embedder("visual")
    runtime.build_embedder("semantic", model_name="fake-model")

    assert calls == [
        ("visual", {}),
        ("semantic", {"model_name": "fake-model"}),
    ]


def test_default_config_helpers_return_mode_defaults() -> None:
    """Convenience helpers expose the stable mode configuration."""
    embedder, index_path, ids_path = runtime.default_config_for_mode("visual")

    assert embedder == "dinov2_base"
    assert isinstance(index_path, Path)
    assert isinstance(ids_path, Path)
    assert runtime.default_model_name_for_mode("visual") is None
    assert runtime.stable_manifest_path_for_mode("visual").name == "visual_stable.json"
