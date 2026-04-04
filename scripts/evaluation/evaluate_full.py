"""
Évaluation complète MediScan AI — modes visual et semantic.

Mode visual (DINOv2) :
    - TM   : Taux Modalité       (via CUI)
    - TA   : Taux Anatomie       (via CUI, X-rays uniquement)
    - SSIM : Similarité structurelle pixel à pixel
    - HIST : Similarité histogramme niveaux de gris

Mode semantic (BioMedCLIP) :
    - TM          : Taux Modalité   (via CUI)
    - TA          : Taux Anatomie   (via CUI, X-rays uniquement)
    - TP          : Taux Pathologie (via CUI)
    - Precision@k : Proportion de résultats partageant au moins 1 CUI avec la requête

Usage :
    python scripts/evaluation/evaluate_full.py --mode visual   --k 10 --n-queries 200 --seed 42
    python scripts/evaluation/evaluate_full.py --mode semantic --k 10 --n-queries 200 --seed 42

Pour plusieurs seeds (robustesse statistique) :
    python scripts/evaluation/evaluate_full.py --mode semantic --k 10 --n-queries 200 --seed 42
    python scripts/evaluation/evaluate_full.py --mode semantic --k 10 --n-queries 200 --seed 123
    python scripts/evaluation/evaluate_full.py --mode semantic --k 10 --n-queries 200 --seed 999
"""

from __future__ import annotations

import argparse
import csv
import json
import random
from datetime import datetime
from pathlib import Path

import numpy as np
from PIL import Image

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
        "TA_requetes":   0.70,   # >=70% des requetes (avec CUI anatomie) trouvent meme anatomie
        "TA_resultats":  0.50,   # >=50% des resultats partagent meme anatomie
        "SSIM_moyen":    0.20,   # SSIM moyen >= 0.30 (images medicales naturellement peu similaires)
        "HIST_moyen":    0.50,   # Similarite histogramme moyenne >= 0.50
    },
    "semantic": {
        "TM_requetes":   0.80,   # BioMedCLIP doit retrouver la meme modalite
        "TM_resultats":  0.65,
        "TA_requetes":   0.60,   # Seuil assoupli : anatomie est secondaire pour BioMedCLIP
        "TA_resultats":  0.40,
        "TP_requetes":   0.50,   # >=50% des requetes (avec finding) trouvent meme pathologie
        "TP_resultats":  0.30,   # >=30% des resultats partagent meme finding
        "precision_at_k": 0.30,  # >=30% des resultats partagent au moins 1 CUI avec la requete
    },
}

CATEGORIES_PATH = Path("artifacts/cui_categories.json")


# ---------------------------------------------------------------------------
# Chargement des categories CUI
# ---------------------------------------------------------------------------

def load_categories(path: Path = CATEGORIES_PATH) -> dict[str, dict]:
    """
    - Charge les catégories CUI depuis un fichier JSON.
    """
    with path.open(encoding="utf-8") as f:
        raw = json.load(f)
    return {k: v for k, v in raw.items() if not k.startswith("_")}


def parse_cui(cui_raw: str) -> set[str]:
    """
    - Vérifie que les chaînes CUI (souvent stockées en JSON dans la DB).
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


def split_cui_by_type(
    cuis: set[str],
    categories: dict[str, dict],
) -> dict[str, set[str]]:
    """
    - Sépare les CUI d'une requête ou d'un résultat en catégories.
    """
    result: dict[str, set[str]] = {
        "modalite": set(),
        "anatomie": set(),
        "finding":  set(),
        "vue":      set(),
    }
    for cui in cuis:
        if cui in categories:
            t = categories[cui]["type"]
            result[t].add(cui)
    return result


# ---------------------------------------------------------------------------
# Metriques visuelles (SSIM + histogramme)
# ---------------------------------------------------------------------------

def load_image_gray(path: Path) -> np.ndarray | None:
    """
    - Charge une image en niveaux de gris normalises [0,1].
    """
    try:
        with Image.open(path) as img:
            gray = img.convert("L").resize((128, 128))
            return np.array(gray, dtype=np.float32) / 255.0
    except Exception:
        return None


def compute_ssim(img1: np.ndarray, img2: np.ndarray) -> float:
    """
    - SSIM simplifie entre deux images en niveaux de gris [0,1].
    - Formule standard (Wang et al. 2004) avec constantes C1, C2.
    - Pas de dependance scikit-image — calcul direct avec numpy.
    """
    C1 = (0.01) ** 2
    C2 = (0.03) ** 2

    mu1 = img1.mean()
    mu2 = img2.mean()
    sigma1_sq = img1.var()
    sigma2_sq = img2.var()
    sigma12 = ((img1 - mu1) * (img2 - mu2)).mean()

    numerateur   = (2 * mu1 * mu2 + C1) * (2 * sigma12 + C2)
    denominateur = (mu1**2 + mu2**2 + C1) * (sigma1_sq + sigma2_sq + C2)

    return float(numerateur / denominateur) if denominateur != 0 else 0.0


def compute_hist_similarity(img1: np.ndarray, img2: np.ndarray, bins: int = 64) -> float:
    """
    - Similarite histogramme par intersection normalisee.
    - Mesure si les deux images ont une distribution de niveaux de gris similaire.
    - Valeur entre 0 (aucune similarite) et 1 (distributions identiques).
    """
    h1, _ = np.histogram(img1.flatten(), bins=bins, range=(0.0, 1.0))
    h2, _ = np.histogram(img2.flatten(), bins=bins, range=(0.0, 1.0))

    h1 = h1.astype(np.float32)
    h2 = h2.astype(np.float32)

    norm1 = h1.sum()
    norm2 = h2.sum()

    if norm1 == 0 or norm2 == 0:
        return 0.0

    h1 /= norm1
    h2 /= norm2

    return float(np.minimum(h1, h2).sum())


# ---------------------------------------------------------------------------
# Selection des requetes
# ---------------------------------------------------------------------------

def pick_query_rows(
    rows: list[dict],
    n: int,
    seed: int,
) -> list[dict]:
    """
    - Filtre les entrées pour ne garder que celles avec des CUI exploitables.
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
    mode: str,
) -> tuple[list[dict], list[dict]]:
    """
    - Evalue les requetes en utilisant la fonction de recherche 
      et en calculant les metriques de qualite.
    """
    query_results: list[dict] = []
    result_details: list[dict] = []

    images_manquantes = 0

    for i, query_row in enumerate(query_rows, start=1):
        image_path = resolve_path(str(query_row.get("path", "")))
        if not image_path.exists():
            images_manquantes += 1
            continue

        cui_query  = parse_cui(query_row.get("cui", ""))
        types_query = split_cui_by_type(cui_query, categories)

        results = query(
            resources=resources,
            image=image_path,
            k=k,
            exclude_self=True,
        )

        # Charge image requete pour metriques visuelles (mode visual uniquement)
        img_query_gray = load_image_gray(image_path) if mode == "visual" else None

        hit_modalite = False
        hit_anatomie = False
        hit_finding  = False

        ssim_scores = []
        hist_scores = []
        precision_hits = []

        for result in results:
            cui_result   = parse_cui(result.get("cui", ""))
            types_result = split_cui_by_type(cui_result, categories)

            match_m = bool(types_query["modalite"] & types_result["modalite"])
            match_a = bool(types_query["anatomie"] & types_result["anatomie"])
            match_p = bool(types_query["finding"]  & types_result["finding"])

            if match_m: hit_modalite = True
            if match_a: hit_anatomie = True
            if match_p: hit_finding  = True

            # CUI partages (pour Precision@k en mode semantic)
            n_cui_communs = len(cui_query & cui_result)
            precision_hits.append(1 if n_cui_communs >= 1 else 0)

            # Metriques visuelles (mode visual uniquement)
            ssim_val = None
            hist_val = None
            if mode == "visual" and img_query_gray is not None:
                result_path = resolve_path(str(result.get("path", "")))
                if result_path.exists():
                    img_result_gray = load_image_gray(result_path)
                    if img_result_gray is not None:
                        ssim_val = compute_ssim(img_query_gray, img_result_gray)
                        hist_val = compute_hist_similarity(img_query_gray, img_result_gray)
                        ssim_scores.append(ssim_val)
                        hist_scores.append(hist_val)

            detail = {
                "query_id":           query_row["image_id"],
                "result_id":          result["image_id"],
                "score_faiss":        result["score"],
                "match_modalite":     int(match_m),
                "match_anatomie":     int(match_a),
                "match_finding":      int(match_p),
                "n_cui_communs":      n_cui_communs,
                "query_has_anatomie": int(bool(types_query["anatomie"])),
                "query_has_finding":  int(bool(types_query["finding"])),
            }
            if mode == "visual":
                detail["ssim"]             = round(ssim_val, 4) if ssim_val is not None else None
                detail["hist_similarity"]  = round(hist_val, 4) if hist_val is not None else None

            result_details.append(detail)

        query_result = {
            "query_id":         query_row["image_id"],
            "hit_modalite":     int(hit_modalite),
            "hit_anatomie":     int(hit_anatomie),
            "hit_finding":      int(hit_finding),
            "has_anatomie_cui": int(bool(types_query["anatomie"])),
            "has_finding_cui":  int(bool(types_query["finding"])),
            "n_results":        len(results),
            "precision_at_k":   sum(precision_hits) / len(precision_hits) if precision_hits else 0.0,
        }
        if mode == "visual":
            query_result["ssim_moyen"] = float(np.mean(ssim_scores)) if ssim_scores else None
            query_result["hist_moyen"] = float(np.mean(hist_scores)) if hist_scores else None

        query_results.append(query_result)

        if i % 20 == 0:
            print(f"  Evalue {i}/{len(query_rows)} requetes...")

    if images_manquantes > 0:
        print(f"[WARN] {images_manquantes} images introuvables ignorees sur {len(query_rows)} requetes.")

    return query_results, result_details


# ---------------------------------------------------------------------------
# Calcul des metriques agregees
# ---------------------------------------------------------------------------

def compute_metrics(
    query_results: list[dict],
    result_details: list[dict],
    mode: str,
) -> dict[str, float | None]:
    """
    - Calcule les metriques globales (TM, TA, TP, Precision@k) a partir des resultats individuels.
    - Gère les cas où certaines metriques ne sont pas calculables (ex: TA si pas de CUI anatomie).
    """
    total_q = len(query_results)
    total_r = len(result_details)

    if total_q == 0:
        return {}

    # TM
    tm_requetes  = sum(r["hit_modalite"] for r in query_results) / total_q
    tm_resultats = sum(r["match_modalite"] for r in result_details) / total_r if total_r else 0.0

    # TA
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

    # TP
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

    # Precision@k
    precision_at_k = sum(r["precision_at_k"] for r in query_results) / total_q

    metrics: dict[str, float | None] = {
        "TM_requetes":   tm_requetes,
        "TM_resultats":  tm_resultats,
        "TA_requetes":   ta_requetes,
        "TA_resultats":  ta_resultats,
        "TP_requetes":   tp_requetes,
        "TP_resultats":  tp_resultats,
        "precision_at_k": precision_at_k,
        "n_queries_total":          total_q,
        "n_queries_avec_anatomie":  len(q_avec_anatomie),
        "n_queries_avec_finding":   len(q_avec_finding),
        "n_results_total":          total_r,
    }

    # Metriques visuelles
    if mode == "visual":
        ssim_vals = [r["ssim_moyen"] for r in query_results if r.get("ssim_moyen") is not None]
        hist_vals = [r["hist_moyen"] for r in query_results if r.get("hist_moyen") is not None]
        metrics["SSIM_moyen"] = float(np.mean(ssim_vals)) if ssim_vals else None
        metrics["HIST_moyen"] = float(np.mean(hist_vals)) if hist_vals else None

    return metrics


# ---------------------------------------------------------------------------
# Affichage
# ---------------------------------------------------------------------------

def print_results(metrics: dict, mode: str, k: int, seed: int) -> None:
    """
    - Affiche les metriques de maniere lisible dans la console.
    - Indique les seuils de validation et si chaque metrique est PASS/FAIL.
    """
    seuils = SEUILS[mode]

    print(f"\n{'='*60}")
    print(f"  EVALUATION COMPLETE — mode={mode}  k={k}  seed={seed}")
    print(f"{'='*60}")
    print(f"  Requetes evaluees : {metrics.get('n_queries_total')}")
    print(f"  Resultats totaux  : {metrics.get('n_results_total')}")

    print(f"\n  --- Metriques CUI (les deux modes) ---")
    _print_metric("TM_requetes",  metrics, seuils, "requetes trouvant meme modalite")
    _print_metric("TM_resultats", metrics, seuils, "resultats de meme modalite")

    n_a = metrics.get("n_queries_avec_anatomie", 0)
    print(f"\n  TA — Taux Anatomie  (base : {n_a} requetes avec CUI anatomie)")
    _print_metric("TA_requetes",  metrics, seuils, "requetes trouvant meme anatomie")
    _print_metric("TA_resultats", metrics, seuils, "resultats de meme anatomie")

    if mode == "semantic":
        n_p = metrics.get("n_queries_avec_finding", 0)
        print(f"\n  TP — Taux Pathologie  (base : {n_p} requetes avec CUI finding)")
        _print_metric("TP_requetes",  metrics, seuils, "requetes trouvant meme pathologie")
        _print_metric("TP_resultats", metrics, seuils, "resultats de meme pathologie")

        print(f"\n  --- Precision@k ---")
        _print_metric("precision_at_k", metrics, seuils, "resultats partageant >= 1 CUI avec la requete")

    if mode == "visual":
        print(f"\n  --- Metriques visuelles (pixels) ---")
        _print_metric("SSIM_moyen", metrics, seuils, "SSIM moyen sur tous les resultats")
        _print_metric("HIST_moyen", metrics, seuils, "Similarite histogramme moyenne")

    print()


def _print_metric(key: str, metrics: dict, seuils: dict, label: str) -> None:
    """
    - Affiche une metrique avec son seuil de validation et indique PASS/FAIL.
    - Gère les cas où la metrique n'est pas calculable (ex: TA si pas de CUI anatomie).
    - label : description textuelle de la metrique pour l'affichage.
    """
    val = metrics.get(key)
    if val is None:
        print(f"    {key:22s}: N/A  (aucune requete eligible)")
        return
    seuil = seuils.get(key)
    if seuil is None:
        print(f"    {key:22s}: {val:.1%}  — {label}")
        return
    status = "PASS" if val >= seuil else "FAIL"
    print(f"    {key:22s}: {val:.1%}  (seuil >= {seuil:.0%})  {status}  — {label}")


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
    seed: int,
) -> Path:
    """
    - Sauvegarde les mesures détaillées et les stats dans un fichier CSV.
    - Inclut les metriques globales, les details par requete et par resultat.
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    csv_path = output_dir / f"eval_full_{mode}_seed{seed}_{timestamp}.csv"

    seuils = SEUILS[mode]

    with csv_path.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["# MEDISCAN AI — Evaluation complete"])
        w.writerow(["# mode", mode])
        w.writerow(["# k", k])
        w.writerow(["# seed", seed])
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

        w.writerow(["--- DETAILS PAR REQUETE ---"])
        if query_results:
            w.writerow(list(query_results[0].keys()))
            for row in query_results:
                w.writerow(list(row.values()))
        w.writerow([])

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
        description="Evaluation complete MediScan — visual (TM+TA+SSIM+HIST) / semantic (TM+TA+TP+Precision@k)"
    )
    """
    - Parse les arguments de la ligne de commande pour configurer l'évaluation.
    """
    parser.add_argument("--mode",      default="visual", choices=("visual", "semantic"))
    parser.add_argument("--k",         type=int, default=10)
    parser.add_argument("--n-queries", type=int, default=200)
    parser.add_argument("--seed",      type=int, default=42)
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
    print(f"mode={args.mode}  k={args.k}  n_queries={len(query_rows)}  seed={args.seed}")

    query_results, result_details = evaluate(
        query_rows, resources, args.k, categories, args.mode
    )
    metrics = compute_metrics(query_results, result_details, args.mode)
    print_results(metrics, args.mode, args.k, args.seed)

    csv_path = save_csv(
        metrics, query_results, result_details,
        resolve_path(args.output_dir),
        args.mode, args.k, args.seed,
    )
    print(f"Resultats sauvegardes : {csv_path}")


if __name__ == "__main__":
    main()
