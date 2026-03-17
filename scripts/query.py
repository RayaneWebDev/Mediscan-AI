#!/usr/bin/env python3
"""Run MEDISCAN retrieval in visual or semantic mode."""

from __future__ import annotations

import argparse
import csv
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

os.environ.setdefault("KMP_DUPLICATE_LIB_OK", "TRUE")
os.environ.setdefault("OMP_NUM_THREADS", "1")

import faiss
import numpy as np
from PIL import Image

PROJECT_ROOT = Path(__file__).resolve().parents[1]
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

MAX_K = 50
EXPORT_DIR = PROJECT_ROOT / "proofs" / "exports"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Query top-k similar images")
    parser.add_argument("--mode", default="visual", choices=("visual", "semantic"))
    parser.add_argument("--image", required=True, help="Query image path")
    parser.add_argument("--k", type=int, default=5, help=f"Top-k results (max {MAX_K})")
    parser.add_argument("--embedder", default=None, help="Optional embedder override")
    parser.add_argument("--model-name", default=None, help="Optional pretrained model override")
    parser.add_argument("--index-path", default=None, help="FAISS index path override")
    parser.add_argument("--ids-path", default=None, help="IDs JSON path override")
    parser.add_argument(
        "--exclude-self",
        action="store_true",
        help="Exclude the exact query image if it exists in the index",
    )
    return parser.parse_args()


def run_query(args: argparse.Namespace) -> tuple[str, str, list[dict[str, Any]]]:
    set_faiss_threads(faiss)

    default_embedder, default_index_path, default_ids_path = default_config_for_mode(args.mode)
    embedder_name = args.embedder or default_embedder
    index_path = resolve_path(args.index_path) if args.index_path else default_index_path
    ids_path = resolve_path(args.ids_path) if args.ids_path else default_ids_path
    query_image = resolve_path(args.image)

    if not query_image.exists():
        raise FileNotFoundError(f"Query image not found: {query_image}")
    if not index_path.exists():
        raise FileNotFoundError(f"FAISS index not found: {index_path}")

    rows = load_indexed_rows(ids_path)
    index = faiss.read_index(str(index_path))
    if index.ntotal == 0:
        raise RuntimeError("FAISS index is empty")
    if len(rows) != index.ntotal:
        raise RuntimeError(f"Index/IDs mismatch: index.ntotal={index.ntotal}, ids={len(rows)}")

    embedder = build_embedder(embedder_name, model_name=args.model_name)
    if embedder.dim != index.d:
        raise RuntimeError(
            f"Index dimension ({index.d}) does not match embedder ({embedder.dim})"
        )

    with Image.open(query_image) as image:
        query_vector = embedder.encode_pil(image).reshape(1, -1).astype(np.float32)
    faiss.normalize_L2(query_vector)

    search_k = compute_search_k(
        embedder_name,
        args.k,
        index.ntotal,
        exclude_self=args.exclude_self,
    )
    scores, indices = index.search(query_vector, search_k)

    query_abs = str(query_image.resolve())
    query_stem = query_image.stem
    results: list[dict[str, Any]] = []

    for idx, score in zip(indices[0], scores[0]):
        if idx < 0:
            continue
        row = rows[idx]
        image_id = str(row.get("image_id", ""))
        relative_path = str(row.get("path", ""))
        absolute_path = str(resolve_path(relative_path).resolve()) if relative_path else ""

        if args.exclude_self and (absolute_path == query_abs or image_id == query_stem):
            continue

        results.append(
            {
                "rank": len(results) + 1,
                "score": float(score),
                "image_id": image_id,
                "path": relative_path,
                "caption": str(row.get("caption", "")),
                "cui": str(row.get("cui", "")),
            }
        )
        if not is_visual_embedder(embedder_name) and len(results) >= args.k:
            break

    if is_visual_embedder(embedder_name):
        results = rerank_visual_results(
            query_image=query_image,
            candidates=results,
            resolve_path=resolve_path,
            limit=args.k,
        )

    return embedder_name, str(query_image), results


def print_results(mode: str, embedder_name: str, query_image: str, results: list[dict[str, Any]]) -> None:
    print(f"mode={mode}")
    print(f"embedder={embedder_name}")
    print(f"query_image={query_image}")
    print(f"results={len(results)}")
    for item in results:
        print(
            f"{item['rank']}. image_id={item['image_id']} "
            f"score={item['score']:.6f} path={item['path']}"
        )
        print(f"   caption={item['caption']}")
        print(f"   cui={item['cui']}")


def export_results_to_csv(results: list[dict[str, Any]], args: argparse.Namespace) -> None:
    EXPORT_DIR.mkdir(parents=True, exist_ok=True)

    status = "OK" if len(results) == args.k else "KO"
    comment = f"mode={args.mode}_k={args.k}" if status == "OK" else f"partial_{len(results)}_vs_{args.k}"

    export_id = 1
    while list(EXPORT_DIR.glob(f"EXP{export_id:02d}_*")):
        export_id += 1

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    export_path = EXPORT_DIR / f"EXP{export_id:02d}_{timestamp}_{status}_{comment}.csv"

    with export_path.open("w", newline="", encoding="utf-8-sig") as output_file:
        writer = csv.DictWriter(
            output_file,
            fieldnames=["rank", "image_id", "score", "caption", "cui"],
            delimiter=";",
        )
        writer.writeheader()
        for result in results:
            writer.writerow(
                {
                    "rank": result.get("rank", ""),
                    "image_id": result.get("image_id", ""),
                    "score": f"{result.get('score', 0)}",
                    "caption": result.get("caption", ""),
                    "cui": result.get("cui", ""),
                }
            )

    print(f"Results exported to {export_path}")


def main() -> None:
    args = parse_args()
    if not 0 < args.k <= MAX_K:
        raise ValueError(f"--k must be between 1 and {MAX_K}")

    embedder_name, query_image, results = run_query(args)
    print_results(args.mode, embedder_name, query_image, results)
    export_results_to_csv(results, args)


if __name__ == "__main__":
    main()
