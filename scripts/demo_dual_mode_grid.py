#!/usr/bin/env python3
"""
Generate two retrieval grids: visual (ResNet) and semantic (CLIP).

This script is a qualitative demo utility:
- same query image,
- same dataset,
- two different embedding spaces,
- two output sheets saved side by side for direct comparison.
"""

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

from mediscan.dataset import MetadataRecord, RocoSmallDataset
from mediscan.embedders.factory import get_embedder

MAX_K = 50


def resolve_path(raw_path: str | Path) -> Path:
    path = Path(raw_path)
    if path.is_absolute():
        return path
    return PROJECT_ROOT / path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate visual-vs-semantic grids for a query image"
    )
    parser.add_argument("--image", default=None, help="Query image path (optional)")
    parser.add_argument("--k", type=int, default=15, help=f"Top-k results (max {MAX_K})")
    parser.add_argument("--columns", type=int, default=4, help="Grid columns")
    parser.add_argument("--tile-size", type=int, default=220, help="Tile image size")
    parser.add_argument("--metadata", default="data/roco_small/metadata.csv")
    parser.add_argument("--weights-path", default="weights/resnet50_radimagenet.pt")
    parser.add_argument("--clip-model-name", default="openai/clip-vit-base-patch32")
    parser.add_argument("--visual-index-path", default="artifacts/index.faiss")
    parser.add_argument("--visual-ids-path", default="artifacts/ids.json")
    parser.add_argument("--semantic-index-path", default="artifacts/index_semantic.faiss")
    parser.add_argument("--semantic-ids-path", default="artifacts/ids_semantic.json")
    parser.add_argument("--output-visual", default="artifacts/demo_visual_grid.jpg")
    parser.add_argument("--output-semantic", default="artifacts/demo_semantic_grid.jpg")
    return parser.parse_args()


def load_indexed_rows(ids_path: Path) -> list[dict[str, str]]:
    if not ids_path.exists():
        raise FileNotFoundError(f"IDs file not found: {ids_path}")
    with ids_path.open("r", encoding="utf-8") as f:
        rows = json.load(f)
    if not isinstance(rows, list) or not rows:
        raise RuntimeError("Invalid or empty ids file")
    return rows


def auto_choose_query(records: list[MetadataRecord]) -> MetadataRecord:
    # Choose a pathology-rich caption to make semantic retrieval differences clearer.
    # This avoids trivial examples where both modes look similar.
    keywords = [
        "subarachnoid",
        "hematoma",
        "hemorrhage",
        "stroke",
        "aneurysm",
        "pneumothorax",
        "metastasis",
    ]
    for keyword in keywords:
        for record in records:
            if keyword in (record.caption or "").lower():
                return record
    return records[0]


def find_query_record(records: list[MetadataRecord], image_path: Path) -> MetadataRecord:
    image_abs = image_path.resolve()
    image_stem = image_path.stem
    for record in records:
        record_path = resolve_path(record.path)
        try:
            if record_path.resolve() == image_abs:
                return record
        except FileNotFoundError:
            if record_path.absolute() == image_abs:
                return record
        if record.image_id == image_stem:
            return record
    raise RuntimeError("Query image not found in metadata.csv")


def build_embedder(name: str, weights_path: Path, clip_model_name: str):
    """
    Build one embedder instance for the requested branch (visual or semantic).
    """
    normalized = name.strip().lower()
    kwargs: dict[str, object] = {}
    if normalized == "resnet50_radimagenet":
        kwargs["weights_path"] = weights_path
    elif normalized == "clip_vit_b32":
        kwargs["model_name"] = clip_model_name
    return get_embedder(name, **kwargs)


def run_image_search(
    query_record: MetadataRecord,
    query_image: Path,
    embedder_name: str,
    weights_path: Path,
    clip_model_name: str,
    index_path: Path,
    ids_path: Path,
    k: int,
) -> list[dict[str, Any]]:
    """
    Run top-k image retrieval in one embedding space (ResNet or CLIP).
    """
    if hasattr(faiss, "omp_set_num_threads"):
        faiss.omp_set_num_threads(1)

    if not index_path.exists():
        raise FileNotFoundError(
            f"Missing index: {index_path}. Build it with scripts/build_index.py first."
        )
    if not ids_path.exists():
        raise FileNotFoundError(f"Missing ids file: {ids_path}")

    embedder = build_embedder(embedder_name, weights_path=weights_path, clip_model_name=clip_model_name)
    index = faiss.read_index(str(index_path))
    rows = load_indexed_rows(ids_path)

    if index.d != embedder.dim:
        raise RuntimeError(
            f"Index dimension mismatch for {embedder_name}: index={index.d}, embedder={embedder.dim}"
        )
    if index.ntotal != len(rows):
        raise RuntimeError(f"Index/ids mismatch: index.ntotal={index.ntotal}, ids={len(rows)}")

    with Image.open(query_image) as image:
        query_vector = embedder.encode_pil(image).reshape(1, -1).astype(np.float32)
    faiss.normalize_L2(query_vector)

    # Retrieve extra neighbors to compensate for self-removal from results.
    scores, indices = index.search(query_vector, min(index.ntotal, k + 20))
    out: list[dict[str, Any]] = []
    for idx, score in zip(indices[0], scores[0]):
        if idx < 0:
            continue
        row = rows[idx]
        if not isinstance(row, dict):
            continue
        image_id = str(row.get("image_id", ""))
        if image_id == query_record.image_id:
            continue
        out.append(
            {
                "image_id": image_id,
                "path": str(row.get("path", "")),
                "caption": str(row.get("caption", "")),
                "cui": str(row.get("cui", "")),
                "score": float(score),
            }
        )
        if len(out) >= k:
            break
    return out


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


def render_grid(
    title: str,
    subtitle: str,
    query_image: Path,
    results: list[dict[str, Any]],
    output_path: Path,
    columns: int,
    tile_size: int,
) -> None:
    """
    Render one result sheet:
    - first card = query image,
    - following cards = ranked top-k retrievals.
    """
    cards = [
        {
            "title": "QUERY",
            "subtitle": query_image.name,
            "meta": subtitle,
            "image_path": query_image,
        }
    ]
    for rank, item in enumerate(results, start=1):
        cards.append(
            {
                "title": f"TOP {rank}",
                "subtitle": str(item["image_id"]),
                "meta": f"score={float(item['score']):.4f}",
                "image_path": resolve_path(str(item["path"])),
            }
        )

    padding = 16
    title_height = 46
    text_height = 52
    rows = max(1, math.ceil(len(cards) / columns))
    width = padding + columns * (tile_size + padding)
    height = title_height + padding + rows * (tile_size + text_height + padding)

    sheet = Image.new("RGB", (width, height), color=(255, 255, 255))
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()

    draw.text((padding, 10), truncate(title, 90), fill=(15, 15, 15), font=font)
    draw.text((padding, 24), truncate(subtitle, 100), fill=(80, 80, 80), font=font)

    for i, card in enumerate(cards):
        row = i // columns
        col = i % columns
        x0 = padding + col * (tile_size + padding)
        y0 = title_height + padding + row * (tile_size + text_height + padding)

        tile = load_tile_image(Path(card["image_path"]), tile_size)
        sheet.paste(tile, (x0, y0))
        draw.rectangle((x0, y0, x0 + tile_size, y0 + tile_size), outline=(220, 220, 220), width=2)

        draw.text((x0, y0 + tile_size + 6), truncate(str(card["title"]), 24), fill=(20, 20, 20), font=font)
        draw.text((x0, y0 + tile_size + 20), truncate(str(card["subtitle"]), 32), fill=(40, 40, 40), font=font)
        draw.text((x0, y0 + tile_size + 34), truncate(str(card["meta"]), 36), fill=(70, 70, 70), font=font)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output_path, format="JPEG", quality=90)


def main() -> None:
    args = parse_args()
    if args.k <= 0:
        raise ValueError("--k must be > 0")
    if args.k > MAX_K:
        raise ValueError(f"--k must be <= {MAX_K}")

    dataset = RocoSmallDataset(metadata_csv=resolve_path(args.metadata))
    records = dataset.records
    if not records:
        raise RuntimeError("Empty dataset")

    if args.image:
        query_image = resolve_path(args.image)
        if not query_image.exists():
            raise FileNotFoundError(f"Query image not found: {query_image}")
        query_record = find_query_record(records, query_image)
        query_reason = "manual query image provided by user"
    else:
        query_record = auto_choose_query(records)
        query_image = resolve_path(query_record.path)
        query_reason = "auto-selected pathology-rich query to highlight semantic behavior"

    # Visual branch: appearance similarity with ResNet features.
    visual_results = run_image_search(
        query_record=query_record,
        query_image=query_image,
        embedder_name="resnet50_radimagenet",
        weights_path=resolve_path(args.weights_path),
        clip_model_name=args.clip_model_name,
        index_path=resolve_path(args.visual_index_path),
        ids_path=resolve_path(args.visual_ids_path),
        k=args.k,
    )
    # Semantic branch: concept-oriented similarity with CLIP features.
    semantic_results = run_image_search(
        query_record=query_record,
        query_image=query_image,
        embedder_name="clip_vit_b32",
        weights_path=resolve_path(args.weights_path),
        clip_model_name=args.clip_model_name,
        index_path=resolve_path(args.semantic_index_path),
        ids_path=resolve_path(args.semantic_ids_path),
        k=args.k,
    )

    visual_out = resolve_path(args.output_visual)
    semantic_out = resolve_path(args.output_semantic)

    render_grid(
        title="Visual Similarity (ResNet50 RadImageNet + FAISS)",
        subtitle=f"query_id={query_record.image_id}",
        query_image=query_image,
        results=visual_results,
        output_path=visual_out,
        columns=args.columns,
        tile_size=args.tile_size,
    )
    render_grid(
        title="Semantic Similarity (CLIP ViT-B/32 + FAISS)",
        subtitle=f"query_id={query_record.image_id}",
        query_image=query_image,
        results=semantic_results,
        output_path=semantic_out,
        columns=args.columns,
        tile_size=args.tile_size,
    )

    print(f"query_reason={query_reason}")
    print(f"query_image={query_image}")
    print(f"query_id={query_record.image_id}")
    print(f"query_caption={query_record.caption}")
    print(f"query_cui={query_record.cui}")
    print(f"visual_grid={visual_out} topk={len(visual_results)}")
    print(f"semantic_grid={semantic_out} topk={len(semantic_results)}")

    print("visual_top3:")
    for i, row in enumerate(visual_results[:3], start=1):
        print(f"  {i}. {row['image_id']} score={float(row['score']):.4f}")
        print(f"     caption={truncate(str(row['caption']), 120)}")
    print("semantic_top3:")
    for i, row in enumerate(semantic_results[:3], start=1):
        print(f"  {i}. {row['image_id']} score={float(row['score']):.4f}")
        print(f"     caption={truncate(str(row['caption']), 120)}")


if __name__ == "__main__":
    main()
