import numpy as np
from PIL import Image

from mediscan.embedders.biomedclip import BioMedCLIPEmbedder


def test_biomedclip_embedding_shape():
    embedder = BioMedCLIPEmbedder()
    vector = embedder.encode_pil(Image.new("RGB", (224, 224), color=(255, 0, 0)))
    assert vector.shape == (embedder.dim,)
    assert np.isfinite(vector).all()
    np.testing.assert_almost_equal(np.linalg.norm(vector), 1.0, decimal=5)
