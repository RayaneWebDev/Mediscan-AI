"""
Tests d'intégration pour le moteur de recherche MEDISCAN.

Vérifie que la chaîne de traitement (Image -> Vecteur -> Faiss -> Métadonnées)
fonctionne correctement pour les modes visuel et sémantique, et que l'exclusion
de l'image de requête (auto-recherche) est bien gérée.
"""

import json
from pathlib import Path
from unittest.mock import patch

import numpy as np
from PIL import Image

from mediscan import search as search_module
from mediscan.search import SearchResources


class FakeVisualIndex:
    """ 
    - Simule un index Faiss pour DINOv2 (768 dimensions). 
    """
    ntotal = 2
    d = 768

    def search(self, query_vector, search_k):
        assert search_k == 2
        # Renvoie des scores de similarité et des indices factices
        return np.array([[0.99, 0.88]], dtype=np.float32), np.array([[0, 1]], dtype=np.int64)


class FakeSemanticIndex:
    """ 
    - Simule un index Faiss pour BioMedCLIP (512 dimensions). 
    """
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


def make_paths(tmp_path: Path, mode: str) -> tuple[Path, Path, Path]:
    """
    - Crée des fichiers temporaires pour la requête, l'index et les IDs,
        adaptés au mode de recherche (visuel ou sémantique).
    """
    query_path = tmp_path / "query.png"
    result_path = tmp_path / "result.png"
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
    return query_path, index_path, ids_path


def test_search_image_visual_returns_faiss_order(tmp_path):
    """
    - Vérifie que la recherche d'image en mode visuel 
      retourne les résultats dans l'ordre défini par l'index Faiss simulé.
    """
    query_path, index_path, ids_path = make_paths(tmp_path, "visual")

    with patch("mediscan.search.default_config_for_mode", return_value=("dinov2_base", index_path, ids_path)), \
         patch("mediscan.search.build_embedder", return_value=FakeVisualEmbedder()), \
         patch("mediscan.search.faiss.read_index", return_value=FakeVisualIndex()), \
         patch("mediscan.search.faiss.normalize_L2"):
        embedder_name, _, results = search_module.search_image(
            mode="visual",
            image=query_path,
            k=1,
            exclude_self=True,
        )

    assert embedder_name == "dinov2_base"
    assert results[0]["image_id"] == "result"


def test_search_image_semantic_returns_faiss_order(tmp_path):
    """
    - Vérifie que la recherche d'image en mode sémantique
      retourne les résultats dans l'ordre défini par l'index Faiss simulé.
    """
    query_path, index_path, ids_path = make_paths(tmp_path, "semantic")

    with patch("mediscan.search.default_config_for_mode", return_value=("biomedclip", index_path, ids_path)), \
         patch("mediscan.search.build_embedder", return_value=FakeSemanticEmbedder()), \
         patch("mediscan.search.faiss.read_index", return_value=FakeSemanticIndex()), \
         patch("mediscan.search.faiss.normalize_L2"):
        embedder_name, _, results = search_module.search_image(
            mode="semantic",
            image=query_path,
            k=1,
            exclude_self=True,
        )

    assert embedder_name == "biomedclip"
    assert len(results) == 1
    assert results[0]["image_id"] == "result"


class FakeSemanticIndexSingle:
    """
    - Simule un index Faiss pour BioMedCLIP avec un seul résultat (512 dimensions).
    """
    ntotal = 1
    d = 512

    def search(self, query_vector, search_k):
        return np.array([[0.91]], dtype=np.float32), np.array([[0]], dtype=np.int64)


def test_query_with_preloaded_resources(tmp_path):
    """
    - Vérifiez que la fonction query() fonctionne avec des ressources de recherche préchargées.
    """
    query_path = tmp_path / "query.png"
    result_path = tmp_path / "result.png"
    Image.new("RGB", (8, 8)).save(query_path)
    Image.new("RGB", (8, 8)).save(result_path)

    rows = [
        {"image_id": "result", "path": str(result_path), "caption": "test", "cui": "[]"},
    ]
    resources = SearchResources(
        embedder=FakeSemanticEmbedder(),
        index=FakeSemanticIndexSingle(),
        rows=rows,
    )

    with patch("mediscan.search.faiss.normalize_L2"):
        results = search_module.query(resources=resources, image=query_path, k=1)

    assert len(results) == 1
    assert results[0]["image_id"] == "result"
