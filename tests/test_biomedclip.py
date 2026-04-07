from types import SimpleNamespace
from unittest.mock import patch

import numpy as np
import torch
from PIL import Image

from mediscan.embedders.biomedclip import BioMedCLIPEmbedder


class FakeBioMedModel:
    def __init__(self) -> None:
        self.visual = SimpleNamespace(output_dim=4)

    def to(self, device):
        return self

    def eval(self):
        return self

    def encode_image(self, input_tensor):
        return torch.tensor([[1.0, 2.0, 3.0, 4.0]], dtype=torch.float32)


def test_biomedclip_embedding_shape():
    fake_model = FakeBioMedModel()

    with patch(
        "mediscan.embedders.biomedclip.open_clip.create_model_and_transforms",
        return_value=(fake_model, None, lambda image: torch.ones((3, 2, 2), dtype=torch.float32)),
    ), patch(
        "mediscan.embedders.biomedclip.open_clip.get_tokenizer",
        return_value=lambda texts: torch.ones((len(texts), 4), dtype=torch.int64),
    ):
        embedder = BioMedCLIPEmbedder(model_name="hf-hub:test")

    vector = embedder.encode_pil(Image.new("RGB", (224, 224), color=(255, 0, 0)))
    assert vector.shape == (embedder.dim,)
    assert np.isfinite(vector).all()
    np.testing.assert_almost_equal(np.linalg.norm(vector), 1.0, decimal=5)
