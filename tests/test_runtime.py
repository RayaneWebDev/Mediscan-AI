"""
Tests unitaires pour le module Runtime de MEDISCAN.

Vérifie la gestion des configurations par défaut, le chargement sécurisé
des données indexées et la logique de calcul des paramètres de recherche (k).
"""

import json
from pathlib import Path
from unittest.mock import patch

import pytest

from mediscan import runtime


def test_default_config_for_mode():
    """
    - Vérifie que la fonction retourne les configurations par défaut correctes 
      pour les modes "visual" et "semantic".
    """
    embedder, index_path, ids_path = runtime.default_config_for_mode("visual")
    assert embedder == "dinov2_base"
    assert index_path.name == "index.faiss"
    assert ids_path.name == "ids.json"

    embedder, index_path, ids_path = runtime.default_config_for_mode("semantic")
    assert embedder == "biomedclip"
    assert index_path.name == "index_semantic.faiss"
    assert ids_path.name == "ids_semantic.json"


def test_default_model_name_for_mode():
    assert runtime.default_model_name_for_mode("visual") is None
    assert runtime.default_model_name_for_mode("semantic") == "hf-hub:Ozantsk/biomedclip-rocov2-finetuned"


def test_get_mode_config_and_manifest_path():
    """
    - Vérifie que les configurations spécifiques au mode sont correctes 
      et que les chemins des manifests stables sont résolus correctement.
    """
    visual_config = runtime.get_mode_config("visual")
    assert visual_config.embedder == "dinov2_base"
    assert visual_config.manifest_path.name == "visual_stable.json"
    assert runtime.stable_manifest_path_for_mode("semantic").name == "semantic_stable.json"


@patch("mediscan.runtime.get_embedder")
def test_build_embedder_forwards_model_name(mock_get):
    """
    - Vérifie que la fonction forwards le nom du modèle au bon embedder.
    """
    mock_get.return_value = "embedder"
    embedder = runtime.build_embedder("biomedclip", model_name="hf-hub:test")
    assert embedder == "embedder"
    mock_get.assert_called_once_with("biomedclip", model_name="hf-hub:test")


def test_load_indexed_rows(tmp_path):
    """
    - Vérifie que les données indexées sont chargées correctement à partir d'un fichier JSON.
    """
    ids_path = tmp_path / "ids.json"
    ids_path.write_text(json.dumps([{"image_id": "a", "path": "x.png"}]), encoding="utf-8")
    rows = runtime.load_indexed_rows(ids_path)
    assert rows[0]["image_id"] == "a"


def test_load_indexed_rows_rejects_invalid_data(tmp_path):
    """
    - Vérifie que les données indexées invalides sont rejetées.
    """
    ids_path = tmp_path / "ids.json"
    ids_path.write_text('{"bad": true}', encoding="utf-8")
    with pytest.raises(RuntimeError):
        runtime.load_indexed_rows(ids_path)


def test_ensure_artifacts_exist(tmp_path):
    """
    - Vérifie que les chemins des artefacts d'index et d'IDs sont vérifiés et résolus correctement.
    """
    index_path = tmp_path / "index.faiss"
    ids_path = tmp_path / "ids.json"
    index_path.write_bytes(b"index")
    ids_path.write_text("[]", encoding="utf-8")
    resolved_index, resolved_ids = runtime.ensure_artifacts_exist(index_path, ids_path)
    assert resolved_index == index_path
    assert resolved_ids == ids_path


def test_compute_search_k():
    """
    - Vérifie l'ajustement dynamique du nombre de résultats (k)
    """
    assert runtime.compute_search_k(k=10, ntotal=200) == 10
    assert runtime.compute_search_k(k=10, ntotal=5) == 5
    assert runtime.compute_search_k(k=10, ntotal=200, exclude_self=True) == 11
