#!/usr/bin/env python3
"""Build a FAISS index from local ROCO small metadata and images."""

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

from mediscan.dataset import RocoSmallDataset
from mediscan.embedders.factory import get_embedder


def resolve_path(raw_path: str | Path) -> Path:
    path = Path(raw_path)
    if path.is_absolute():
        return path
    return PROJECT_ROOT / path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build FAISS IndexFlatIP from metadata.csv")
    parser.add_argument("--embedder", default="resnet50_radimagenet", help="Embedder name")
    parser.add_argument(
        "--weights-path",
        default="weights/resnet50_radimagenet.pt",
        help="Path to embedder checkpoint",
    )
    parser.add_argument(
        "--metadata",
        default="data/roco_small/metadata.csv",
        help="Path to metadata.csv",
    )
    parser.add_argument(
        "--index-path",
        default="artifacts/index.faiss",
        help="Output path for FAISS index",
    )
    parser.add_argument(
        "--ids-path",
        default="artifacts/ids.json",
        help="Output path for indexed metadata IDs",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if hasattr(faiss, "omp_set_num_threads"):
        faiss.omp_set_num_threads(1)

    embedder = get_embedder(
        args.embedder,
        weights_path=resolve_path(args.weights_path),
    )

    dataset = RocoSmallDataset(metadata_csv=resolve_path(args.metadata))

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
        except Exception as exc:  # pragma: no cover - defensive robustness
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
    with ids_path.open("w", encoding="utf-8") as ids_file:
        json.dump(indexed_rows, ids_file, ensure_ascii=False, indent=2)

    print(
        f"Index built successfully: indexed={len(indexed_rows)}, skipped={skipped}, "
        f"dim={embedder.dim}, index_path={index_path}, ids_path={ids_path}"
    )


if __name__ == "__main__":
    main()
