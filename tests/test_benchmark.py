from pathlib import Path

import pytest
from PIL import Image

from scripts.evaluation import benchmark as module


class FakeEmbedder:
    def encode_pil(self, image):
        import numpy as np

        return np.ones((4,), dtype=np.float32)


class FakeIndex:
    def search(self, vector, k):
        return None


def test_measure_one_query_returns_timings(tmp_path):
    image_path = tmp_path / "query.png"
    Image.new("RGB", (8, 8)).save(image_path)

    result = module.measure_one_query(image_path, FakeEmbedder(), FakeIndex(), k=3)
    assert result["tembed"] >= 0.0
    assert result["tsearch"] >= 0.0
    assert result["te2e"] >= result["tembed"]


def test_compute_stats_and_load_index_missing():
    stats = module.compute_stats([1.0, 2.0, 3.0])
    assert stats["moyenne"] == 2.0
    assert stats["stabilite_ratio"] == 1.0

    with pytest.raises(FileNotFoundError):
        module.load_index(Path("missing.faiss"))
