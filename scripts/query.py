#!/usr/bin/env python3
"""
Run MEDISCAN retrieval in visual or semantic mode (image -> image).

Mode semantics:
- visual   : ResNet50 RadImageNet embeddings + FAISS index built in that space.
- semantic : CLIP embeddings + FAISS index built in CLIP space.

Important:
The two modes MUST use their own index files, because embedding dimensions
and geometry differ (ResNet: 2048-D, CLIP ViT-B/32: 512-D).
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any

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

MAX_K = 50


def resolve_path(raw_path: str | Path) -> Path:
    path = Path(raw_path)
    if path.is_absolute():
        return path
    return PROJECT_ROOT / path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Query top-k similar images in visual or semantic mode"
    )
    parser.add_argument(
        "--mode",
        default="visual",
        choices=("visual", "semantic"),
        help="visual=ResNet appearance space, semantic=CLIP semantic space",
    )
    parser.add_argument("--image", required=True, help="Query image path")
    parser.add_argument("--k", type=int, default=5, help=f"Top-k results (max {MAX_K})")
    parser.add_argument(
        "--embedder",
        default=None,
        help="Embedder name override (default: mode-specific)",
    )
    parser.add_argument(
        "--weights-path",
        default="weights/resnet50_radimagenet.pt",
        help="Checkpoint path for embedders that require local weights (ResNet RadImageNet)",
    )
    parser.add_argument(
        "--model-name",
        default="openai/clip-vit-base-patch32",
        help="Model name for embedders that download pretrained weights (CLIP)",
    )
    parser.add_argument("--index-path", default=None, help="FAISS index path override")
    parser.add_argument("--ids-path", default=None, help="IDs JSON path override")
    parser.add_argument(
        "--exclude-self",
        action="store_true",
        help="Exclude exact query image from returned results if present in index",
    )
    return parser.parse_args()


def default_config_for_mode(mode: str) -> tuple[str, Path, Path]:
    """
    Return default embedder and files associated to one retrieval mode.

    We intentionally keep separate index files per mode to avoid accidental
    cross-usage (which would produce dimension mismatch and invalid retrievals).
    """
    if mode == "visual":
        return (
            "resnet50_radimagenet",
            resolve_path("artifacts/index.faiss"),
            resolve_path("artifacts/ids.json"),
        )
    return (
        "clip_vit_b32",
        resolve_path("artifacts/index_semantic.faiss"),
        resolve_path("artifacts/ids_semantic.json"),
    )


def build_embedder(name: str, args: argparse.Namespace):
    """
    Build the requested embedder with the proper constructor arguments.

    - `resnet50_radimagenet` uses a local checkpoint (`--weights-path`)
    - `clip_vit_b32` uses a pretrained model id (`--model-name`)
    """
    normalized = name.strip().lower()
    kwargs: dict[str, object] = {}

    if normalized == "resnet50_radimagenet":
        kwargs["weights_path"] = resolve_path(args.weights_path)
    elif normalized == "clip_vit_b32":
        kwargs["model_name"] = args.model_name
    else:
        kwargs["weights_path"] = resolve_path(args.weights_path)

    return get_embedder(name, **kwargs)


def load_indexed_rows(ids_path: Path) -> list[dict[str, str]]:
    if not ids_path.exists():
        raise FileNotFoundError(f"IDs file not found: {ids_path}")
    with ids_path.open("r", encoding="utf-8") as f:
        rows = json.load(f)
    if not isinstance(rows, list):
        raise RuntimeError("Invalid ids.json format: expected a JSON list")
    if not rows:
        raise RuntimeError("IDs file is empty")
    return rows


def run_query(args: argparse.Namespace) -> tuple[str, str, list[dict[str, Any]]]:
    """
    Execute nearest-neighbor retrieval for one query image.

    Returns:
    - embedder name actually used
    - resolved query image path
    - ranked list of result dicts
    """
    if hasattr(faiss, "omp_set_num_threads"):
        faiss.omp_set_num_threads(1)

    default_embedder, default_index_path, default_ids_path = default_config_for_mode(args.mode)
    embedder_name = args.embedder or default_embedder
    index_path = resolve_path(args.index_path) if args.index_path else default_index_path
    ids_path = resolve_path(args.ids_path) if args.ids_path else default_ids_path

    query_image = resolve_path(args.image)
    if not query_image.exists():
        raise FileNotFoundError(f"Query image not found: {query_image}")
    if not index_path.exists():
        raise FileNotFoundError(f"FAISS index not found: {index_path}")

    indexed_rows = load_indexed_rows(ids_path)
    index = faiss.read_index(str(index_path))

    if index.ntotal == 0:
        raise RuntimeError("FAISS index is empty")
    if len(indexed_rows) != index.ntotal:
        raise RuntimeError(
            f"Index/IDs mismatch: index.ntotal={index.ntotal}, ids={len(indexed_rows)}"
        )

    embedder = build_embedder(embedder_name, args)
    if index.d != embedder.dim:
        raise RuntimeError(
            f"Index dimension ({index.d}) does not match embedder ({embedder.dim})"
        )

    with Image.open(query_image) as image:
        query_vector = embedder.encode_pil(image).reshape(1, -1).astype(np.float32)
    faiss.normalize_L2(query_vector)

    # Ask for a few extra neighbors when self-exclusion is enabled,
    # so we can still return `k` items after removing the query image itself.
    search_k = min(index.ntotal, args.k + 10 if args.exclude_self else args.k)
    scores, indices = index.search(query_vector, search_k)

    query_abs = str(query_image.resolve())
    query_stem = query_image.stem

    results: list[dict[str, Any]] = []
    for idx, score in zip(indices[0], scores[0]):
        if idx < 0:
            continue
        row = indexed_rows[idx]
        if not isinstance(row, dict):
            continue

        image_id = str(row.get("image_id", ""))
        rel_path = str(row.get("path", ""))
        row_abs = str(resolve_path(rel_path).resolve()) if rel_path else ""

        if args.exclude_self and (row_abs == query_abs or image_id == query_stem):
            continue

        results.append(
            {
                "rank": len(results) + 1,
                "score": float(score),
                "image_id": image_id,
                "path": rel_path,
                "caption": str(row.get("caption", "")),
                "cui": str(row.get("cui", "")),
            }
        )
        if len(results) >= args.k:
            break

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


def main() -> None:
    args = parse_args()
    if args.k <= 0:
        raise ValueError("--k must be a positive integer")
    if args.k > MAX_K:
        raise ValueError(f"--k must be <= {MAX_K}")

    embedder_name, query_image, results = run_query(args)
    print_results(
        mode=args.mode,
        embedder_name=embedder_name,
        query_image=query_image,
        results=results,
    )


if __name__ == "__main__":
    main()
