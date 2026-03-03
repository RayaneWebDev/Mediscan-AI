#!/usr/bin/env python3
"""Query a FAISS index with a single image."""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

# Work around duplicate OpenMP runtime loads across PyTorch/FAISS wheels.
os.environ.setdefault("KMP_DUPLICATE_LIB_OK", "TRUE")
os.environ.setdefault("OMP_NUM_THREADS", "1")

import faiss
import numpy as np
from PIL import Image

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = PROJECT_ROOT / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from mediscan.embedders.factory import get_embedder


def resolve_path(raw_path: str | Path) -> Path:
    path = Path(raw_path)
    if path.is_absolute():
        return path
    return PROJECT_ROOT / path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Query FAISS index with an input image")
    parser.add_argument("--embedder", default="resnet50_radimagenet", help="Embedder name")
    parser.add_argument(
        "--weights-path",
        default="weights/resnet50_radimagenet.pt",
        help="Path to embedder checkpoint",
    )
    parser.add_argument("--image", required=True, help="Path to query image")
    parser.add_argument("--k", type=int, default=5, help="Top-k results (max 50)")
    parser.add_argument(
        "--index-path",
        default="artifacts/index.faiss",
        help="Path to FAISS index",
    )
    parser.add_argument(
        "--ids-path",
        default="artifacts/ids.json",
        help="Path to indexed metadata",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if hasattr(faiss, "omp_set_num_threads"):
        faiss.omp_set_num_threads(1)

    if args.k <= 0:
        raise ValueError("--k must be a positive integer")
    if args.k > 50:
        raise ValueError("--k must be <= 50")

    embedder = get_embedder(
        args.embedder,
        weights_path=resolve_path(args.weights_path),
    )

    image_path = resolve_path(args.image)
    if not image_path.exists():
        raise FileNotFoundError(f"Query image not found: {image_path}")

    index_path = resolve_path(args.index_path)
    ids_path = resolve_path(args.ids_path)

    if not index_path.exists():
        raise FileNotFoundError(f"FAISS index not found: {index_path}")
    if not ids_path.exists():
        raise FileNotFoundError(f"IDs file not found: {ids_path}")

    index = faiss.read_index(str(index_path))
    if index.d != embedder.dim:
        raise RuntimeError(
            f"Index dimension ({index.d}) does not match embedder ({embedder.dim})"
        )
    if index.ntotal == 0:
        raise RuntimeError("FAISS index is empty")

    with ids_path.open("r", encoding="utf-8") as ids_file:
        indexed_rows = json.load(ids_file)

    if not isinstance(indexed_rows, list):
        raise RuntimeError("Invalid ids.json format: expected a list")
    if len(indexed_rows) != index.ntotal:
        raise RuntimeError(
            f"Index/IDs mismatch: index.ntotal={index.ntotal}, ids={len(indexed_rows)}"
        )

    with Image.open(image_path) as image:
        query_vector = embedder.encode_pil(image).reshape(1, -1).astype(np.float32)

    faiss.normalize_L2(query_vector)

    search_k = min(args.k, index.ntotal)
    scores, indices = index.search(query_vector, search_k)

    for rank, (idx, score) in enumerate(zip(indices[0], scores[0]), start=1):
        if idx < 0:
            continue

        row = indexed_rows[idx]
        image_id = row.get("image_id", "")
        caption = row.get("caption", "")
        cui = row.get("cui", "")

        print(f"{rank}. image_id={image_id} score={float(score):.6f}")
        print(f"   caption={caption}")
        print(f"   cui={cui}")


if __name__ == "__main__":
    main()
