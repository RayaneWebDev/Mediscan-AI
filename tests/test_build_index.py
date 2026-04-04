"""
Tests unitaires pour le script de construction d'index (Indexing).

Vérifie la création de l'index Faiss, l'export des métadonnées JSON 
et la capacité du script à reprendre une indexation via des checkpoints.
"""

from types import SimpleNamespace
from unittest.mock import patch

import json
import numpy as np
from PIL import Image

from scripts import build_index


class Record:
    """ 
    - Simule un enregistrement du dataset ROCO (ID image + chemin). 
    """
    def __init__(self, image_id: str, path: str):
        self.image_id = image_id
        self.path = path
        self.caption = "caption"
        self.cui = "[]"

    def to_dict(self):
        """ 
        - Convertit l'objet en dictionnaire pour l'export JSON. 
        """
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
    """
    - Vérifie que le script construit un index Faiss et un fichier JSON d'IDs à partir d'un dataset simulé.
    """
    image_path = tmp_path / "image.png"
    Image.new("RGB", (8, 8)).save(image_path)

    args = SimpleNamespace(
        embedder="dinov2_base",
        model_name=None,
        metadata="unused.csv",
        index_path=str(tmp_path / "index.faiss"),
        ids_path=str(tmp_path / "ids.json"),
        checkpoint_prefix=None,
        checkpoint_every=0,
    )
    dataset = [Record("img1", str(image_path)), Record("img2", str(image_path))]

    with patch("scripts.build_index.parse_args", return_value=args), \
         patch("scripts.build_index.RocoDataset", return_value=dataset), \
         patch("scripts.build_index.build_embedder", return_value=FakeEmbedder()), \
         patch("scripts.build_index.faiss.write_index") as write_index:
        build_index.main()

    ids_path = tmp_path / "ids.json"
    rows = json.loads(ids_path.read_text(encoding="utf-8"))
    assert len(rows) == 2
    write_index.assert_called_once()


def test_main_resumes_from_checkpoint(tmp_path):
    """
    - Vérifie que le script peut reprendre une indexation à partir d'un checkpoint.
    """
    image_path = tmp_path / "image.png"
    Image.new("RGB", (8, 8)).save(image_path)

    metadata_path = tmp_path / "metadata.csv"
    metadata_path.write_text("image_id,path,caption,cui\n", encoding="utf-8")
    checkpoint_prefix = tmp_path / "checkpoint_shard_01"

    np.save(f"{checkpoint_prefix}.vectors.npy", np.ones((1, 4), dtype=np.float32))
    (tmp_path / "checkpoint_shard_01.ids.json").write_text(
        json.dumps([Record("img1", str(image_path)).to_dict()], ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (tmp_path / "checkpoint_shard_01.meta.json").write_text(
        json.dumps(
            {
                "embedder": "dinov2_base",
                "dim": 4,
                "metadata_path": str(metadata_path),
                "processed_records": 1,
                "indexed": 1,
                "skipped": 0,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    args = SimpleNamespace(
        embedder="dinov2_base",
        model_name=None,
        metadata=str(metadata_path),
        index_path=str(tmp_path / "index.faiss"),
        ids_path=str(tmp_path / "ids.json"),
        checkpoint_prefix=str(checkpoint_prefix),
        checkpoint_every=1,
    )
    dataset = [Record("img1", str(image_path)), Record("img2", str(image_path))]
    fake_embedder = FakeEmbedder()

    with patch("scripts.build_index.parse_args", return_value=args), \
         patch("scripts.build_index.RocoDataset", return_value=dataset), \
         patch("scripts.build_index.build_embedder", return_value=fake_embedder), \
         patch("scripts.build_index.faiss.write_index") as write_index, \
         patch.object(fake_embedder, "encode_pil", wraps=fake_embedder.encode_pil) as encode_pil:
        build_index.main()

    rows = json.loads((tmp_path / "ids.json").read_text(encoding="utf-8"))
    assert len(rows) == 2
    assert encode_pil.call_count == 1
    write_index.assert_called_once()
