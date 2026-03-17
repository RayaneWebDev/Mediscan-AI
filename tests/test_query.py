import json
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

import numpy as np

from scripts import query as query_module


class FakeVisualIndex:
    ntotal = 2
    d = 768

    def search(self, query_vector, search_k):
        assert search_k == 2
        return np.array([[0.99, 0.88]], dtype=np.float32), np.array([[0, 1]], dtype=np.int64)


class FakeSemanticIndex:
    ntotal = 2
    d = 512

    def search(self, query_vector, search_k):
        assert search_k == 2
        return np.array([[0.91]], dtype=np.float32), np.array([[1]], dtype=np.int64)


class FakeVisualEmbedder:
    name = "dinov2_base"
    dim = 768

    def encode_pil(self, image):
        return np.ones((768,), dtype=np.float32)


class FakeSemanticEmbedder:
    name = "biomedclip"
    dim = 512

    def encode_pil(self, image):
        return np.ones((512,), dtype=np.float32)


def make_args(tmp_path: Path, mode: str) -> SimpleNamespace:
    query_path = tmp_path / "query.png"
    result_path = tmp_path / "result.png"
    from PIL import Image

    Image.new("RGB", (8, 8)).save(query_path)
    Image.new("RGB", (8, 8)).save(result_path)

    index_name = "index.faiss" if mode == "visual" else "index_semantic.faiss"
    ids_name = "ids.json" if mode == "visual" else "ids_semantic.json"
    index_path = tmp_path / index_name
    ids_path = tmp_path / ids_name
    index_path.write_bytes(b"index")
    ids_path.write_text(
        json.dumps(
            [
                {"image_id": "query", "path": str(query_path), "caption": "query", "cui": "[]"},
                {"image_id": "result", "path": str(result_path), "caption": "result", "cui": "[]"},
            ]
        ),
        encoding="utf-8",
    )

    return SimpleNamespace(
        mode=mode,
        embedder=None,
        model_name=None,
        index_path=None,
        ids_path=None,
        image=str(query_path),
        k=1,
        exclude_self=True,
    )


def test_run_query_visual_reranks(tmp_path):
    args = make_args(tmp_path, "visual")
    index_path = tmp_path / "index.faiss"
    ids_path = tmp_path / "ids.json"

    with patch("scripts.query.default_config_for_mode", return_value=("dinov2_base", index_path, ids_path)), \
         patch("scripts.query.build_embedder", return_value=FakeVisualEmbedder()), \
         patch("scripts.query.faiss.read_index", return_value=FakeVisualIndex()), \
         patch("scripts.query.faiss.normalize_L2"), \
         patch("scripts.query.rerank_visual_results", return_value=[{"rank": 1, "image_id": "result", "path": "x.png", "score": 0.5, "caption": "c", "cui": "[]"}]) as rerank:
        embedder_name, _, results = query_module.run_query(args)

    assert embedder_name == "dinov2_base"
    assert results[0]["image_id"] == "result"
    rerank.assert_called_once()


def test_run_query_semantic_returns_faiss_order(tmp_path):
    args = make_args(tmp_path, "semantic")
    index_path = tmp_path / "index_semantic.faiss"
    ids_path = tmp_path / "ids_semantic.json"

    with patch("scripts.query.default_config_for_mode", return_value=("biomedclip", index_path, ids_path)), \
         patch("scripts.query.build_embedder", return_value=FakeSemanticEmbedder()), \
         patch("scripts.query.faiss.read_index", return_value=FakeSemanticIndex()), \
         patch("scripts.query.faiss.normalize_L2"), \
         patch("scripts.query.rerank_visual_results") as rerank:
        embedder_name, _, results = query_module.run_query(args)

    assert embedder_name == "biomedclip"
    assert len(results) == 1
    assert results[0]["image_id"] == "result"
    rerank.assert_not_called()
