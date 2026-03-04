#!/usr/bin/env python3
"""
Build a FAISS index from local ROCO small metadata and images.

This script:
1) loads the ROCO small metadata.csv (image_id, path, caption, cui),
2) loads a chosen embedder (default: ResNet50 RadImageNet),
3) computes one embedding per image,
4) stacks embeddings into a matrix,
5) L2-normalizes vectors (for cosine similarity via inner product),
6) builds a FAISS IndexFlatIP and saves:
   - artifacts/index.faiss
   - artifacts/ids.json (aligned with the FAISS row order)

CPU-only by design.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

# Work around duplicate OpenMP runtime loads across PyTorch/FAISS wheels.
# This avoids occasional crashes or "OMP: Error #15" on some environments.
os.environ.setdefault("KMP_DUPLICATE_LIB_OK", "TRUE")

# Keep CPU thread count low for stability/reproducibility (can be tuned later).
os.environ.setdefault("OMP_NUM_THREADS", "1")

import faiss
import numpy as np
from PIL import Image

# Compute project root relative to this script:
# scripts/build_index.py -> parents[1] = repo root
PROJECT_ROOT = Path(__file__).resolve().parents[1]

# Ensure "src/" is importable when running as a script.
SRC_DIR = PROJECT_ROOT / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from mediscan.dataset import RocoSmallDataset
from mediscan.embedders.factory import get_embedder


def resolve_path(raw_path: str | Path) -> Path:
    """
    Resolve a path relative to the repository root.

    Parameters
    ----------
    raw_path : str | Path
        A path that may be absolute or relative.

    Returns
    -------
    Path
        Absolute path. Relative paths are interpreted relative to PROJECT_ROOT.
    """
    path = Path(raw_path)
    if path.is_absolute():
        return path
    return PROJECT_ROOT / path


def parse_args() -> argparse.Namespace:
    """
    Parse command line arguments.

    Returns
    -------
    argparse.Namespace
        Parsed arguments for embedder selection, paths, and output locations.
    """
    parser = argparse.ArgumentParser(description="Build FAISS IndexFlatIP from metadata.csv")

    parser.add_argument(
        "--embedder",
        default="resnet50_radimagenet",
        help=(
            "Embedder name. "
            "Examples: resnet50_radimagenet (visual), clip_vit_b32 (semantic)."
        ),
    )

    parser.add_argument(
        "--weights-path",
        default="weights/resnet50_radimagenet.pt",
        help="Path to embedder checkpoint",
    )
    parser.add_argument(
        "--model-name",
        default="openai/clip-vit-base-patch32",
        help=(
            "Model name for embedders that download pretrained weights (e.g. CLIP). "
            "Ignored by embedders that do not use it."
        ),
    )

    parser.add_argument(
        "--metadata",
        default="data/roco_small/metadata.csv",
        help="Path to metadata.csv",
    )

    parser.add_argument(
        "--index-path",
        default="artifacts/index.faiss",
        help=(
            "Output path for FAISS index. "
            "Use a dedicated file per mode (e.g., index.faiss vs index_semantic.faiss)."
        ),
    )

    parser.add_argument(
        "--ids-path",
        default="artifacts/ids.json",
        help=(
            "Output path for indexed metadata rows aligned with FAISS row order. "
            "Use a dedicated file per mode (e.g., ids.json vs ids_semantic.json)."
        ),
    )

    return parser.parse_args()


def build_embedder(args: argparse.Namespace):
    """
    Instantiate the selected embedder with mode-specific kwargs.

    Why this helper exists:
    - ResNet RadImageNet expects a local `weights_path`.
    - CLIP expects a HuggingFace `model_name`.
    - We keep one build script and route the right constructor args automatically.
    """
    normalized = args.embedder.strip().lower()
    kwargs: dict[str, object] = {}

    if normalized == "resnet50_radimagenet":
        kwargs["weights_path"] = resolve_path(args.weights_path)
    elif normalized == "clip_vit_b32":
        kwargs["model_name"] = args.model_name
    else:
        # Backward-compatible fallback.
        kwargs["weights_path"] = resolve_path(args.weights_path)

    return get_embedder(args.embedder, **kwargs)


def main() -> None:
    """
    Main entry point.

    - Configures FAISS threading (CPU-only).
    - Instantiates the embedder (feature extractor).
    - Loads dataset metadata.
    - Embeds images and builds a FAISS index.
    - Writes index + aligned metadata rows to disk.
    """
    args = parse_args()

    # Limit FAISS threading if the wheel supports it.
    if hasattr(faiss, "omp_set_num_threads"):
        faiss.omp_set_num_threads(1)

    # Create embedder instance (ResNet50 RadImageNet by default).
    # weights_path is resolved to an absolute path.
    embedder = build_embedder(args)

    # Load ROCO small metadata records (in memory).
    dataset = RocoSmallDataset(metadata_csv=resolve_path(args.metadata))

    vectors: list[np.ndarray] = []          # embeddings (each vector has shape (dim,))
    indexed_rows: list[dict[str, str]] = [] # metadata aligned with FAISS row order
    skipped = 0

    # Iterate over records; compute one embedding per image.
    for idx, record in enumerate(dataset, start=1):
        image_path = resolve_path(record.path)

        # Skip missing files.
        if not image_path.exists():
            print(f"[WARN] Missing image file, skipping: {image_path}")
            skipped += 1
            continue

        # Load + embed.
        try:
            with Image.open(image_path) as image:
                vector = embedder.encode_pil(image)
        except Exception as exc:  # defensive robustness
            print(f"[WARN] Failed to embed {image_path}: {exc}")
            skipped += 1
            continue

        # Validate vector shape.
        if vector.shape != (embedder.dim,):
            print(
                f"[WARN] Invalid vector shape for {image_path}: {vector.shape} "
                f"(expected {(embedder.dim,)})"
            )
            skipped += 1
            continue

        vectors.append(vector.astype(np.float32, copy=False))
        indexed_rows.append(record.to_dict())

        # Progress logging
        if idx % 100 == 0:
            print(f"Processed {idx}/{len(dataset)} images")

    if not vectors:
        raise RuntimeError("No embeddings generated. Index build aborted.")

    # Stack into a (N, dim) float32 matrix.
    matrix = np.vstack(vectors).astype(np.float32, copy=False)

    # Safety check on dimensionality.
    if matrix.shape[1] != embedder.dim:
        raise RuntimeError(
            f"Embedding dimension mismatch: matrix dim={matrix.shape[1]} "
            f"embedder dim={embedder.dim}"
        )

    # L2-normalize all vectors so inner product behaves like cosine similarity.
    faiss.normalize_L2(matrix)

    # IndexFlatIP: exact nearest neighbor search using inner product.
    index = faiss.IndexFlatIP(embedder.dim)
    index.add(matrix)

    # Resolve output paths and ensure directories exist.
    index_path = resolve_path(args.index_path)
    ids_path = resolve_path(args.ids_path)

    index_path.parent.mkdir(parents=True, exist_ok=True)
    ids_path.parent.mkdir(parents=True, exist_ok=True)

    # Persist index and aligned metadata.
    faiss.write_index(index, str(index_path))
    with ids_path.open("w", encoding="utf-8") as ids_file:
        json.dump(indexed_rows, ids_file, ensure_ascii=False, indent=2)

    print(
        f"Index built successfully: indexed={len(indexed_rows)}, skipped={skipped}, "
        f"dim={embedder.dim}, index_path={index_path}, ids_path={ids_path}"
    )


if __name__ == "__main__":
    main()
