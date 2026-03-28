#!/usr/bin/env python3
"""Génère une grille visuelle top-k pour une requête textuelle BioMedCLIP.

Usage :
    PYTHONPATH=src:. .venv311/bin/python scripts/visualization/demo_text_search_grid.py \
        --query "chest X-ray pneumonia" --k 5

Sortie : data/test/text_search_<slug>.jpg
"""

from __future__ import annotations

import argparse
import math
import re
import textwrap
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFont

from mediscan.process import configure_cpu_environment
from mediscan.runtime import resolve_path
from mediscan.search import MAX_K, load_resources, query_text

configure_cpu_environment()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _slug(text: str, max_len: int = 40) -> str:
    """Converts a query string to a safe filename slug."""
    s = re.sub(r"[^a-z0-9]+", "_", text.lower().strip())
    return s[:max_len].strip("_")


def _truncate(text: str, max_len: int) -> str:
    return text if len(text) <= max_len else text[: max_len - 1] + "…"


def _make_query_card(query: str, tile_size: int) -> Image.Image:
    """Renders the query text as a styled PIL image tile."""
    img = Image.new("RGB", (tile_size, tile_size), color=(30, 58, 110))
    draw = ImageDraw.Draw(img)
    font = ImageFont.load_default()

    # Header
    draw.rectangle((0, 0, tile_size, 28), fill=(20, 40, 80))
    draw.text((8, 8), "TEXT QUERY", fill=(180, 210, 255), font=font)

    # Wrapped query text
    wrapped = textwrap.fill(query, width=max(10, tile_size // 8))
    draw.multiline_text(
        (12, 40),
        wrapped,
        fill=(230, 240, 255),
        font=font,
        spacing=6,
    )

    # Bottom label
    draw.rectangle((0, tile_size - 22, tile_size, tile_size), fill=(20, 40, 80))
    draw.text((8, tile_size - 16), "BioMedCLIP  ·  semantic", fill=(140, 180, 220), font=font)

    return img


def _load_result_tile(image_path: Path, tile_size: int) -> Image.Image:
    """Loads a dataset image resized to tile_size × tile_size (letterboxed)."""
    tile = Image.new("RGB", (tile_size, tile_size), color=(245, 245, 245))
    try:
        with Image.open(image_path) as im:
            rgb = im.convert("RGB")
            rgb.thumbnail((tile_size, tile_size), Image.Resampling.BILINEAR)
            tile.paste(rgb, ((tile_size - rgb.width) // 2, (tile_size - rgb.height) // 2))
    except Exception:
        draw = ImageDraw.Draw(tile)
        draw.rectangle((0, 0, tile_size - 1, tile_size - 1), outline=(200, 0, 0), width=2)
        draw.text((10, tile_size // 2 - 8), "unreadable", fill=(160, 0, 0),
                  font=ImageFont.load_default())
    return tile


def render_text_grid(
    query: str,
    results: list[dict[str, Any]],
    output_path: Path,
    *,
    columns: int = 3,
    tile_size: int = 220,
) -> None:
    """Renders query card + top-k result cards as a single JPEG grid."""
    font = ImageFont.load_default()

    # Build card list: [query_card, result_1, ..., result_k]
    cards: list[dict[str, Any]] = [
        {
            "tile": _make_query_card(query, tile_size),
            "label": "QUERY",
            "id_line": f"k={len(results)} results",
            "score_line": "text-to-image  ·  cosine",
        }
    ]
    for r in results:
        caption_short = _truncate(str(r.get("caption", "")), 34)
        cards.append(
            {
                "tile": _load_result_tile(resolve_path(str(r["path"])), tile_size),
                "label": f"TOP {r['rank']}",
                "id_line": _truncate(str(r["image_id"]), 22),
                "score_line": f"score={r['score']:.4f}  {caption_short}",
            }
        )

    # Layout
    padding = 16
    header_h = 52
    text_h = 52
    n_rows = max(1, math.ceil(len(cards) / columns))
    width = padding + columns * (tile_size + padding)
    height = header_h + padding + n_rows * (tile_size + text_h + padding)

    sheet = Image.new("RGB", (width, height), color=(250, 250, 252))
    draw = ImageDraw.Draw(sheet)

    # Header
    draw.rectangle((0, 0, width, header_h - 4), fill=(30, 58, 110))
    draw.text((padding, 10), "Text-to-Image Search — BioMedCLIP + FAISS", fill=(220, 235, 255), font=font)
    draw.text((padding, 26), f'query: "{_truncate(query, 90)}"', fill=(160, 195, 240), font=font)
    draw.text((padding, 38), f"top-{len(results)} results  ·  semantic mode  ·  cosine similarity", fill=(110, 150, 200), font=font)

    # Cards
    for i, card in enumerate(cards):
        row, col = divmod(i, columns)
        x0 = padding + col * (tile_size + padding)
        y0 = header_h + padding + row * (tile_size + text_h + padding)

        sheet.paste(card["tile"], (x0, y0))
        draw.rectangle((x0, y0, x0 + tile_size, y0 + tile_size), outline=(200, 210, 220), width=1)
        draw.text((x0, y0 + tile_size + 5),  _truncate(card["label"], 18),      fill=(15, 15, 15),  font=font)
        draw.text((x0, y0 + tile_size + 18), _truncate(card["id_line"], 32),    fill=(50, 50, 70),  font=font)
        draw.text((x0, y0 + tile_size + 32), _truncate(card["score_line"], 55), fill=(90, 90, 110), font=font)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output_path, format="JPEG", quality=92)
    print(f"Saved → {output_path}")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Text-to-image top-k visualization grid")
    parser.add_argument("--query", "-q", required=True, help="Medical text query (English)")
    parser.add_argument("--k", type=int, default=5, help=f"Top-k results (default 5, max {MAX_K})")
    parser.add_argument("--columns", type=int, default=3, help="Grid columns (default 3)")
    parser.add_argument("--tile-size", type=int, default=220, help="Tile size in px (default 220)")
    parser.add_argument("--output", default=None,
                        help="Output path (default: data/test/text_search_<slug>_k<k>.jpg)")
    parser.add_argument("--index-path", default="artifacts/index_semantic.faiss")
    parser.add_argument("--ids-path", default="artifacts/ids_semantic.json")
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    if not args.query.strip():
        raise ValueError("--query is empty")
    if not 1 <= args.k <= MAX_K:
        raise ValueError(f"--k must be between 1 and {MAX_K}")

    output_path = Path(args.output) if args.output else resolve_path(
        f"data/test/text_search_{_slug(args.query)}_k{args.k}.jpg"
    )

    print(f'Loading semantic index…')
    resources = load_resources(
        mode="semantic",
        index_path=resolve_path(args.index_path),
        ids_path=resolve_path(args.ids_path),
    )
    print(f"  embedder : {resources.embedder.name}  dim={resources.embedder.dim}")
    print(f"  index    : {resources.index.ntotal} vectors")

    print(f'Encoding query: "{args.query}"')
    results = query_text(resources=resources, text=args.query, k=args.k)

    print(f"Top-{len(results)} results:")
    for r in results:
        caption = r["caption"][:70]
        print(f"  #{r['rank']}  score={r['score']:.4f}  id={r['image_id']:<12s}  {caption}")

    render_text_grid(
        query=args.query,
        results=results,
        output_path=output_path,
        columns=args.columns,
        tile_size=args.tile_size,
    )


if __name__ == "__main__":
    main()
