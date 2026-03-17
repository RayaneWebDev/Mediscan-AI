from pathlib import Path
from unittest.mock import patch

import numpy as np
from PIL import Image

from scripts.evaluation import evaluate_cui as module


class FakeVisualEmbedder:
    name = "dinov2_base"
    dim = 768

    def encode_pil(self, image):
        return np.ones((768,), dtype=np.float32)


class FakeIndex:
    ntotal = 2

    def search(self, query_vector, search_k):
        assert search_k == 2
        return np.array([[0.9, 0.8]], dtype=np.float32), np.array([[0, 1]], dtype=np.int64)


def test_parse_cui_and_metrics():
    assert module.parse_cui('"bad"') == set()
    assert module.parse_cui('["C1", "C2"]') == {"C1", "C2"}
    assert module.compute_tq1([{"max_communs": 2}, {"max_communs": 0}]) == {1: 0.5, 2: 0.5, 3: 0.0}
    assert module.compute_tq2([{"n_communs": 1}, {"n_communs": 3}]) == {1: 1.0, 2: 0.5, 3: 0.5}


def test_run_query_visual_uses_reranking(tmp_path):
    image_path = tmp_path / "query.png"
    Image.new("RGB", (8, 8)).save(image_path)
    ids = [{"path": str(image_path)}, {"path": str(image_path)}]

    with patch("scripts.evaluation.evaluate_cui.faiss.normalize_L2"), \
         patch("scripts.evaluation.evaluate_cui.rerank_visual_results", return_value=[{"index": 1, "score": 0.5}]) as rerank:
        indices, scores = module.run_query(image_path, FakeVisualEmbedder(), FakeIndex(), ids, k=1)

    assert indices == [1]
    assert scores == [0.5]
    rerank.assert_called_once()
