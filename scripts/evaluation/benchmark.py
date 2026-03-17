"""Measure retrieval performance metrics for MEDISCAN."""

from __future__ import annotations

import argparse
import csv
import os
import random
import sys
import time
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

from mediscan.runtime import build_embedder, default_config_for_mode, resolve_path, set_faiss_threads

SEUIL_TE2E_30K = 5.0
SEUIL_STABILITE = 0.20


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Benchmark MEDISCAN retrieval")
    parser.add_argument("--mode", default="visual", choices=("visual", "semantic"))
    parser.add_argument("--k", type=int, default=10)
    parser.add_argument("--n-queries", type=int, default=20)
    parser.add_argument("--n-warmup", type=int, default=3)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--embedder", default=None, help="Optional embedder override")
    parser.add_argument("--model-name", default=None)
    parser.add_argument("--index-path", default=None)
    parser.add_argument("--images-dir", default="data/roco_small/images")
    parser.add_argument("--output-dir", default="proofs/perf")
    return parser.parse_args()


def load_index(index_path: Path) -> faiss.Index:
    if not index_path.exists():
        raise FileNotFoundError(f"Index FAISS introuvable : {index_path}")
    index = faiss.read_index(str(index_path))
    print(f"Index chargé : {index.ntotal} vecteurs, dim={index.d}")
    return index


def pick_query_images(images_dir: Path, n: int, seed: int) -> list[Path]:
    all_images = sorted(images_dir.glob("*.png")) + sorted(images_dir.glob("*.jpg"))
    if not all_images:
        raise FileNotFoundError(f"Aucune image trouvée dans {images_dir}")
    if n > len(all_images):
        raise ValueError(f"Demandé {n} requêtes mais seulement {len(all_images)} images disponibles")
    return random.Random(seed).sample(all_images, n)


def measure_one_query(image_path: Path, embedder, index: faiss.Index, k: int) -> dict[str, float]:
    te2e_start = time.perf_counter()

    with Image.open(image_path) as image:
        rgb_image = image.convert("RGB")
        tembed_start = time.perf_counter()
        vector = embedder.encode_pil(rgb_image)
        tembed_end = time.perf_counter()

    query_vector = vector.reshape(1, -1).astype(np.float32)
    faiss.normalize_L2(query_vector)

    tsearch_start = time.perf_counter()
    index.search(query_vector, k)
    tsearch_end = time.perf_counter()

    tembed = tembed_end - tembed_start
    tsearch = tsearch_end - tsearch_start
    te2e = time.perf_counter() - te2e_start
    return {
        "tembed": tembed,
        "tsearch": tsearch,
        "tserver": tembed + tsearch,
        "te2e": te2e,
    }


def compute_stats(values: list[float]) -> dict[str, float]:
    minimum = min(values)
    maximum = max(values)
    average = sum(values) / len(values)
    dispersion = maximum - minimum
    stability_ratio = (dispersion / average) if average > 0 else 0.0
    return {
        "min": minimum,
        "max": maximum,
        "moyenne": average,
        "dispersion": dispersion,
        "stabilite_ratio": stability_ratio,
    }


def check_seuils(stats_te2e: dict[str, float]) -> None:
    average = stats_te2e["moyenne"]
    stability = stats_te2e["stabilite_ratio"]
    print(f"te2e moyen: {average:.3f}s (seuil <= {SEUIL_TE2E_30K}s)")
    print(f"stabilité : {stability:.1%} (seuil <= {SEUIL_STABILITE:.0%})")


def save_csv(
    results: list[dict[str, float]],
    stats: dict[str, dict[str, float]],
    output_dir: Path,
    mode: str,
    k: int,
    n_images: int,
) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    csv_path = output_dir / f"perf_measures_{timestamp}.csv"

    with csv_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(["# MEDISCAN AI — Mesures de performance"])
        writer.writerow(["# Mode", mode])
        writer.writerow(["# k", k])
        writer.writerow(["# N images dans index", n_images])
        writer.writerow(["# N requêtes mesurées", len(results)])
        writer.writerow([])
        writer.writerow(["requete", "tembed_s", "tsearch_s", "tserver_s", "te2e_s"])
        for i, row in enumerate(results, start=1):
            writer.writerow([
                i,
                f"{row['tembed']:.4f}",
                f"{row['tsearch']:.4f}",
                f"{row['tserver']:.4f}",
                f"{row['te2e']:.4f}",
            ])
        writer.writerow([])
        writer.writerow(["# STATISTIQUES"])
        writer.writerow(["metrique", "min_s", "max_s", "moyenne_s", "dispersion_s", "stabilite_%"])
        for metric, metric_stats in stats.items():
            writer.writerow([
                metric,
                f"{metric_stats['min']:.4f}",
                f"{metric_stats['max']:.4f}",
                f"{metric_stats['moyenne']:.4f}",
                f"{metric_stats['dispersion']:.4f}",
                f"{metric_stats['stabilite_ratio']:.1%}",
            ])
    return csv_path


def main() -> None:
    args = parse_args()
    if args.k <= 0:
        raise ValueError("--k doit être strictement positif")
    if args.n_queries <= 0:
        raise ValueError("--n-queries doit être strictement positif")
    if args.n_warmup < 0:
        raise ValueError("--n-warmup doit être positif ou nul")

    set_faiss_threads(faiss)
    default_embedder, default_index_path, _ = default_config_for_mode(args.mode)
    embedder_name = args.embedder or default_embedder
    index_path = resolve_path(args.index_path) if args.index_path else default_index_path
    images_dir = resolve_path(args.images_dir)

    index = load_index(index_path)
    embedder = build_embedder(embedder_name, model_name=args.model_name)
    if index.d != embedder.dim:
        raise RuntimeError(
            f"Index dimension ({index.d}) incompatible avec l'embedder "
            f"'{embedder_name}' ({embedder.dim})"
        )

    query_images = pick_query_images(images_dir, args.n_warmup + args.n_queries, args.seed)
    for image_path in query_images[: args.n_warmup]:
        measure_one_query(image_path, embedder, index, args.k)

    results = [
        measure_one_query(image_path, embedder, index, args.k)
        for image_path in query_images[args.n_warmup :]
    ]

    stats = {
        metric: compute_stats([result[metric] for result in results])
        for metric in ("tembed", "tsearch", "tserver", "te2e")
    }
    check_seuils(stats["te2e"])

    csv_path = save_csv(results, stats, resolve_path(args.output_dir), args.mode, args.k, index.ntotal)
    print(f"Résultats sauvegardés : {csv_path}")


if __name__ == "__main__":
    main()
