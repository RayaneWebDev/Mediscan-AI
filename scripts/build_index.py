#!/usr/bin/env python3
"""Build a FAISS index from one metadata CSV and one embedder."""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

os.environ.setdefault("KMP_DUPLICATE_LIB_OK", "TRUE")
os.environ.setdefault("OMP_NUM_THREADS", "1")

import faiss
import numpy as np
from PIL import Image

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = PROJECT_ROOT / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from mediscan.dataset import RocoSmallDataset
from mediscan.runtime import build_embedder, resolve_path, set_faiss_threads


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build a FAISS index from metadata.csv")
    parser.add_argument("--embedder", default="dinov2_base")
    parser.add_argument("--model-name", default=None)
    parser.add_argument("--metadata", default="data/roco_small/metadata.csv")
    parser.add_argument("--index-path", default="artifacts/index.faiss")
    parser.add_argument("--ids-path", default="artifacts/ids.json")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    set_faiss_threads(faiss)

    dataset = RocoSmallDataset(metadata_csv=resolve_path(args.metadata))
    embedder = build_embedder(args.embedder, model_name=args.model_name)

    vectors: list[np.ndarray] = []
    indexed_rows: list[dict[str, str]] = []
    skipped = 0

    for idx, record in enumerate(dataset, start=1):
        image_path = resolve_path(record.path)
        if not image_path.exists():
            print(f"[WARN] Missing image file, skipping: {image_path}")
            skipped += 1
            continue

        try:
            with Image.open(image_path) as image:
                vector = embedder.encode_pil(image)
        except Exception as exc:
            print(f"[WARN] Failed to embed {image_path}: {exc}")
            skipped += 1
            continue

        if vector.shape != (embedder.dim,):
            print(
                f"[WARN] Invalid vector shape for {image_path}: {vector.shape} "
                f"(expected {(embedder.dim,)})"
            )
            skipped += 1
            continue

        vectors.append(vector.astype(np.float32, copy=False))
        indexed_rows.append(record.to_dict())

        if idx % 100 == 0:
            print(f"Processed {idx}/{len(dataset)} images")

    if not vectors:
        raise RuntimeError("No embeddings generated. Index build aborted.")

    matrix = np.vstack(vectors).astype(np.float32, copy=False)
    if matrix.shape[1] != embedder.dim:
        raise RuntimeError(
            f"Embedding dimension mismatch: matrix dim={matrix.shape[1]} "
            f"embedder dim={embedder.dim}"
        )

    faiss.normalize_L2(matrix)
    index = faiss.IndexFlatIP(embedder.dim)
    index.add(matrix)

    index_path = resolve_path(args.index_path)
    ids_path = resolve_path(args.ids_path)
    index_path.parent.mkdir(parents=True, exist_ok=True)
    ids_path.parent.mkdir(parents=True, exist_ok=True)

    faiss.write_index(index, str(index_path))
    with ids_path.open("w", encoding="utf-8") as output:
        json.dump(indexed_rows, output, ensure_ascii=False, indent=2)

    print(
        f"Index built successfully: indexed={len(indexed_rows)}, skipped={skipped}, "
        f"dim={embedder.dim}, index_path={index_path}, ids_path={ids_path}"
    )


if __name__ == "__main__":
    main()
