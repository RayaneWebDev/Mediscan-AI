import numpy as np
import pytest
from PIL import Image

from mediscan.embedders.base import Embedder


class DummyEmbedder(Embedder):
    name = "dummy"
    dim = 4

    def encode_pil(self, image):
        return np.ones(self.dim, dtype=np.float32)


def test_embedder_is_abstract():
    with pytest.raises(TypeError):
        Embedder()


def test_dummy_embedder_encode():
    vector = DummyEmbedder().encode_pil(Image.new("RGB", (32, 32)))
    assert vector.shape == (4,)
    assert vector.dtype == np.float32
