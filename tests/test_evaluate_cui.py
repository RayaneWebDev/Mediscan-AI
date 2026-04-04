"""
Tests unitaires pour l'évaluation de la pertinence sémantique (CUI).

Vérifie l'extraction des concepts médicaux (UMLS CUI), ainsi que le calcul 
des métriques de précision TQ1 (Taux de Qualité 1) et TQ2 (Taux de Qualité 2).
"""

from pathlib import Path
from unittest.mock import patch, MagicMock

import numpy as np
from PIL import Image

from scripts.evaluation import evaluate_cui as module


def test_parse_cui_and_metrics():
    """
    - Vérifie que les chaînes CUI (souvent stockées en JSON dans la DB) 
      sont correctement transformées en ensembles (set) Python.
    - Teste les formules de calcul de précision (TQ1/TQ2).
    """
    assert module.parse_cui('"bad"') == set()
    assert module.parse_cui('["C1", "C2"]') == {"C1", "C2"}
    assert module.compute_tq1([{"max_communs": 2}, {"max_communs": 0}]) == {1: 0.5, 2: 0.5, 3: 0.0}
    assert module.compute_tq2([{"n_communs": 1}, {"n_communs": 3}]) == {1: 1.0, 2: 0.5, 3: 0.5}


def test_evaluate_uses_search_query(tmp_path):
    """
    - Vérifie que la fonction d'évaluation délègue correctement à la fonction de recherche 
      et que les résultats sont traités pour calculer les métriques de qualité.
    """
    image_path = tmp_path / "query.png"
    Image.new("RGB", (8, 8)).save(image_path)

    query_rows = [
        {"image_id": "q1", "path": str(image_path), "cui": '["C1", "C2"]'},
    ]
    fake_results = [
        {"rank": 1, "image_id": "r1", "score": 0.9, "path": "x.png", "caption": "c", "cui": '["C1"]'},
        {"rank": 2, "image_id": "r2", "score": 0.8, "path": "y.png", "caption": "c", "cui": '["C3"]'},
    ]
    resources = MagicMock()

    with patch("scripts.evaluation.evaluate_cui.query", return_value=fake_results) as mock_query:
        query_results, result_details = module.evaluate(query_rows, resources, k=2)

    mock_query.assert_called_once()
    assert len(query_results) == 1
    assert query_results[0]["max_communs"] == 1
    assert len(result_details) == 2
    assert result_details[0]["n_communs"] == 1
    assert result_details[1]["n_communs"] == 0
