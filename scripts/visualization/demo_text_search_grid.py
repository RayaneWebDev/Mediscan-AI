#!/usr/bin/env python3
"""
Génère une grille visuelle top-k pour une requête textuelle BioMedCLIP.

Ce script illustre la fonctionnalité de recherche text-to-image de MediScan AI.
À partir d'une description textuelle médicale en anglais, il encode la requête
avec BioMedCLIP, recherche les k images les plus similaires sémantiquement
dans l'index FAISS, et produit une grille JPEG de visualisation.

Usage :
    python scripts/visualization/demo_text_search_grid.py --query "chest X-ray pneumonia" --k 5
    python scripts/visualization/demo_text_search_grid.py --query "brain MRI tumor" --k 8 --columns 4

Sortie :
    data/test/text_search_<slug>_k<k>.jpg (par défaut)
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


def _slug(text: str, max_len: int = 40) -> str:
    """
    Transforme une requête textuelle en nom de fichier sécurisé (slug).

    Convertit le texte en minuscules, remplace les caractères non alphanumériques
    par des underscores et tronque à max_len caractères.

    Args:
        text (str): Texte à transformer en slug.
        max_len (int): Longueur maximale du slug généré. Défaut : 40.

    Returns:
        str: Slug utilisable comme nom de fichier.
    """
    s = re.sub(r"[^a-z0-9]+", "_", text.lower().strip())
    return s[:max_len].strip("_")


def _truncate(text: str, max_len: int) -> str:
    """
    Tronque une chaîne de caractères avec des points de suspension.

    Args:
        text (str): Texte à tronquer.
        max_len (int): Longueur maximale autorisée.

    Returns:
        str: Texte original si sa longueur est <= max_len,
            sinon texte tronqué suivi de '…'.
    """
    return text if len(text) <= max_len else text[: max_len - 1] + "…"


def _make_query_card(query: str, tile_size: int) -> Image.Image:
    """
    Génère une vignette stylisée affichant le texte de la requête.

    La vignette a un fond bleu foncé avec le texte de la requête centré,
    un en-tête 'TEXT QUERY' et un pied de page indiquant le modèle utilisé.

    Args:
        query (str): Texte de la requête médicale à afficher.
        tile_size (int): Taille en pixels du carré de la vignette.

    Returns:
        Image.Image: Vignette PIL de taille tile_size × tile_size.
    """
    img = Image.new("RGB", (tile_size, tile_size), color=(30, 58, 110))
    draw = ImageDraw.Draw(img)
    font = ImageFont.load_default()

    draw.rectangle((0, 0, tile_size, 28), fill=(20, 40, 80))
    draw.text((8, 8), "TEXT QUERY", fill=(180, 210, 255), font=font)

    wrapped = textwrap.fill(query, width=max(10, tile_size // 8))
    draw.multiline_text((12, 40), wrapped, fill=(230, 240, 255), font=font, spacing=6)

    draw.rectangle((0, tile_size - 22, tile_size, tile_size), fill=(20, 40, 80))
    draw.text((8, tile_size - 16), "BioMedCLIP  ·  semantic", fill=(140, 180, 220), font=font)

    return img


def _load_result_tile(image_path: Path, tile_size: int) -> Image.Image:
    """
    Charge une image de résultat et la redimensionne en vignette carrée (letterboxed).

    L'image est centrée sur un fond gris clair. Si le chargement échoue,
    une vignette d'erreur rouge est retournée.

    Args:
        image_path (Path): Chemin vers l'image à charger.
        tile_size (int): Taille en pixels du carré de destination.

    Returns:
        Image.Image: Vignette PIL de taille tile_size × tile_size.
    """
    tile = Image.new("RGB", (tile_size, tile_size), color=(245, 245, 245))
    try:
        with Image.open(image_path) as im:
            rgb = im.convert("RGB")
            rgb.thumbnail((tile_size, tile_size), Image.Resampling.BILINEAR)
            tile.paste(rgb, ((tile_size - rgb.width) // 2, (tile_size - rgb.height) // 2))
    except Exception:
        draw = ImageDraw.Draw(tile)
        draw.rectangle((0, 0, tile_size - 1, tile_size - 1), outline=(200, 0, 0), width=2)
        draw.text(
            (10, tile_size // 2 - 8),
            "unreadable",
            fill=(160, 0, 0),
            font=ImageFont.load_default(),
        )
    return tile


def render_text_grid(
    query: str,
    results: list[dict[str, Any]],
    output_path: Path,
    *,
    columns: int = 3,
    tile_size: int = 220,
) -> None:
    """
    Construit et sauvegarde une grille JPEG de résultats text-to-image.

    La première case contient une vignette stylisée avec le texte de la requête.
    Les cases suivantes contiennent les images résultats classées par rang de similarité.

    Args:
        query (str): Texte de la requête médicale utilisée pour la recherche.
        results (list[dict]): Liste des résultats retournés par le pipeline,
            chaque élément contenant rank, image_id, score, path, caption.
        output_path (Path): Chemin de destination du fichier JPEG généré.
        columns (int): Nombre de colonnes dans la grille. Défaut : 3.
        tile_size (int): Taille en pixels de chaque vignette. Défaut : 220.

    Returns:
        None

    Raises:
        OSError: Si le répertoire de sortie ne peut pas être créé ou si
            la sauvegarde du fichier JPEG échoue.
    """
    font = ImageFont.load_default()

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

    padding = 16
    header_h = 52
    text_h = 52
    n_rows = max(1, math.ceil(len(cards) / columns))
    width = padding + columns * (tile_size + padding)
    height = header_h + padding + n_rows * (tile_size + text_h + padding)

    sheet = Image.new("RGB", (width, height), color=(250, 250, 252))
    draw = ImageDraw.Draw(sheet)

    draw.rectangle((0, 0, width, header_h - 4), fill=(30, 58, 110))
    draw.text((padding, 10), "Text-to-Image Search — BioMedCLIP + FAISS", fill=(220, 235, 255), font=font)
    draw.text((padding, 26), f'query: "{_truncate(query, 90)}"', fill=(160, 195, 240), font=font)
    draw.text(
        (padding, 38),
        f"top-{len(results)} results  ·  semantic mode  ·  cosine similarity",
        fill=(110, 150, 200),
        font=font,
    )

    for i, card in enumerate(cards):
        row, col = divmod(i, columns)
        x0 = padding + col * (tile_size + padding)
        y0 = header_h + padding + row * (tile_size + text_h + padding)

        sheet.paste(card["tile"], (x0, y0))
        draw.rectangle((x0, y0, x0 + tile_size, y0 + tile_size), outline=(200, 210, 220), width=1)
        draw.text((x0, y0 + tile_size + 5),  _truncate(card["label"],      18), fill=(15, 15, 15),  font=font)
        draw.text((x0, y0 + tile_size + 18), _truncate(card["id_line"],    32), fill=(50, 50, 70),  font=font)
        draw.text((x0, y0 + tile_size + 32), _truncate(card["score_line"], 55), fill=(90, 90, 110), font=font)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output_path, format="JPEG", quality=92)
    print(f"Grille sauvegardée → {output_path}")


def parse_args() -> argparse.Namespace:
    """
    Analyse et retourne les arguments de la ligne de commande.

    Returns:
        argparse.Namespace: Objet contenant tous les arguments parsés :
            - query (str) : Requête textuelle médicale en anglais.
            - k (int) : Nombre de résultats top-k.
            - columns (int) : Nombre de colonnes dans la grille.
            - tile_size (int) : Taille en pixels de chaque vignette.
            - output (str | None) : Chemin de sortie optionnel.
            - index_path (str) : Chemin vers l'index FAISS sémantique.
            - ids_path (str) : Chemin vers le fichier IDs JSON sémantique.
    """
    parser = argparse.ArgumentParser(description="Grille de visualisation text-to-image top-k")
    parser.add_argument("--query", "-q", required=True,
                        help="Requête textuelle médicale (en anglais)")
    parser.add_argument("--k", type=int, default=5,
                        help=f"Nombre de résultats top-k (défaut 5, max {MAX_K})")
    parser.add_argument("--columns", type=int, default=3,
                        help="Nombre de colonnes dans la grille (défaut 3)")
    parser.add_argument("--tile-size", type=int, default=220,
                        help="Taille en pixels de chaque vignette (défaut 220)")
    parser.add_argument("--output", default=None,
                        help="Chemin de sortie (défaut: data/test/text_search_<slug>_k<k>.jpg)")
    parser.add_argument("--index-path", default="artifacts/index_semantic.faiss")
    parser.add_argument("--ids-path", default="artifacts/ids_semantic.json")
    return parser.parse_args()


def main() -> None:
    """
    Point d'entrée principal du script de génération de grille text-to-image.

    Orchestre la validation des arguments, le chargement de l'index sémantique,
    l'encodage de la requête textuelle, l'exécution de la recherche et
    le rendu de la grille JPEG de visualisation.

    Returns:
        None

    Raises:
        ValueError: Si --query est vide ou si --k est hors de l'intervalle [1, MAX_K].
        FileNotFoundError: Si l'index sémantique est introuvable.
        OSError: Si la sauvegarde de la grille JPEG échoue.
    """
    args = parse_args()

    if not args.query.strip():
        raise ValueError("--query est vide")
    if not 1 <= args.k <= MAX_K:
        raise ValueError(f"--k doit être entre 1 et {MAX_K}")

    output_path = Path(args.output) if args.output else resolve_path(
        f"data/test/text_search_{_slug(args.query)}_k{args.k}.jpg"
    )

    print("Chargement de l'index sémantique...")
    resources = load_resources(
        mode="semantic",
        index_path=resolve_path(args.index_path),
        ids_path=resolve_path(args.ids_path),
    )
    print(f"  embedder : {resources.embedder.name}  dim={resources.embedder.dim}")
    print(f"  index    : {resources.index.ntotal} vecteurs")

    print(f'Encodage de la requête : "{args.query}"')
    results = query_text(resources=resources, text=args.query, k=args.k)

    print(f"Top-{len(results)} résultats :")
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