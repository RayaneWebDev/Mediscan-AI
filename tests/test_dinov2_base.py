import numpy as np
from PIL import Image

from mediscan.embedders.dinov2_base import DINOv2BaseEmbedder


def test_dinov2_embedding_shape():
    embedder = DINOv2BaseEmbedder()
    vector = embedder.encode_pil(Image.new("RGB", (224, 224), color=(0, 255, 0)))
    assert vector.shape == (embedder.dim,)
    assert np.isfinite(vector).all()
    np.testing.assert_almost_equal(np.linalg.norm(vector), 1.0, decimal=5)
