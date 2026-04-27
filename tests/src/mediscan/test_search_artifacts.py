"""Artifact-backed tests for the real FAISS indexes shipped with the project."""

from __future__ import annotations

import json

import pytest

from mediscan.runtime import PROJECT_ROOT, get_mode_config, load_indexed_rows
from mediscan.search import load_resources, query_from_index


pytestmark = pytest.mark.integration
EXPECTED_INDEX_DIMENSIONS = {"visual": 768, "semantic": 512}


def test_visual_artifacts_load_without_embedder() -> None:
    """The visual FAISS index and ids file are readable and size-compatible."""
    resources = load_resources(mode="visual", load_embedder=False)

    assert resources.embedder is None
    assert resources.index.ntotal == len(resources.rows)
    assert resources.index.ntotal > 0
    assert resources.row_index_by_image_id


def test_semantic_artifacts_load_without_embedder() -> None:
    """The semantic FAISS index and ids file are readable and size-compatible."""
    resources = load_resources(mode="semantic", load_embedder=False)

    assert resources.embedder is None
    assert resources.index.ntotal == len(resources.rows)
    assert resources.index.ntotal > 0
    assert resources.row_index_by_image_id


@pytest.mark.parametrize("mode", sorted(EXPECTED_INDEX_DIMENSIONS))
def test_declared_artifact_files_exist_for_mode(mode: str) -> None:
    """Every supported mode points to committed FAISS, ids, and manifest files."""
    config = get_mode_config(mode)

    assert config.index_path.is_file()
    assert config.ids_path.is_file()
    assert config.manifest_path.is_file()
    assert config.index_path.is_relative_to(PROJECT_ROOT / "artifacts")
    assert config.ids_path.is_relative_to(PROJECT_ROOT / "artifacts")
    assert config.manifest_path.is_relative_to(PROJECT_ROOT / "artifacts" / "manifests")


@pytest.mark.parametrize("mode", sorted(EXPECTED_INDEX_DIMENSIONS))
def test_ids_file_matches_faiss_index_size_and_dimension(mode: str) -> None:
    """The real ids JSON has one unique row per FAISS vector and the expected dimension."""
    config = get_mode_config(mode)
    resources = load_resources(mode=mode, load_embedder=False)
    ids_rows = load_indexed_rows(config.ids_path)
    image_ids = [str(row.get("image_id", "")) for row in ids_rows]

    assert ids_rows == resources.rows
    assert resources.index.ntotal == len(ids_rows)
    assert resources.index.d == EXPECTED_INDEX_DIMENSIONS[mode]
    assert len(image_ids) == len(set(image_ids))
    assert all(image_ids)
    assert resources.row_index_by_image_id == {
        image_id: row_index for row_index, image_id in enumerate(image_ids)
    }


@pytest.mark.parametrize("mode", sorted(EXPECTED_INDEX_DIMENSIONS))
def test_stable_manifest_matches_current_artifacts(mode: str) -> None:
    """Stable manifests stay synchronized with the FAISS index and ids JSON."""
    config = get_mode_config(mode)
    resources = load_resources(mode=mode, load_embedder=False)
    manifest = json.loads(config.manifest_path.read_text(encoding="utf-8"))

    assert manifest["mode"] == mode
    assert manifest["embedder"] == config.embedder
    assert manifest["index_path"] == str(config.index_path.relative_to(PROJECT_ROOT))
    assert manifest["ids_path"] == str(config.ids_path.relative_to(PROJECT_ROOT))
    assert manifest["ntotal"] == resources.index.ntotal
    assert manifest["dim"] == resources.index.d
    assert manifest["status"] == "validated"


def test_query_from_real_visual_index_returns_results() -> None:
    """A stored visual vector can be reconstructed and searched in the real index."""
    resources = load_resources(mode="visual", load_embedder=False)
    image_id = str(resources.rows[0]["image_id"])

    results = query_from_index(resources=resources, image_id=image_id, k=3, exclude_self=True)

    assert 1 <= len(results) <= 3
    assert all(result["image_id"] != image_id for result in results)
    assert [result["rank"] for result in results] == list(range(1, len(results) + 1))
