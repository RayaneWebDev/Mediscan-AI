"""Evaluate retrieval quality with CUI overlap metrics (TQ1/TQ2)."""

from __future__ import annotations

import argparse
import csv
import json
import os
import random
import sys
from datetime import datetime
from pathlib import Path

os.environ.setdefault("KMP_DUPLICATE_LIB_OK", "TRUE")
os.environ.setdefault("OMP_NUM_THREADS", "1")

import faiss
import numpy as np
from PIL import Image

PROJECT_ROOT = Path(__file__).resolve().parents[2]
SRC_DIR = PROJECT_ROOT / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from mediscan.runtime import (
    build_embedder,
    compute_search_k,
    default_config_for_mode,
    is_visual_embedder,
    load_indexed_rows,
    resolve_path,
    set_faiss_threads,
)
from mediscan.visual_similarity import rerank_visual_results

TQ1_SEUILS = {1: 0.80, 2: 0.50, 3: 0.20}
TQ2_SEUILS = {1: 0.30, 2: 0.12, 3: 0.05}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Evaluate TQ1/TQ2 with CUI overlap")
    parser.add_argument("--mode", default="visual", choices=("visual", "semantic"))
    parser.add_argument("--k", type=int, default=10)
    parser.add_argument("--n-queries", type=int, default=100)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--embedder", default=None, help="Optional embedder override")
    parser.add_argument("--model-name", default=None)
    parser.add_argument("--index-path", default=None)
    parser.add_argument("--ids-path", default=None)
    parser.add_argument("--images-dir", default="data/roco_small/images")
    parser.add_argument("--output-dir", default="proofs/perf")
    return parser.parse_args()


def parse_cui(cui_raw: str) -> set[str]:
    if not cui_raw or not cui_raw.strip():
        return set()
    try:
        parsed = json.loads(cui_raw)
    except (json.JSONDecodeError, TypeError):
        return set()
    if not isinstance(parsed, list):
        return set()
    return {str(item).strip() for item in parsed if item}


def load_index_and_ids(index_path: Path, ids_path: Path) -> tuple[faiss.Index, list[dict[str, str]], list[set[str]]]:
    if not index_path.exists():
        raise FileNotFoundError(f"Index FAISS introuvable : {index_path}")

    index = faiss.read_index(str(index_path))
    ids = load_indexed_rows(ids_path)
    ids_cui = [parse_cui(row.get("cui", "")) for row in ids]
    print(f"Index chargé : {index.ntotal} vecteurs, dim={index.d}")
    return index, ids, ids_cui


def pick_query_rows(ids: list[dict[str, str]], n: int, seed: int) -> list[dict[str, str]]:
    evaluable = [row for row in ids if parse_cui(row.get("cui", ""))]
    if not evaluable:
        raise ValueError("Aucune entrée avec CUI trouvée dans ids.json")
    if n > len(evaluable):
        print(f"[WARN] Demandé {n} requêtes mais seulement {len(evaluable)} exploitables. On prend tout.")
        n = len(evaluable)
    return random.Random(seed).sample(evaluable, n)


def run_query(
    image_path: Path,
    embedder,
    index: faiss.Index,
    ids: list[dict[str, str]],
    k: int,
) -> tuple[list[int], list[float]]:
    with Image.open(image_path) as image:
        query_vector = embedder.encode_pil(image).reshape(1, -1).astype(np.float32)

    faiss.normalize_L2(query_vector)
    search_k = compute_search_k(embedder.name, k, index.ntotal)
    scores, indices = index.search(query_vector, search_k)

    if not is_visual_embedder(embedder.name):
        return indices[0].tolist(), scores[0].tolist()

    candidates = []
    for idx, score in zip(indices[0], scores[0]):
        if idx < 0:
            continue
        candidates.append(
            {
                "index": int(idx),
                "score": float(score),
                "path": str(ids[idx].get("path", "")),
            }
        )

    reranked = rerank_visual_results(
        query_image=image_path,
        candidates=candidates,
        resolve_path=resolve_path,
        limit=k,
    )
    return [int(item["index"]) for item in reranked], [float(item["score"]) for item in reranked]


def compute_communs(cui_query: set[str], cui_result: set[str]) -> int:
    return len(cui_query & cui_result)


def evaluate(
    query_rows: list[dict[str, str]],
    ids: list[dict[str, str]],
    ids_cui: list[set[str]],
    embedder,
    index: faiss.Index,
    k: int,
) -> tuple[list[dict[str, object]], list[dict[str, object]]]:
    query_results: list[dict[str, object]] = []
    result_details: list[dict[str, object]] = []

    for i, query_row in enumerate(query_rows, start=1):
        image_path = resolve_path(str(query_row.get("path", "")))
        if not image_path.exists():
            print(f"  [{i:03d}] image introuvable : {image_path}, ignorée")
            continue

        cui_query = parse_cui(query_row.get("cui", ""))
        indices, scores = run_query(image_path, embedder, index, ids, k)

        commons_per_result: list[int] = []
        for idx, score in zip(indices, scores):
            if idx < 0:
                continue
            common_count = compute_communs(cui_query, ids_cui[idx])
            commons_per_result.append(common_count)
            result_details.append(
                {
                    "query_id": query_row["image_id"],
                    "result_id": ids[idx]["image_id"],
                    "score": score,
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
    total = len(query_results)
    if total == 0:
        return {threshold: 0.0 for threshold in TQ1_SEUILS}
    return {
        threshold: sum(1 for row in query_results if int(row["max_communs"]) >= threshold) / total
        for threshold in TQ1_SEUILS
    }


def compute_tq2(result_details: list[dict[str, object]]) -> dict[int, float]:
    total = len(result_details)
    if total == 0:
        return {threshold: 0.0 for threshold in TQ2_SEUILS}
    return {
        threshold: sum(1 for row in result_details if int(row["n_communs"]) >= threshold) / total
        for threshold in TQ2_SEUILS
    }


def print_results(tq1: dict[int, float], tq2: dict[int, float], k: int) -> None:
    print(f"\nTQ1 — Taux de requêtes satisfaites (Top-{k})")
    for threshold, expected in TQ1_SEUILS.items():
        value = tq1[threshold]
        status = "PASS" if value >= expected else "FAIL"
        print(f"  >= {threshold} CUI commun(s) : {value:.1%} (seuil >= {expected:.0%}) {status}")

    print(f"\nTQ2 — Part de résultats pertinents (Top-{k})")
    for threshold, expected in TQ2_SEUILS.items():
        value = tq2[threshold]
        status = "PASS" if value >= expected else "FAIL"
        print(f"  >= {threshold} CUI commun(s) : {value:.1%} (seuil >= {expected:.0%}) {status}")


def save_csv(
    tq1: dict[int, float],
    tq2: dict[int, float],
    query_results: list[dict[str, object]],
    result_details: list[dict[str, object]],
    output_dir: Path,
    mode: str,
    k: int,
) -> Path:
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
    args = parse_args()
    if args.k <= 0:
        raise ValueError("--k doit être strictement positif")

    set_faiss_threads(faiss)
    default_embedder, default_index_path, default_ids_path = default_config_for_mode(args.mode)
    embedder_name = args.embedder or default_embedder
    index_path = resolve_path(args.index_path) if args.index_path else default_index_path
    ids_path = resolve_path(args.ids_path) if args.ids_path else default_ids_path

    index, ids, ids_cui = load_index_and_ids(index_path, ids_path)
    embedder = build_embedder(embedder_name, model_name=args.model_name)
    if index.d != embedder.dim:
        raise RuntimeError(
            f"Index dimension ({index.d}) incompatible avec l'embedder "
            f"'{embedder_name}' ({embedder.dim})"
        )

    query_rows = pick_query_rows(ids, args.n_queries, args.seed)
    print(f"mode={args.mode} embedder={embedder_name} k={args.k} n_queries={len(query_rows)}")

    query_results, result_details = evaluate(query_rows, ids, ids_cui, embedder, index, args.k)
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
