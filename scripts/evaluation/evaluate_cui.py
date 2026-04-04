"""
Ce script évalue la qualité de la récupération en comparant les concepts médicaux (CUI) extraits 
des requêtes et des résultats.
"""

from __future__ import annotations

import argparse
import csv
import json
import random
from datetime import datetime
from pathlib import Path

from mediscan.process import configure_cpu_environment
from mediscan.runtime import resolve_path
from mediscan.search import load_resources, query

configure_cpu_environment()

# Seuils de validation (PASS/FAIL) définis pour les tests de performance
TQ1_SEUILS = {1: 0.80, 2: 0.50, 3: 0.20}
TQ2_SEUILS = {1: 0.30, 2: 0.12, 3: 0.05}


def parse_args() -> argparse.Namespace:
    """
    - Gestion des arguments en ligne de commande (mode, k, nombre de requêtes).
    - Permet de spécifier les ressources à utiliser (embedder, index, ids).
    """
    parser = argparse.ArgumentParser(description="Evaluate TQ1/TQ2 with CUI overlap")
    parser.add_argument("--mode", default="visual", choices=("visual", "semantic"))
    parser.add_argument("--k", type=int, default=10)
    parser.add_argument("--n-queries", type=int, default=100)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--embedder", default=None, help="Optional embedder override")
    parser.add_argument("--model-name", default=None)
    parser.add_argument("--index-path", default=None)
    parser.add_argument("--ids-path", default=None)
    parser.add_argument("--output-dir", default="proofs/perf")
    return parser.parse_args()


def parse_cui(cui_raw: str) -> set[str]:
    """
    - Vérifie que les chaînes CUI (souvent stockées en JSON dans la DB)
      sont correctement transformées en ensembles (set) Python.
    """
    if not cui_raw or not cui_raw.strip():
        return set()
    try:
        parsed = json.loads(cui_raw)
    except (json.JSONDecodeError, TypeError):
        return set()
    if not isinstance(parsed, list):
        return set()
    return {str(item).strip() for item in parsed if item}


def pick_query_rows(
    rows: list[dict[str, str
    ]], n: int, seed: int
) -> list[dict[str, str]]:
    """
    - Sélectionne aléatoirement un lot d'entrées exploitables (ayant des CUI) 
      pour servir de requêtes de test.
    """
    evaluable = [row for row in rows if parse_cui(row.get("cui", ""))]
    if not evaluable:
        raise ValueError("Aucune entrée avec CUI trouvée dans ids.json")
    if n > len(evaluable):
        print(
            f"[WARN] Demandé {n} requêtes mais seulement {len(evaluable)} exploitables. On prend tout."
        )
        n = len(evaluable)
    return random.Random(seed).sample(evaluable, n)


def evaluate(
    query_rows: list[dict[str, str]],
    resources,
    k: int,
) -> tuple[list[dict[str, object]], list[dict[str, object]]]:
    """
    - Vérifie que la fonction d'évaluation délègue correctement à la fonction de recherche
      et que les résultats sont traités pour calculer les métriques de qualité.
    """
    query_results: list[dict[str, object]] = []
    result_details: list[dict[str, object]] = []

    for i, query_row in enumerate(query_rows, start=1):
        image_path = resolve_path(str(query_row.get("path", "")))
        if not image_path.exists():
            print(f"  [{i:03d}] image introuvable : {image_path}, ignorée")
            continue

        cui_query = parse_cui(query_row.get("cui", ""))

        results = query(
            resources=resources,
            image=image_path,
            k=k,
            exclude_self=True,
        )

        commons_per_result: list[int] = []
        for result in results:
            cui_result = parse_cui(result.get("cui", ""))
            common_count = len(cui_query & cui_result)
            commons_per_result.append(common_count)
            result_details.append(
                {
                    "query_id": query_row["image_id"],
                    "result_id": result["image_id"],
                    "score": result["score"],
                    "n_communs": common_count,
                }
            )

        query_results.append(
            {
                "query_id": query_row["image_id"],
                "n_cui_query": len(cui_query),
                "max_communs": max(commons_per_result) if commons_per_result else 0,
            }
        )

        if i % 10 == 0:
            print(f"  Évalué {i}/{len(query_rows)} requêtes...")

    return query_results, result_details


def compute_tq1(query_results: list[dict[str, object]]) -> dict[int, float]:
    """
    - Vérifie que les formules de calcul de précision (TQ1/TQ2) sont correctes.
    - TQ1 mesure la part de requêtes pour lesquelles au moins un résultat partage
        un certain nombre de CUI avec la requête.
    """
    total = len(query_results)
    if total == 0:
        return {threshold: 0.0 for threshold in TQ1_SEUILS}
    return {
        threshold: sum(1 for row in query_results if int(row["max_communs"]) >= threshold)
        / total
        for threshold in TQ1_SEUILS
    }


def compute_tq2(result_details: list[dict[str, object]]) -> dict[int, float]:
    """
    - TQ2 mesure la part de résultats individuels qui partagent un certain nombre de CUI 
      avec leur requête.
    """
    total = len(result_details)
    if total == 0:
        return {threshold: 0.0 for threshold in TQ2_SEUILS}
    return {
        threshold: sum(1 for row in result_details if int(row["n_communs"]) >= threshold)
        / total
        for threshold in TQ2_SEUILS
    }


def print_results(tq1: dict[int, float], tq2: dict[int, float], k: int) -> None:
    """
    - Affiche les résultats de TQ1 et TQ2 avec indication de PASS/FAIL selon les seuils définis.
    """
    print(f"\nTQ1 — Taux de requêtes satisfaites (Top-{k})")
    for threshold, expected in TQ1_SEUILS.items():
        value = tq1[threshold]
        status = "PASS" if value >= expected else "FAIL"
        print(
            f"  >= {threshold} CUI commun(s) : {value:.1%} (seuil >= {expected:.0%}) {status}"
        )

    print(f"\nTQ2 — Part de résultats pertinents (Top-{k})")
    for threshold, expected in TQ2_SEUILS.items():
        value = tq2[threshold]
        status = "PASS" if value >= expected else "FAIL"
        print(
            f"  >= {threshold} CUI commun(s) : {value:.1%} (seuil >= {expected:.0%}) {status}"
        )


def save_csv(
    tq1: dict[int, float],
    tq2: dict[int, float],
    query_results: list[dict[str, object]],
    result_details: list[dict[str, object]],
    output_dir: Path,
    mode: str,
    k: int,
) -> Path:
    """
    - Sauvegarde les mesures détaillées et les stats dans un fichier CSV.
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    csv_path = output_dir / f"cui_quality_{timestamp}.csv"

    with csv_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(["# MEDISCAN AI — Évaluation qualité CUI (TQ1/TQ2)"])
        writer.writerow(["# Mode", mode])
        writer.writerow(["# k", k])
        writer.writerow(["# N requêtes évaluées", len(query_results)])
        writer.writerow(["# N résultats totaux", len(result_details)])
        writer.writerow([])
        writer.writerow(["# TQ1"])
        writer.writerow(["seuil_m", "valeur", "seuil_attendu", "statut"])
        for threshold, expected in TQ1_SEUILS.items():
            value = tq1[threshold]
            writer.writerow([
                f">={threshold}",
                f"{value:.4f}",
                f"{expected:.2f}",
                "PASS" if value >= expected else "FAIL",
            ])
        writer.writerow([])
        writer.writerow(["# TQ2"])
        writer.writerow(["seuil_m", "valeur", "seuil_attendu", "statut"])
        for threshold, expected in TQ2_SEUILS.items():
            value = tq2[threshold]
            writer.writerow([
                f">={threshold}",
                f"{value:.4f}",
                f"{expected:.2f}",
                "PASS" if value >= expected else "FAIL",
            ])
    return csv_path


def main() -> None:
    """
    - Point d'entrée principal : parse les arguments, charge les ressources, sélectionne les requêtes,
      exécute l'évaluation, calcule les métriques et affiche/sauvegarde les résultats.
    """
    args = parse_args()
    if args.k <= 0:
        raise ValueError("--k doit être strictement positif")

    resources = load_resources(
        mode=args.mode,
        embedder=args.embedder,
        model_name=args.model_name,
        index_path=args.index_path,
        ids_path=args.ids_path,
    )
    print(
        f"Index chargé : {resources.index.ntotal} vecteurs, dim={resources.index.d}"
    )

    query_rows = pick_query_rows(resources.rows, args.n_queries, args.seed)
    print(
        f"mode={args.mode} embedder={resources.embedder.name} "
        f"k={args.k} n_queries={len(query_rows)}"
    )

    query_results, result_details = evaluate(query_rows, resources, args.k)
    tq1 = compute_tq1(query_results)
    tq2 = compute_tq2(result_details)
    print_results(tq1, tq2, args.k)

    csv_path = save_csv(
        tq1,
        tq2,
        query_results,
        result_details,
        resolve_path(args.output_dir),
        args.mode,
        args.k,
    )
    print(f"\nRésultats sauvegardés : {csv_path}")


if __name__ == "__main__":
    main()
