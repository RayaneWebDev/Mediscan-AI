"""Tests for retrieval result assembly helpers."""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pytest
from PIL import Image

from mediscan import search as search_module


MAX_K = search_module.MAX_K
SearchResources = search_module.SearchResources
collect_ranked_results = search_module.collect_ranked_results
validate_k = search_module._validate_k


class FakeImageEmbedder:
    """Small image embedder double used by search unit tests."""

    name = "fake-image"
    dim = 2

    def __init__(self) -> None:
        """Track how many PIL images were encoded."""
        self.images_encoded = 0

    def encode_pil(self, image: Image.Image) -> np.ndarray:
        """Return a deterministic image embedding."""
        self.images_encoded += 1
        assert image.mode in {"RGB", "L"}
        return np.array([3.0, 4.0], dtype=np.float32)


class FakeTextEmbedder(FakeImageEmbedder):
    """Image/text embedder double for semantic search tests."""

    name = "fake-text"

    def __init__(self) -> None:
        """Document the __init__ function behavior."""
        super().__init__()
        self.encoded_texts: list[str] = []

    def encode_text(self, text: str) -> np.ndarray:
        """Return a deterministic text embedding and remember the query."""
        self.encoded_texts.append(text)
        return np.array([1.0, 1.0], dtype=np.float32)


class FakeIndex:
    """Minimal FAISS-like index used to test search orchestration."""

    def __init__(
        self,
        *,
        d: int = 2,
        ntotal: int = 3,
        scores: list[float] | None = None,
        indices: list[int] | None = None,
    ) -> None:
        """Document the __init__ function behavior."""
        self.d = d
        self.ntotal = ntotal
        self.scores = scores or [0.9, 0.8, 0.7]
        self.indices = indices or [0, 1, 2]
        self.search_calls: list[tuple[np.ndarray, int]] = []
        self.reconstruct_calls: list[int] = []

    def search(self, query_vector: np.ndarray, search_k: int) -> tuple[np.ndarray, np.ndarray]:
        """Return the configured score/index arrays."""
        self.search_calls.append((query_vector.copy(), search_k))
        return (
            np.array([self.scores[:search_k]], dtype=np.float32),
            np.array([self.indices[:search_k]], dtype=np.int64),
        )

    def reconstruct(self, row_index: int) -> np.ndarray:
        """Return a deterministic indexed vector."""
        self.reconstruct_calls.append(row_index)
        return np.array([0.0, 1.0], dtype=np.float32)


@pytest.fixture
def search_rows() -> list[dict[str, str]]:
    """Representative indexed rows shared by search tests."""
    return [
        {"image_id": "img-1", "path": "img-1.png", "caption": "A", "cui": "C1"},
        {"image_id": "img-2", "path": "img-2.png", "caption": "B", "cui": "C2"},
        {"image_id": "img-3", "path": "img-3.png", "caption": "C", "cui": "C3"},
    ]


def test_search_resources_builds_row_index_by_image_id() -> None:
    """Search resources derive an image-id lookup when none is supplied."""
    resources = SearchResources(
        embedder=None,
        index=object(),
        rows=[{"image_id": "img-1"}, {"image_id": "img-2"}],
    )

    assert resources.row_index_by_image_id == {"img-1": 0, "img-2": 1}


def test_search_resources_preserves_explicit_row_index() -> None:
    """Explicit row indexes are kept unchanged."""
    resources = SearchResources(
        embedder=None,
        index=object(),
        rows=[{"image_id": "img-1"}],
        row_index_by_image_id={"custom": 10},
    )

    assert resources.row_index_by_image_id == {"custom": 10}


def test_validate_k_accepts_supported_range() -> None:
    """k values inside the public range are valid."""
    validate_k(1)
    validate_k(MAX_K)


def test_validate_k_rejects_out_of_range_values() -> None:
    """k values outside the public range are rejected."""
    with pytest.raises(ValueError, match="k must be between"):
        validate_k(0)

    with pytest.raises(ValueError, match="k must be between"):
        validate_k(MAX_K + 1)


def test_collect_ranked_results_skips_negative_indices_and_excluded_ids() -> None:
    """Ranked results are compacted after invalid and excluded candidates."""
    rows = [
        {"image_id": "img-1", "path": "a.png", "caption": "A", "cui": "C1"},
        {"image_id": "img-2", "path": "b.png", "caption": "B", "cui": "C2"},
        {"image_id": "img-3", "path": "c.png", "caption": "C", "cui": "C3"},
    ]

    results = collect_ranked_results(
        rows=rows,
        scores=[0.9, 0.8, 0.7, 0.6],
        indices=[-1, 0, 1, 2],
        k=2,
        excluded_image_ids={"img-1"},
    )

    assert results == [
        {
            "rank": 1,
            "score": 0.7,
            "image_id": "img-2",
            "path": "b.png",
            "caption": "B",
            "cui": "C2",
        },
        {
            "rank": 2,
            "score": 0.6,
            "image_id": "img-3",
            "path": "c.png",
            "caption": "C",
            "cui": "C3",
        },
    ]


def test_collect_ranked_results_skips_excluded_paths(monkeypatch, tmp_path, search_rows) -> None:
    """Path exclusions are resolved before ranking candidates."""
    monkeypatch.setattr(search_module, "resolve_path", lambda path: tmp_path / path)

    results = collect_ranked_results(
        rows=search_rows,
        scores=[0.9, 0.8],
        indices=[0, 1],
        k=1,
        excluded_paths={str((tmp_path / "img-1.png").resolve())},
    )

    assert results[0]["image_id"] == "img-2"


def test_load_resources_builds_resources_with_embedder(monkeypatch, tmp_path, search_rows) -> None:
    """Resource loading wires config, FAISS rows and embedder together."""
    index_path = tmp_path / "index.faiss"
    ids_path = tmp_path / "ids.json"
    fake_index = FakeIndex(ntotal=3)
    thread_calls: list[object] = []
    build_calls: list[tuple[str, str | None]] = []

    monkeypatch.setattr(search_module, "set_faiss_threads", lambda module: thread_calls.append(module))
    monkeypatch.setattr(
        search_module,
        "default_config_for_mode",
        lambda mode: ("default-embedder", index_path, ids_path),
    )
    monkeypatch.setattr(search_module, "default_model_name_for_mode", lambda mode: "default-model")
    monkeypatch.setattr(search_module, "ensure_artifacts_exist", lambda index, ids: (index, ids))
    monkeypatch.setattr(search_module, "load_indexed_rows", lambda ids: search_rows)
    monkeypatch.setattr(search_module.faiss, "read_index", lambda path: fake_index)

    def build_embedder(name: str, model_name: str | None = None) -> FakeImageEmbedder:
        """Record requested embedder arguments and return a fake embedder."""
        build_calls.append((name, model_name))
        return FakeImageEmbedder()

    monkeypatch.setattr(search_module, "build_embedder", build_embedder)

    resources = search_module.load_resources(mode="visual")

    assert thread_calls == [search_module.faiss]
    assert build_calls == [("default-embedder", "default-model")]
    assert resources.index is fake_index
    assert resources.rows == search_rows
    assert resources.embedder.name == "fake-image"
    assert resources.row_index_by_image_id == {"img-1": 0, "img-2": 1, "img-3": 2}


def test_load_resources_can_skip_embedder_loading(monkeypatch, tmp_path, search_rows) -> None:
    """Callers can load only the FAISS index and metadata."""
    fake_index = FakeIndex(ntotal=3)

    monkeypatch.setattr(search_module, "set_faiss_threads", lambda module: None)
    monkeypatch.setattr(
        search_module,
        "default_config_for_mode",
        lambda mode: ("default-embedder", tmp_path / "index.faiss", tmp_path / "ids.json"),
    )
    monkeypatch.setattr(search_module, "default_model_name_for_mode", lambda mode: None)
    monkeypatch.setattr(search_module, "ensure_artifacts_exist", lambda index, ids: (index, ids))
    monkeypatch.setattr(search_module, "load_indexed_rows", lambda ids: search_rows)
    monkeypatch.setattr(search_module.faiss, "read_index", lambda path: fake_index)

    resources = search_module.load_resources(mode="visual", load_embedder=False)

    assert resources.embedder is None
    assert resources.index is fake_index


def test_load_resources_rejects_empty_index(monkeypatch, tmp_path, search_rows) -> None:
    """Empty FAISS indexes cannot serve search results."""
    monkeypatch.setattr(search_module, "set_faiss_threads", lambda module: None)
    monkeypatch.setattr(
        search_module,
        "default_config_for_mode",
        lambda mode: ("embedder", tmp_path / "index.faiss", tmp_path / "ids.json"),
    )
    monkeypatch.setattr(search_module, "default_model_name_for_mode", lambda mode: None)
    monkeypatch.setattr(search_module, "ensure_artifacts_exist", lambda index, ids: (index, ids))
    monkeypatch.setattr(search_module, "load_indexed_rows", lambda ids: search_rows)
    monkeypatch.setattr(search_module.faiss, "read_index", lambda path: FakeIndex(ntotal=0))

    with pytest.raises(RuntimeError, match="FAISS index is empty"):
        search_module.load_resources(mode="visual")


def test_load_resources_rejects_index_ids_mismatch(monkeypatch, tmp_path, search_rows) -> None:
    """The index size and metadata rows must describe the same collection."""
    monkeypatch.setattr(search_module, "set_faiss_threads", lambda module: None)
    monkeypatch.setattr(
        search_module,
        "default_config_for_mode",
        lambda mode: ("embedder", tmp_path / "index.faiss", tmp_path / "ids.json"),
    )
    monkeypatch.setattr(search_module, "default_model_name_for_mode", lambda mode: None)
    monkeypatch.setattr(search_module, "ensure_artifacts_exist", lambda index, ids: (index, ids))
    monkeypatch.setattr(search_module, "load_indexed_rows", lambda ids: search_rows[:2])
    monkeypatch.setattr(search_module.faiss, "read_index", lambda path: FakeIndex(ntotal=3))

    with pytest.raises(RuntimeError, match="Index/IDs mismatch"):
        search_module.load_resources(mode="visual")


def test_load_resources_rejects_embedder_dimension_mismatch(
    monkeypatch,
    tmp_path,
    search_rows,
) -> None:
    """The loaded embedder must match the FAISS index dimension."""
    monkeypatch.setattr(search_module, "set_faiss_threads", lambda module: None)
    monkeypatch.setattr(
        search_module,
        "default_config_for_mode",
        lambda mode: ("embedder", tmp_path / "index.faiss", tmp_path / "ids.json"),
    )
    monkeypatch.setattr(search_module, "default_model_name_for_mode", lambda mode: None)
    monkeypatch.setattr(search_module, "ensure_artifacts_exist", lambda index, ids: (index, ids))
    monkeypatch.setattr(search_module, "load_indexed_rows", lambda ids: search_rows)
    monkeypatch.setattr(search_module.faiss, "read_index", lambda path: FakeIndex(d=3, ntotal=3))
    monkeypatch.setattr(search_module, "build_embedder", lambda name, model_name=None: FakeImageEmbedder())

    with pytest.raises(RuntimeError, match="Index dimension"):
        search_module.load_resources(mode="visual")


def test_query_runs_image_search_and_excludes_self(tmp_path, search_rows) -> None:
    """Image queries encode the file then search enough candidates to skip itself."""
    query_image = tmp_path / "img-1.png"
    Image.new("RGB", (2, 2), color="white").save(query_image)
    fake_index = FakeIndex(scores=[0.9, 0.8], indices=[0, 1])
    fake_embedder = FakeImageEmbedder()
    resources = SearchResources(embedder=fake_embedder, index=fake_index, rows=search_rows)

    results = search_module.query(
        resources=resources,
        image=query_image,
        k=1,
        exclude_self=True,
    )

    assert fake_embedder.images_encoded == 1
    assert fake_index.search_calls[0][1] == 2
    assert results[0]["image_id"] == "img-2"


def test_query_rejects_missing_image(search_rows) -> None:
    """A query image must exist before it can be encoded."""
    resources = SearchResources(embedder=FakeImageEmbedder(), index=FakeIndex(), rows=search_rows)

    with pytest.raises(FileNotFoundError, match="Query image not found"):
        search_module.query(resources=resources, image=Path("missing.png"), k=1)


def test_query_requires_loaded_image_embedder(tmp_path, search_rows) -> None:
    """Image search cannot run with metadata-only resources."""
    query_image = tmp_path / "query.png"
    Image.new("RGB", (2, 2), color="white").save(query_image)
    resources = SearchResources(embedder=None, index=FakeIndex(), rows=search_rows)

    with pytest.raises(RuntimeError, match="Image embedder is not loaded"):
        search_module.query(resources=resources, image=query_image, k=1)


def test_query_from_index_reconstructs_existing_vector_and_excludes_self(search_rows) -> None:
    """Index-backed queries use the stored vector and can skip their own row."""
    fake_index = FakeIndex(scores=[0.9, 0.8], indices=[0, 1])
    resources = SearchResources(embedder=None, index=fake_index, rows=search_rows)

    results = search_module.query_from_index(
        resources=resources,
        image_id=" img-1 ",
        k=1,
        exclude_self=True,
    )

    assert fake_index.reconstruct_calls == [0]
    assert fake_index.search_calls[0][1] == 2
    assert results[0]["image_id"] == "img-2"


def test_query_from_index_rejects_unknown_image_id(search_rows) -> None:
    """The requested indexed image id must exist."""
    resources = SearchResources(embedder=None, index=FakeIndex(), rows=search_rows)

    with pytest.raises(KeyError, match="Image id not found"):
        search_module.query_from_index(resources=resources, image_id="missing", k=1)


def test_query_text_runs_semantic_search(search_rows) -> None:
    """Text queries strip user input and search the semantic index."""
    fake_embedder = FakeTextEmbedder()
    fake_index = FakeIndex(scores=[0.7, 0.6], indices=[2, 1])
    resources = SearchResources(embedder=fake_embedder, index=fake_index, rows=search_rows)

    results = search_module.query_text(resources=resources, text=" lung opacity ", k=2)

    assert fake_embedder.encoded_texts == ["lung opacity"]
    assert fake_index.search_calls[0][1] == 2
    assert [result["image_id"] for result in results] == ["img-3", "img-2"]


def test_query_text_requires_text_capable_embedder(search_rows) -> None:
    """Only embedders with encode_text can serve text queries."""
    resources = SearchResources(embedder=FakeImageEmbedder(), index=FakeIndex(), rows=search_rows)

    with pytest.raises(ValueError, match="does not support encode_text"):
        search_module.query_text(resources=resources, text="lung", k=1)


def test_query_text_rejects_empty_text(search_rows) -> None:
    """Blank text queries are invalid."""
    resources = SearchResources(embedder=FakeTextEmbedder(), index=FakeIndex(), rows=search_rows)

    with pytest.raises(ValueError, match="Query text is empty"):
        search_module.query_text(resources=resources, text="   ", k=1)


def test_search_image_loads_resources_and_returns_embedder_name(monkeypatch, tmp_path, search_rows) -> None:
    """The convenience wrapper returns the selected embedder, image path and results."""
    image_path = tmp_path / "query.png"
    results = [{"image_id": "img-1"}]
    resources = SearchResources(embedder=FakeImageEmbedder(), index=FakeIndex(), rows=search_rows)

    monkeypatch.setattr(search_module, "load_resources", lambda **kwargs: resources)
    monkeypatch.setattr(search_module, "query", lambda **kwargs: results)

    embedder_name, resolved_image, returned_results = search_module.search_image(
        mode="visual",
        image=image_path,
        k=1,
        exclude_self=True,
    )

    assert embedder_name == "fake-image"
    assert resolved_image == str(image_path)
    assert returned_results == results
