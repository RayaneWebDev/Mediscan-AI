import json
from pathlib import Path
from unittest.mock import patch

import pytest

from mediscan import runtime


def test_default_config_for_mode():
    embedder, index_path, ids_path = runtime.default_config_for_mode("visual")
    assert embedder == "dinov2_base"
    assert index_path.name == "index.faiss"
    assert ids_path.name == "ids.json"

    embedder, index_path, ids_path = runtime.default_config_for_mode("semantic")
    assert embedder == "biomedclip"
    assert index_path.name == "index_semantic.faiss"
    assert ids_path.name == "ids_semantic.json"


@patch("mediscan.runtime.get_embedder")
def test_build_embedder_forwards_model_name(mock_get):
    mock_get.return_value = "embedder"
    embedder = runtime.build_embedder("biomedclip", model_name="hf-hub:test")
    assert embedder == "embedder"
    mock_get.assert_called_once_with("biomedclip", model_name="hf-hub:test")


def test_load_indexed_rows(tmp_path):
    ids_path = tmp_path / "ids.json"
    ids_path.write_text(json.dumps([{"image_id": "a", "path": "x.png"}]), encoding="utf-8")
    rows = runtime.load_indexed_rows(ids_path)
    assert rows[0]["image_id"] == "a"


def test_load_indexed_rows_rejects_invalid_data(tmp_path):
    ids_path = tmp_path / "ids.json"
    ids_path.write_text('{"bad": true}', encoding="utf-8")
    with pytest.raises(RuntimeError):
        runtime.load_indexed_rows(ids_path)


def test_compute_search_k():
    assert runtime.compute_search_k("dinov2_base", k=10, ntotal=200) == 120
    assert runtime.compute_search_k("biomedclip", k=10, ntotal=100) == 10
    assert runtime.compute_search_k("biomedclip", k=10, ntotal=100, exclude_self=True) == 20
