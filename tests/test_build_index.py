from types import SimpleNamespace
from unittest.mock import patch

import json
import numpy as np
from PIL import Image

from scripts import build_index


class Record:
    def __init__(self, image_id: str, path: str):
        self.image_id = image_id
        self.path = path
        self.caption = "caption"
        self.cui = "[]"

    def to_dict(self):
        return {
            "image_id": self.image_id,
            "path": self.path,
            "caption": self.caption,
            "cui": self.cui,
        }


class FakeEmbedder:
    dim = 4

    def encode_pil(self, image):
        return np.ones((4,), dtype=np.float32)


def test_main_builds_index_and_ids(tmp_path):
    image_path = tmp_path / "image.png"
    Image.new("RGB", (8, 8)).save(image_path)

    args = SimpleNamespace(
        embedder="dinov2_base",
        model_name=None,
        metadata="unused.csv",
        index_path=str(tmp_path / "index.faiss"),
        ids_path=str(tmp_path / "ids.json"),
    )
    dataset = [Record("img1", str(image_path)), Record("img2", str(image_path))]

    with patch("scripts.build_index.parse_args", return_value=args), \
         patch("scripts.build_index.RocoSmallDataset", return_value=dataset), \
         patch("scripts.build_index.build_embedder", return_value=FakeEmbedder()), \
         patch("scripts.build_index.faiss.write_index") as write_index:
        build_index.main()

    ids_path = tmp_path / "ids.json"
    rows = json.loads(ids_path.read_text(encoding="utf-8"))
    assert len(rows) == 2
    write_index.assert_called_once()
