from pathlib import Path
from unittest.mock import patch

import numpy as np
from PIL import Image

from scripts.visualization import demo_dual_mode_grid as demo


class FakeRecord:
    def __init__(self, image_id: str, caption: str, path: str, cui: str = "[]"):
        self.image_id = image_id
        self.caption = caption
        self.path = path
        self.cui = cui


class FakeEmbedder:
    dim = 768

    def encode_pil(self, image):
        return np.ones((768,), dtype=np.float32)


class FakeIndex:
    d = 768
    ntotal = 1

    def search(self, x, k):
        return np.array([[0.9]], dtype=np.float32), np.array([[0]], dtype=np.int64)


def test_auto_choose_query_prefers_expected_records():
    visual_record, _ = demo.auto_choose_query(
        [
            FakeRecord("sem", "Head CT demonstrating hemorrhage", "a.png", '["C1"]'),
            FakeRecord("vis", "Chest radiograph postero-anterior view", "b.png", '["C2"]'),
        ],
        mode="visual",
    )
    semantic_record, _ = demo.auto_choose_query(
        [
            FakeRecord("vis", "Chest radiograph postero-anterior view", "b.png", '["C2"]'),
            FakeRecord("sem", "Head CT demonstrating hemorrhage and aneurysm", "a.png", '["C1", "C3"]'),
        ],
        mode="semantic",
    )

    assert visual_record.image_id == "vis"
    assert semantic_record.image_id == "sem"


def test_run_image_search_visual_reranks(tmp_path):
    image_path = tmp_path / "query.png"
    Image.new("RGB", (8, 8)).save(image_path)

    (tmp_path / "index.faiss").write_bytes(b"index")

    with patch("scripts.visualization.demo_dual_mode_grid.build_embedder", return_value=FakeEmbedder()), \
         patch("scripts.visualization.demo_dual_mode_grid.faiss.read_index", return_value=FakeIndex()), \
         patch("scripts.visualization.demo_dual_mode_grid.faiss.normalize_L2"), \
         patch("scripts.visualization.demo_dual_mode_grid.load_indexed_rows", return_value=[{"image_id": "other", "path": str(image_path), "caption": "x", "cui": "[]"}]), \
         patch("scripts.visualization.demo_dual_mode_grid.rerank_visual_results", return_value=[{"image_id": "other", "path": str(image_path), "score": 0.5, "caption": "x", "cui": "[]"}]) as rerank:
        results = demo.run_image_search(
            query_record=FakeRecord("query", "caption", str(image_path)),
            query_image=image_path,
            embedder_name="dinov2_base",
            model_name=None,
            index_path=tmp_path / "index.faiss",
            ids_path=tmp_path / "ids.json",
            k=1,
        )

    assert results[0]["image_id"] == "other"
    rerank.assert_called_once()
