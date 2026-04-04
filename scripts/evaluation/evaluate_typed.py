"""
Évalue la qualité de la récupération avec des métriques CUI typées (TM / TA / TP).

TM — Taux Modalite   : le modele retrouve-t-il le meme type d'examen ?
TA — Taux Anatomie   : le modele retrouve-t-il la meme region du corps ?
TP — Taux Pathologie : le modele retrouve-t-il le meme finding/pathologie ?

Mode visuel   (DINOv2)     -> evalue TM + TA  (forme/structure)
Mode semantique (BiomedCLIP) -> evalue TM + TP  (sens medical)
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

# ---------------------------------------------------------------------------
# Seuils attendus par metrique et par mode
# ---------------------------------------------------------------------------
SEUILS = {
    "visual": {
        "TM_requetes":   0.90,   # >=90% des requetes trouvent meme modalite
        "TM_resultats":  0.80,   # >=80% des resultats ont meme modalite
        "TA_requetes":   0.70,   # >=70% des requetes (avec anatomie) trouvent meme anatomie
        "TA_resultats":  0.50,   # >=50% des resultats partagent meme anatomie
    },
    "semantic": {
        "TM_requetes":   0.80,   # BiomedCLIP doit aussi retrouver la meme modalite
        "TM_resultats":  0.65,
        "TP_requetes":   0.50,   # >=50% des requetes (avec finding) trouvent meme pathologie
        "TP_resultats":  0.30,   # >=30% des resultats partagent meme finding
    },
}

CATEGORIES_PATH = Path("artifacts/cui_categories.json")


# ---------------------------------------------------------------------------
# Chargement des categories
# ---------------------------------------------------------------------------

def load_categories(path: Path = CATEGORIES_PATH) -> dict[str, dict]:
    """Charge cui_categories.json et retourne un dict CUI -> info."""
    with path.open(encoding="utf-8") as f:
        raw = json.load(f)
    return {k: v for k, v in raw.items() if not k.startswith("_")}


def split_cui_by_type(
    cuis: set[str],
    categories: dict[str, dict],
) -> dict[str, set[str]]:
    """
    - Décompose un ensemble de CUI en sous-ensembles par type.

    Returns:
        {"modalite": {...}, "anatomie": {...}, "finding": {...}, "vue": {...}}
    """
    result: dict[str, set[str]] = {
        "modalite": set(),
        "anatomie": set(),
        "finding": set(),
        "vue": set(),
    }
    for cui in cuis:
        if cui in categories:
            t = categories[cui]["type"]
            result[t].add(cui)
    return result


# ---------------------------------------------------------------------------
# Parsing CUI
# ---------------------------------------------------------------------------

def parse_cui(cui_raw: str) -> set[str]:
    """
    - Parse une chaîne brute de CUI (souvent stockée en JSON dans la DB)
        et retourne un ensemble de CUI nettoyé.
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


# ---------------------------------------------------------------------------
# Selection des requetes
# ---------------------------------------------------------------------------

def pick_query_rows(
    rows: list[dict],
    n: int,
    seed: int,
) -> list[dict]:
    """
    - Sélectionne aléatoirement un lot d'entrées exploitables (ayant des CUI)
      pour servir de requêtes de test.
    """
    evaluable = [r for r in rows if parse_cui(r.get("cui", ""))]
    if not evaluable:
        raise ValueError("Aucune entree avec CUI trouvee dans ids.json")
    if n > len(evaluable):
        print(f"[WARN] Demande {n} requetes mais seulement {len(evaluable)} exploitables.")
        n = len(evaluable)
    return random.Random(seed).sample(evaluable, n)


# ---------------------------------------------------------------------------
# Evaluation principale
# ---------------------------------------------------------------------------

def evaluate(
    query_rows: list[dict],
    resources,
    k: int,
    categories: dict[str, dict],
) -> tuple[list[dict], list[dict]]:
    """
    - Lance la recherche et calcule les correspondances typees par requete.

    Returns:
        - query_results : une ligne par requete
        - result_details: une ligne par resultat individuel
    """
    query_results: list[dict] = []
    result_details: list[dict] = []

    for i, query_row in enumerate(query_rows, start=1):
        image_path = resolve_path(str(query_row.get("path", "")))
        if not image_path.exists():
            print(f"  [{i:03d}] image introuvable : {image_path}, ignoree")
            continue

        cui_query = parse_cui(query_row.get("cui", ""))
        types_query = split_cui_by_type(cui_query, categories)

        results = query(
            resources=resources,
            image=image_path,
            k=k,
            exclude_self=True,
        )

        # Accumule les hits par type pour cette requete
        hit_modalite = False
        hit_anatomie = False
        hit_finding = False

        for result in results:
            cui_result = parse_cui(result.get("cui", ""))
            types_result = split_cui_by_type(cui_result, categories)

            match_m = bool(types_query["modalite"] & types_result["modalite"])
            match_a = bool(types_query["anatomie"] & types_result["anatomie"])
            match_p = bool(types_query["finding"]  & types_result["finding"])

            if match_m:
                hit_modalite = True
            if match_a:
                hit_anatomie = True
            if match_p:
                hit_finding = True

            result_details.append({
                "query_id":      query_row["image_id"],
                "result_id":     result["image_id"],
                "score":         result["score"],
                "match_modalite": int(match_m),
                "match_anatomie": int(match_a),
                "match_finding":  int(match_p),
                # flags indiquant si la requete AVAIT ce type
                "query_has_anatomie": int(bool(types_query["anatomie"])),
                "query_has_finding":  int(bool(types_query["finding"])),
            })

        query_results.append({
            "query_id":           query_row["image_id"],
            "hit_modalite":       int(hit_modalite),
            "hit_anatomie":       int(hit_anatomie),
            "hit_finding":        int(hit_finding),
            "has_anatomie_cui":   int(bool(types_query["anatomie"])),
            "has_finding_cui":    int(bool(types_query["finding"])),
            "n_results":          len(results),
        })

        if i % 10 == 0:
            print(f"  Evalue {i}/{len(query_rows)} requetes...")

    return query_results, result_details


# ---------------------------------------------------------------------------
# Calcul des metriques
# ---------------------------------------------------------------------------

def compute_metrics(
    query_results: list[dict],
    result_details: list[dict],
) -> dict[str, float | None]:
    """
    - Calcule TM, TA, TP au niveau requete et resultats.
    """
    total_q = len(query_results)
    total_r = len(result_details)

    if total_q == 0:
        return {}

    # --- TM au niveau requetes
    tm_requetes = sum(r["hit_modalite"] for r in query_results) / total_q

    # --- TM au niveau resultats
    tm_resultats = sum(r["match_modalite"] for r in result_details) / total_r if total_r else 0.0

    # --- TA : uniquement sur les requetes qui ont un CUI anatomie
    q_avec_anatomie = [r for r in query_results if r["has_anatomie_cui"]]
    ta_requetes = (
        sum(r["hit_anatomie"] for r in q_avec_anatomie) / len(q_avec_anatomie)
        if q_avec_anatomie else None
    )
    r_avec_anatomie = [r for r in result_details if r["query_has_anatomie"]]
    ta_resultats = (
        sum(r["match_anatomie"] for r in r_avec_anatomie) / len(r_avec_anatomie)
        if r_avec_anatomie else None
    )

    # --- TP : uniquement sur les requetes qui ont un CUI finding
    q_avec_finding = [r for r in query_results if r["has_finding_cui"]]
    tp_requetes = (
        sum(r["hit_finding"] for r in q_avec_finding) / len(q_avec_finding)
        if q_avec_finding else None
    )
    r_avec_finding = [r for r in result_details if r["query_has_finding"]]
    tp_resultats = (
        sum(r["match_finding"] for r in r_avec_finding) / len(r_avec_finding)
        if r_avec_finding else None
    )

    return {
        "TM_requetes":  tm_requetes,
        "TM_resultats": tm_resultats,
        "TA_requetes":  ta_requetes,
        "TA_resultats": ta_resultats,
        "TP_requetes":  tp_requetes,
        "TP_resultats": tp_resultats,
        # counts utiles pour le rapport
        "n_queries_total":       total_q,
        "n_queries_avec_anatomie": len(q_avec_anatomie),
        "n_queries_avec_finding":  len(q_avec_finding),
        "n_results_total":       total_r,
    }


# ---------------------------------------------------------------------------
# Affichage
# ---------------------------------------------------------------------------

def print_results(metrics: dict, mode: str, k: int) -> None:
    """
    - Affiche les résultats de manière lisible, avec indication des seuils et du statut PASS/FAIL.
    - Affiche les métriques pertinentes selon le mode (visual vs semantic).
    """
    seuils = SEUILS[mode]

    print(f"\n{'='*55}")
    print(f"  EVALUATION TYPEE — mode={mode}  k={k}")
    print(f"{'='*55}")

    print(f"\n  TM — Taux Modalite (les deux modes)")
    _print_metric("TM_requetes",  metrics, seuils, "% requetes trouvant meme modalite")
    _print_metric("TM_resultats", metrics, seuils, "% resultats de meme modalite")

    if mode == "visual":
        n = metrics.get("n_queries_avec_anatomie", 0)
        print(f"\n  TA — Taux Anatomie  (base : {n} requetes avec CUI anatomie)")
        _print_metric("TA_requetes",  metrics, seuils, "% requetes trouvant meme anatomie")
        _print_metric("TA_resultats", metrics, seuils, "% resultats de meme anatomie")

    if mode == "semantic":
        n = metrics.get("n_queries_avec_finding", 0)
        print(f"\n  TP — Taux Pathologie  (base : {n} requetes avec CUI finding)")
        _print_metric("TP_requetes",  metrics, seuils, "% requetes trouvant meme pathologie")
        _print_metric("TP_resultats", metrics, seuils, "% resultats de meme pathologie")

    print()


def _print_metric(
    key: str,
    metrics: dict,
    seuils: dict,
    label: str,
) -> None:
    """
    - Affiche une métrique avec son seuil et statut.
    - Gère le cas où la métrique est None (ex: TA/TP non calculable) ou où il n'y a pas de seuil défini.
    """
    val = metrics.get(key)
    if val is None:
        print(f"    {key:20s}: N/A  (aucune requete eligible)")
        return
    seuil = seuils.get(key)
    if seuil is None:
        print(f"    {key:20s}: {val:.1%}")
        return
    status = "PASS" if val >= seuil else "FAIL"
    print(f"    {key:20s}: {val:.1%}  (seuil >= {seuil:.0%})  {status}  — {label}")


# ---------------------------------------------------------------------------
# Sauvegarde CSV
# ---------------------------------------------------------------------------

def save_csv(
    metrics: dict,
    query_results: list[dict],
    result_details: list[dict],
    output_dir: Path,
    mode: str,
    k: int,
) -> Path:
    """
    - Sauvegarde les mesures détaillées et les stats dans un fichier CSV.
    - Inclut les metriques globales, les details par requete et par resultat.
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    csv_path = output_dir / f"typed_quality_{mode}_{timestamp}.csv"

    seuils = SEUILS[mode]

    with csv_path.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["# MEDISCAN — Evaluation typee TM/TA/TP"])
        w.writerow(["# mode", mode])
        w.writerow(["# k", k])
        w.writerow(["# n_queries", metrics.get("n_queries_total")])
        w.writerow(["# n_results", metrics.get("n_results_total")])
        w.writerow([])
        w.writerow(["metrique", "valeur", "seuil", "statut", "description"])
        for key, seuil in seuils.items():
            val = metrics.get(key)
            if val is None:
                w.writerow([key, "N/A", f"{seuil:.2f}", "N/A", "pas de requete eligible"])
            else:
                status = "PASS" if val >= seuil else "FAIL"
                w.writerow([key, f"{val:.4f}", f"{seuil:.2f}", status, ""])
        w.writerow([])

        # Details par requete
        w.writerow(["--- DETAILS PAR REQUETE ---"])
        if query_results:
            w.writerow(list(query_results[0].keys()))
            for row in query_results:
                w.writerow(list(row.values()))
        w.writerow([])

        # Details par resultat
        w.writerow(["--- DETAILS PAR RESULTAT ---"])
        if result_details:
            w.writerow(list(result_details[0].keys()))
            for row in result_details:
                w.writerow(list(row.values()))

    return csv_path


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Evaluation typee TM/TA/TP par type de CUI"
    )
    """
    - Parse les arguments de la ligne de commande pour configurer l'évaluation.
    - Permet de choisir le mode (visual vs semantic), le nombre de requêtes, 
      la valeur de k, le seed pour la reproductibilité et le chemin de sortie.
    """
    parser.add_argument("--mode", default="visual", choices=("visual", "semantic"))
    parser.add_argument("--k", type=int, default=10)
    parser.add_argument("--n-queries", type=int, default=100)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--output-dir", default="proofs/perf")
    parser.add_argument("--categories-path", default=str(CATEGORIES_PATH))
    return parser.parse_args()


def main() -> None:
    """
    - Point d'entrée principal : parse les arguments, charge les ressources, sélectionne les requêtes,
      exécute l'évaluation, calcule les métriques et affiche/sauvegarde les résultats.
    """
    args = parse_args()

    categories = load_categories(Path(args.categories_path))
    print(f"Categories chargees : {len(categories)} CUI classes")

    resources = load_resources(mode=args.mode)
    print(f"Index charge : {resources.index.ntotal} vecteurs, dim={resources.index.d}")

    query_rows = pick_query_rows(resources.rows, args.n_queries, args.seed)
    print(
        f"mode={args.mode}  k={args.k}  n_queries={len(query_rows)}"
    )

    query_results, result_details = evaluate(
        query_rows, resources, args.k, categories
    )
    metrics = compute_metrics(query_results, result_details)
    print_results(metrics, args.mode, args.k)

    csv_path = save_csv(
        metrics,
        query_results,
        result_details,
        resolve_path(args.output_dir),
        args.mode,
        args.k,
    )
    print(f"Resultats sauvegardes : {csv_path}")


if __name__ == "__main__":
    main()
