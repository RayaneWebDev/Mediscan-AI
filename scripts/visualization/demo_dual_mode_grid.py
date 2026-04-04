#!/usr/bin/env python3
"""
Génère une grille visuelle et une grille sémantique pour comparer les résultats.
Ce script illustre la différence entre "ce que l'image montre" (visuel) 
et "ce que l'image signifie médicalement" (sémantique).
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFont

from mediscan.dataset import MetadataRecord, RocoDataset
from mediscan.process import configure_cpu_environment
from mediscan.runtime import resolve_path
from mediscan.search import MAX_K, load_resources, query

configure_cpu_environment()

# Mots-clés pour le scoring automatique des exemples pertinents
SEMANTIC_KEYWORDS = (
    "subarachnoid",
    "hematoma",
    "hemorrhage",
    "aneurysm",
    "metastasis",
    "tumor",
    "lesion",
    "abscess",
    "stroke",
    "fracture",
    "pneumothorax",
    "effusion",
    "edema",
    "cyst",
)
VISUAL_KEYWORDS = (
    "chest radiograph",
    "chest x-ray",
    "radiograph",
    "x-ray",
    "anteroposterior",
    "postero-anterior",
    "axial ct",
    "coronal ct",
    "sagittal mri",
    "t1 weighted",
    "t2 weighted",
)


def parse_args() -> argparse.Namespace:
    """
    - Arguments CLI pour la génération des grilles de comparaison.
    """
    parser = argparse.ArgumentParser(description="Generate visual vs semantic grids")
    parser.add_argument("--image", default=None)
    parser.add_argument("--visual-image", default=None)
    parser.add_argument("--semantic-image", default=None)
    parser.add_argument("--k", type=int, default=5, help=f"Top-k results (max {MAX_K})")
    parser.add_argument("--columns", type=int, default=3)
    parser.add_argument("--tile-size", type=int, default=220)
    parser.add_argument("--metadata", default="data/roco_train_full/metadata.csv")
    parser.add_argument("--visual-model-name", default=None)
    parser.add_argument("--semantic-model-name", default=None)
    parser.add_argument("--visual-index-path", default="artifacts/index.faiss")
    parser.add_argument("--visual-ids-path", default="artifacts/ids.json")
    parser.add_argument("--semantic-index-path", default="artifacts/index_semantic.faiss")
    parser.add_argument("--semantic-ids-path", default="artifacts/ids_semantic.json")
    parser.add_argument("--output-visual", default="artifacts/demo_visual_grid.jpg")
    parser.add_argument("--output-semantic", default="artifacts/demo_semantic_grid.jpg")
    return parser.parse_args()


def parse_cui_count(raw_cui: str) -> int:
    """
    - Tente de parser le champ CUI du metadata pour estimer la richesse sémantique.
    """
    if not raw_cui:
        return 0
    try:
        parsed = json.loads(raw_cui)
    except json.JSONDecodeError:
        return 0
    return len(parsed) if isinstance(parsed, list) else 0


def collect_matches(text: str, keywords: tuple[str, ...]) -> list[str]:
    """
    - Collecte les mots-clés présents dans le texte pour le scoring automatique.
    """
    lowered = text.lower()
    return [keyword for keyword in keywords if keyword in lowered]


def score_visual_query(record: MetadataRecord) -> tuple[int, list[str]]:
    """
    - Évalue la pertinence d'une image pour démontrer la recherche visuelle (forme, modalité).
    """
    caption = record.caption.lower()
    matches = collect_matches(caption, VISUAL_KEYWORDS)
    semantic_penalty = len(collect_matches(caption, SEMANTIC_KEYWORDS))

    score = len(matches) * 4
    if "chest" in caption:
        score += 3
    if "radiograph" in caption or "x-ray" in caption:
        score += 3
    if "axial" in caption or "coronal" in caption or "sagittal" in caption:
        score += 2
    if len(caption.split()) <= 18:
        score += 1
    score -= semantic_penalty * 2
    return score, matches


def score_semantic_query(record: MetadataRecord) -> tuple[int, list[str]]:
    """
    - Évalue la pertinence d'une image pour démontrer la recherche sémantique (pathologie).
    """
    caption = record.caption.lower()
    matches = collect_matches(caption, SEMANTIC_KEYWORDS)
    score = len(matches) * 5
    score += min(len(caption.split()), 20) // 4
    score += min(parse_cui_count(record.cui), 3)
    if "showing" in caption or "demonstrating" in caption:
        score += 1
    return score, matches


def auto_choose_query(records: list[MetadataRecord], mode: str) -> tuple[MetadataRecord, str]:
    """
    - Choisit automatiquement une image de requête pertinente pour chaque mode (visuel/sémantique)
      en se basant sur les légendes et les CUI associés.
    """
    scorer = score_visual_query if mode == "visual" else score_semantic_query
    best_record = records[0]
    best_score = -10**9
    best_matches: list[str] = []

    for record in records:
        score, matches = scorer(record)
        if score > best_score:
            best_record = record
            best_score = score
            best_matches = matches

    if best_matches:
        return best_record, f"auto-selected {mode} query from caption keywords: {', '.join(best_matches[:3])}"
    return best_record, f"auto-selected fallback {mode} query"


def find_query_record(records: list[MetadataRecord], image_path: Path) -> MetadataRecord:
    """
    - Tente de trouver l'enregistrement du dataset correspondant à une image de requête donnée,
      en comparant à la fois les noms de fichiers et les chemins absolus.
    """
    query_abs = image_path.resolve()
    query_stem = image_path.stem
    for record in records:
        record_path = resolve_path(record.path)
        if record.image_id == query_stem:
            return record
        try:
            if record_path.resolve() == query_abs:
                return record
        except FileNotFoundError:
            if record_path.absolute() == query_abs:
                return record
    raise RuntimeError("Query image not found in metadata.csv")


def resolve_query_for_mode(
    records: list[MetadataRecord],
    mode: str,
    manual_image: str | None,
    shared_image: str | None,
) -> tuple[MetadataRecord, Path, str]:
    """
    - Détermine l'image de requête à utiliser selon le mode (visuel ou sémantique). 
    """
    selected_image = manual_image or shared_image
    if selected_image:
        query_image = resolve_path(selected_image)
        if not query_image.exists():
            raise FileNotFoundError(f"{mode} query image not found: {query_image}")
        reason = f"manual {mode} query image" if manual_image else f"shared manual query image reused for {mode}"
        return find_query_record(records, query_image), query_image, reason

    record, reason = auto_choose_query(records, mode)
    return record, resolve_path(record.path), reason


def run_image_search(
    query_image: Path,
    mode: str,
    model_name: str | None,
    index_path: Path,
    ids_path: Path,
    k: int,
) -> list[dict[str, Any]]:
    """
    - Exécute la recherche d'images similaires en déléguant à la pipeline de recherche et retourne les résultats.
    """
    resources = load_resources(
        mode=mode,
        model_name=model_name,
        index_path=index_path,
        ids_path=ids_path,
    )
    return query(resources=resources, image=query_image, k=k, exclude_self=True)


def truncate(text: str, max_len: int) -> str:
    """
    - Tronque une chaîne de caractères avec des points de suspension.
    """
    return text if len(text) <= max_len else text[: max_len - 3] + "..."


def load_tile_image(image_path: Path, tile_size: int) -> Image.Image:
    """
    - Charge une image du dataset et la redimensionne à tile_size × tile_size (letterboxed).
    """
    tile = Image.new("RGB", (tile_size, tile_size), color=(245, 245, 245))
    try:
        with Image.open(image_path) as image:
            rgb = image.convert("RGB")
            rgb.thumbnail((tile_size, tile_size), Image.Resampling.BILINEAR)
            tile.paste(rgb, ((tile_size - rgb.width) // 2, (tile_size - rgb.height) // 2))
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
    - Construit une grille JPEG contenant la requête et les top-k résultats.
    """
    cards = [{"title": "QUERY", "subtitle": query_image.name, "meta": subtitle, "image_path": query_image}]
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
    if output_path.suffix.lower() in {".jpg", ".jpeg"}:
        sheet.save(output_path, format="JPEG", quality=90)
    elif output_path.suffix.lower() == ".png":
        sheet.save(output_path, format="PNG")
    else:
        sheet.save(output_path)


def main() -> None:
    """
    - Orchestre la génération des grilles de comparaison visuelle et sémantique.
    - Choisit les images de requête, exécute les recherches et rend les grilles.
    """
    args = parse_args()
    if not 0 < args.k <= MAX_K:
        raise ValueError(f"--k must be between 1 and {MAX_K}")

    records = RocoDataset(metadata_csv=resolve_path(args.metadata)).records
    if not records:
        raise RuntimeError("Empty dataset")

    visual_record, visual_image, visual_reason = resolve_query_for_mode(records, "visual", args.visual_image, args.image)
    semantic_record, semantic_image, semantic_reason = resolve_query_for_mode(records, "semantic", args.semantic_image, args.image)

    visual_results = run_image_search(
        query_image=visual_image,
        mode="visual",
        model_name=args.visual_model_name,
        index_path=resolve_path(args.visual_index_path),
        ids_path=resolve_path(args.visual_ids_path),
        k=args.k,
    )
    semantic_results = run_image_search(
        query_image=semantic_image,
        mode="semantic",
        model_name=args.semantic_model_name,
        index_path=resolve_path(args.semantic_index_path),
        ids_path=resolve_path(args.semantic_ids_path),
        k=args.k,
    )

    render_grid(
        title="Visual Similarity (DINOv2 + FAISS)",
        subtitle=f"query_id={visual_record.image_id}",
        query_image=visual_image,
        results=visual_results,
        output_path=resolve_path(args.output_visual),
        columns=args.columns,
        tile_size=args.tile_size,
    )
    render_grid(
        title="Semantic Similarity (BioMedCLIP + FAISS)",
        subtitle=f"query_id={semantic_record.image_id}",
        query_image=semantic_image,
        results=semantic_results,
        output_path=resolve_path(args.output_semantic),
        columns=args.columns,
        tile_size=args.tile_size,
    )

    print(f"visual_query_reason={visual_reason}")
    print(f"visual_query_image={visual_image}")
    print(f"visual_query_id={visual_record.image_id}")
    print(f"visual_query_caption={visual_record.caption}")
    print(f"visual_query_cui={visual_record.cui}")

    print(f"semantic_query_reason={semantic_reason}")
    print(f"semantic_query_image={semantic_image}")
    print(f"semantic_query_id={semantic_record.image_id}")
    print(f"semantic_query_caption={semantic_record.caption}")
    print(f"semantic_query_cui={semantic_record.cui}")


if __name__ == "__main__":
    main()
