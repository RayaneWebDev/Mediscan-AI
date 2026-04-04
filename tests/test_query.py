"""
Tests unitaires pour le script de requête CLI de MEDISCAN.

Vérifie que la fonction principale 'run_query' transmet correctement tous les 
arguments (mode, chemin d'image, k, etc.) au moteur de recherche interne.
"""

from types import SimpleNamespace
from unittest.mock import patch

from scripts import query as query_module


def test_run_query_forwards_arguments():
    """
    - Vérifie le passage correct des arguments de la ligne de commande à la fonction de recherche d'image.
    """
    args = SimpleNamespace(
        mode="visual",
        image="query.png",
        k=5,
        embedder="dinov2_base",
        model_name="facebook/dinov2-base",
        index_path="artifacts/index.faiss",
        ids_path="artifacts/ids.json",
        exclude_self=True,
    )

    with patch("scripts.query.search_image", return_value=("dinov2_base", "query.png", [])) as mock_search:
        embedder_name, query_image, results = query_module.run_query(args)

    assert embedder_name == "dinov2_base"
    assert query_image == "query.png"
    assert results == []
    mock_search.assert_called_once_with(
        mode="visual",
        image="query.png",
        k=5,
        embedder="dinov2_base",
        model_name="facebook/dinov2-base",
        index_path="artifacts/index.faiss",
        ids_path="artifacts/ids.json",
        exclude_self=True,
    )
