"""
Tests unitaires pour l'évaluation typée de MEDISCAN.

Vérifie le calcul des métriques de précision par catégorie médicale :
- TM (Taux Modalité) : Correspondance du type d'examen.
- TA (Taux Anatomie) : Correspondance de la zone corporelle.
- TP (Taux Pathologie/Finding) : Correspondance des observations médicales.
"""

import json
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from PIL import Image

from scripts.evaluation import evaluate_typed as module


# ---------------------------------------------------------------------------
# Fixtures : categories minimales pour les tests
# ---------------------------------------------------------------------------

FAKE_CATEGORIES = {
    "MOD1": {"label_fr": "Radiographie", "type": "modalite"},
    "MOD2": {"label_fr": "Scanner CT",   "type": "modalite"},
    "ANA1": {"label_fr": "Poumon",       "type": "anatomie"},
    "ANA2": {"label_fr": "Pelvis",       "type": "anatomie"},
    "FIN1": {"label_fr": "Implant",      "type": "finding"},
    "FIN2": {"label_fr": "Opacite",      "type": "finding"},
    "VUE1": {"label_fr": "Lateral",      "type": "vue"},
}


# ---------------------------------------------------------------------------
# Tests de split_cui_by_type
# ---------------------------------------------------------------------------

def test_split_cui_by_type_modalite_only():
    """ 
    - Vérifie que la fonction sépare correctement une liste de CUI 
      en groupes (modalité, anatomie, etc.) selon le dictionnaire. 
    """
    result = module.split_cui_by_type({"MOD1", "MOD2"}, FAKE_CATEGORIES)
    assert result["modalite"] == {"MOD1", "MOD2"}
    assert result["anatomie"] == set()
    assert result["finding"] == set()


def test_split_cui_by_type_mixte():
    """ 
    - Vérifie que la fonction gère correctement un ensemble de CUI de types différents.
    """
    result = module.split_cui_by_type({"MOD1", "ANA1", "FIN1"}, FAKE_CATEGORIES)
    assert result["modalite"] == {"MOD1"}
    assert result["anatomie"] == {"ANA1"}
    assert result["finding"] == {"FIN1"}


def test_split_cui_by_type_inconnu_ignore():
    """
    - Vérifie que les CUI inconnus (non présents dans le dictionnaire) sont simplement ignorés.
    """
    result = module.split_cui_by_type({"INCONNU", "MOD1"}, FAKE_CATEGORIES)
    assert result["modalite"] == {"MOD1"}
    assert "INCONNU" not in result["modalite"]


def test_split_cui_by_type_vide():
    """
    - Vérifie que la fonction gère correctement un ensemble de CUI vide,
      en renvoyant des ensembles vides pour chaque catégorie.
    """
    result = module.split_cui_by_type(set(), FAKE_CATEGORIES)
    assert all(len(v) == 0 for v in result.values())


# ---------------------------------------------------------------------------
# Tests de compute_metrics
# ---------------------------------------------------------------------------

def test_compute_metrics_tm_parfait():
    """
    - Tous les resultats ont meme modalite -> TM = 1.0
    """
    query_results = [
        {"hit_modalite": 1, "hit_anatomie": 0, "hit_finding": 0,
         "has_anatomie_cui": 0, "has_finding_cui": 0, "n_results": 2},
        {"hit_modalite": 1, "hit_anatomie": 0, "hit_finding": 0,
         "has_anatomie_cui": 0, "has_finding_cui": 0, "n_results": 2},
    ]
    result_details = [
        {"match_modalite": 1, "match_anatomie": 0, "match_finding": 0,
         "query_has_anatomie": 0, "query_has_finding": 0},
        {"match_modalite": 1, "match_anatomie": 0, "match_finding": 0,
         "query_has_anatomie": 0, "query_has_finding": 0},
    ]
    m = module.compute_metrics(query_results, result_details)
    assert m["TM_requetes"]  == pytest.approx(1.0)
    assert m["TM_resultats"] == pytest.approx(1.0)


def test_compute_metrics_ta_none_si_pas_anatomie():
    """
    - Si aucune requete n'a de CUI anatomie -> TA doit etre None.
    """
    query_results = [
        {"hit_modalite": 1, "hit_anatomie": 0, "hit_finding": 0,
         "has_anatomie_cui": 0, "has_finding_cui": 0, "n_results": 1},
    ]
    result_details = [
        {"match_modalite": 1, "match_anatomie": 0, "match_finding": 0,
         "query_has_anatomie": 0, "query_has_finding": 0},
    ]
    m = module.compute_metrics(query_results, result_details)
    assert m["TA_requetes"]  is None
    assert m["TA_resultats"] is None


def test_compute_metrics_ta_calcule_sur_sous_ensemble():
    """
    - TA calcule uniquement sur les requetes ayant un CUI anatomie.
    """
    query_results = [
        # requete AVEC anatomie -> hit
        {"hit_modalite": 1, "hit_anatomie": 1, "hit_finding": 0,
         "has_anatomie_cui": 1, "has_finding_cui": 0, "n_results": 1},
        # requete SANS anatomie -> ignoree pour TA
        {"hit_modalite": 1, "hit_anatomie": 0, "hit_finding": 0,
         "has_anatomie_cui": 0, "has_finding_cui": 0, "n_results": 1},
    ]
    result_details = [
        {"match_modalite": 1, "match_anatomie": 1, "match_finding": 0,
         "query_has_anatomie": 1, "query_has_finding": 0},
        {"match_modalite": 1, "match_anatomie": 0, "match_finding": 0,
         "query_has_anatomie": 0, "query_has_finding": 0},
    ]
    m = module.compute_metrics(query_results, result_details)
    # 1 requete avec anatomie, hit -> 100%
    assert m["TA_requetes"] == pytest.approx(1.0)
    # 1 resultat eligible sur 1 -> 100%
    assert m["TA_resultats"] == pytest.approx(1.0)


def test_compute_metrics_tp_calcule_sur_sous_ensemble():
    """
    - TP calcule uniquement sur les requetes ayant un CUI finding.
    """
    query_results = [
        {"hit_modalite": 1, "hit_anatomie": 0, "hit_finding": 1,
         "has_anatomie_cui": 0, "has_finding_cui": 1, "n_results": 2},
        {"hit_modalite": 1, "hit_anatomie": 0, "hit_finding": 0,
         "has_anatomie_cui": 0, "has_finding_cui": 1, "n_results": 2},
    ]
    result_details = [
        {"match_modalite": 1, "match_anatomie": 0, "match_finding": 1,
         "query_has_anatomie": 0, "query_has_finding": 1},
        {"match_modalite": 1, "match_anatomie": 0, "match_finding": 0,
         "query_has_anatomie": 0, "query_has_finding": 1},
        {"match_modalite": 1, "match_anatomie": 0, "match_finding": 0,
         "query_has_anatomie": 0, "query_has_finding": 1},
        {"match_modalite": 1, "match_anatomie": 0, "match_finding": 0,
         "query_has_anatomie": 0, "query_has_finding": 1},
    ]
    m = module.compute_metrics(query_results, result_details)
    # 1 requete sur 2 avec finding hit -> 50%
    assert m["TP_requetes"] == pytest.approx(0.5)
    # 1 resultat sur 4 avec finding match -> 25%
    assert m["TP_resultats"] == pytest.approx(0.25)


def test_compute_metrics_vide():
    m = module.compute_metrics([], [])
    assert m == {}


# ---------------------------------------------------------------------------
# Test d'integration : evaluate() avec mock search
# ---------------------------------------------------------------------------

def test_evaluate_integration(tmp_path):
    """
    - Verifie que evaluate() produit les bons flags pour chaque resultat.
    """
    image_path = tmp_path / "query.png"
    Image.new("RGB", (8, 8)).save(image_path)

    query_rows = [
        {
            "image_id": "q1",
            "path": str(image_path),
            # MOD1 = modalite, ANA1 = anatomie
            "cui": json.dumps(["MOD1", "ANA1"]),
        }
    ]

    fake_results = [
        # Meme modalite ET meme anatomie
        {"rank": 1, "image_id": "r1", "score": 0.95,
         "path": "x.png", "caption": "c",
         "cui": json.dumps(["MOD1", "ANA1"])},
        # Meme modalite, anatomie differente
        {"rank": 2, "image_id": "r2", "score": 0.80,
         "path": "y.png", "caption": "c",
         "cui": json.dumps(["MOD1", "ANA2"])},
        # Modalite differente, pas d'anatomie
        {"rank": 3, "image_id": "r3", "score": 0.70,
         "path": "z.png", "caption": "c",
         "cui": json.dumps(["MOD2"])},
    ]

    resources = MagicMock()
    with patch("scripts.evaluation.evaluate_typed.query", return_value=fake_results):
        q_res, r_det = module.evaluate(query_rows, resources, k=3, categories=FAKE_CATEGORIES)

    assert len(q_res) == 1
    assert q_res[0]["hit_modalite"] == 1   # au moins un resultat meme modalite
    assert q_res[0]["hit_anatomie"] == 1   # au moins un resultat meme anatomie
    assert q_res[0]["has_anatomie_cui"] == 1

    assert len(r_det) == 3
    # r1 : meme modalite ET meme anatomie
    assert r_det[0]["match_modalite"] == 1
    assert r_det[0]["match_anatomie"] == 1
    # r2 : meme modalite, anatomie differente
    assert r_det[1]["match_modalite"] == 1
    assert r_det[1]["match_anatomie"] == 0
    # r3 : modalite differente
    assert r_det[2]["match_modalite"] == 0
    assert r_det[2]["match_anatomie"] == 0


# ---------------------------------------------------------------------------
# Test load_categories
# ---------------------------------------------------------------------------

def test_load_categories(tmp_path):
    """
    - Vérifie que le chargement des catégories à partir d'un fichier JSON fonctionne correctement,
      en filtrant les métadonnées et en structurant les données par type.
    """
    fake = {
        "_meta": {"description": "test"},
        "C0040405": {"label_fr": "Scanner CT", "type": "modalite", "freq": 100},
    }
    p = tmp_path / "cat.json"
    p.write_text(json.dumps(fake), encoding="utf-8")
    result = module.load_categories(p)
    assert "_meta" not in result
    assert "C0040405" in result
    assert result["C0040405"]["type"] == "modalite"
