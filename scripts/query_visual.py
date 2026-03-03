#!/usr/bin/env python3
"""Query FAISS and render query + top-k retrievals as an image sheet."""

from __future__ import annotations

import argparse
import json
import math
import os
import sys
from pathlib import Path
from typing import Any

# Work around duplicate OpenMP runtime loads across PyTorch/FAISS wheels.
os.environ.setdefault("KMP_DUPLICATE_LIB_OK", "TRUE")
os.environ.setdefault("OMP_NUM_THREADS", "1")

import faiss
import numpy as np
from PIL import Image, ImageDraw, ImageFont

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


def truncate(text: str, max_len: int) -> str:
    if len(text) <= max_len:
        return text
    return text[: max_len - 3] + "..."


def load_tile_image(image_path: Path, tile_size: int) -> Image.Image:
    tile = Image.new("RGB", (tile_size, tile_size), color=(245, 245, 245))

    try:
        with Image.open(image_path) as img:
            rgb = img.convert("RGB")
            rgb.thumbnail((tile_size, tile_size), Image.Resampling.BILINEAR)
            x = (tile_size - rgb.width) // 2
            y = (tile_size - rgb.height) // 2
            tile.paste(rgb, (x, y))
    except Exception:
        draw = ImageDraw.Draw(tile)
        draw.rectangle((0, 0, tile_size - 1, tile_size - 1), outline=(200, 0, 0), width=2)
        draw.text((10, tile_size // 2 - 8), "unreadable", fill=(160, 0, 0), font=ImageFont.load_default())

    return tile


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Render query image and top-k retrievals into a single sheet"
    )
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
    parser.add_argument(
        "--output",
        default="artifacts/query_topk.jpg",
        help="Output image path for the visual sheet",
    )
    parser.add_argument(
        "--tile-size",
        type=int,
        default=220,
        help="Tile size for each image card (default: 220)",
    )
    parser.add_argument(
        "--columns",
        type=int,
        default=4,
        help="Number of columns in the output grid (default: 4)",
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
    if args.tile_size < 80:
        raise ValueError("--tile-size must be >= 80")
    if args.columns <= 0:
        raise ValueError("--columns must be a positive integer")

    embedder = get_embedder(
        args.embedder,
        weights_path=resolve_path(args.weights_path),
    )

    query_image_path = resolve_path(args.image)
    if not query_image_path.exists():
        raise FileNotFoundError(f"Query image not found: {query_image_path}")

    index_path = resolve_path(args.index_path)
    ids_path = resolve_path(args.ids_path)
    output_path = resolve_path(args.output)

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

    with Image.open(query_image_path) as image:
        query_vector = embedder.encode_pil(image).reshape(1, -1).astype(np.float32)

    faiss.normalize_L2(query_vector)

    search_k = min(args.k, index.ntotal)
    scores, indices = index.search(query_vector, search_k)

    results: list[dict[str, Any]] = []
    for rank, (idx, score) in enumerate(zip(indices[0], scores[0]), start=1):
        if idx < 0:
            continue

        row = indexed_rows[idx]
        if not isinstance(row, dict):
            continue

        image_path = resolve_path(row.get("path", ""))
        result = {
            "rank": rank,
            "score": float(score),
            "image_id": str(row.get("image_id", "")),
            "caption": str(row.get("caption", "")),
            "cui": str(row.get("cui", "")),
            "image_path": image_path,
        }
        results.append(result)

    cards = [
        {
            "title": "QUERY",
            "subtitle": query_image_path.name,
            "meta": "",
            "image_path": query_image_path,
        }
    ]

    for item in results:
        cards.append(
            {
                "title": f"TOP {item['rank']}",
                "subtitle": item["image_id"],
                "meta": f"score={item['score']:.4f} | cui={item['cui']}",
                "image_path": item["image_path"],
            }
        )

    padding = 16
    text_height = 66
    tile_size = args.tile_size
    columns = args.columns
    n_cards = len(cards)
    rows = max(1, math.ceil(n_cards / columns))

    canvas_width = padding + columns * (tile_size + padding)
    canvas_height = padding + rows * (tile_size + text_height + padding)

    sheet = Image.new("RGB", (canvas_width, canvas_height), color=(255, 255, 255))
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()

    for i, card in enumerate(cards):
        row_idx = i // columns
        col_idx = i % columns
        x0 = padding + col_idx * (tile_size + padding)
        y0 = padding + row_idx * (tile_size + text_height + padding)

        tile = load_tile_image(card["image_path"], tile_size=tile_size)
        sheet.paste(tile, (x0, y0))

        draw.rectangle((x0, y0, x0 + tile_size, y0 + tile_size), outline=(220, 220, 220), width=2)

        text_y = y0 + tile_size + 6
        draw.text((x0, text_y), truncate(card["title"], 22), fill=(20, 20, 20), font=font)
        draw.text(
            (x0, text_y + 16),
            truncate(card["subtitle"], 30),
            fill=(40, 40, 40),
            font=font,
        )
        draw.text(
            (x0, text_y + 32),
            truncate(card["meta"], 38),
            fill=(70, 70, 70),
            font=font,
        )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output_path, format="JPEG", quality=90)

    print(f"Saved visual result to: {output_path}")
    print(f"Query image: {query_image_path}")
    print(f"Top-k shown: {len(results)}")

    for item in results:
        print(f"{item['rank']}. image_id={item['image_id']} score={item['score']:.6f}")


if __name__ == "__main__":
    main()
