#!/usr/bin/env python3
"""
Génère deux grilles de comparaison visuelle et sémantique pour MediScan AI.

Ce script illustre la différence fondamentale entre les deux modes de recherche :
- Mode visuel (DINOv2) : "ce que l'image montre" — similarité de forme, texture, structure.
- Mode sémantique (BioMedCLIP) : "ce que l'image signifie médicalement" — pathologie, modalité.

Pour chaque mode, une image requête est sélectionnée automatiquement ou manuellement,
une recherche top-k est exécutée, et les résultats sont rendus dans une grille JPEG.

Usage :
    python scripts/visualization/demo_dual_mode_grid.py --k 5
    python scripts/visualization/demo_dual_mode_grid.py --image path/to/image.jpg --k 8
    python scripts/visualization/demo_dual_mode_grid.py --visual-image img1.jpg --semantic-image img2.jpg
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

SEMANTIC_KEYWORDS = (
    "subarachnoid", "hematoma", "hemorrhage", "aneurysm", "metastasis",
    "tumor", "lesion", "abscess", "stroke", "fracture",
    "pneumothorax", "effusion", "edema", "cyst",
)
VISUAL_KEYWORDS = (
    "chest radiograph", "chest x-ray", "radiograph", "x-ray",
    "anteroposterior", "postero-anterior", "axial ct",
    "coronal ct", "sagittal mri", "t1 weighted", "t2 weighted",
)


def parse_args() -> argparse.Namespace:
    """
    Analyse et retourne les arguments de la ligne de commande.

    Returns:
        argparse.Namespace: Objet contenant tous les arguments parsés :
            - image (str | None) : Image partagée pour les deux modes.
            - visual_image (str | None) : Image spécifique au mode visuel.
            - semantic_image (str | None) : Image spécifique au mode sémantique.
            - k (int) : Nombre de résultats top-k.
            - columns (int) : Nombre de colonnes dans la grille.
            - tile_size (int) : Taille en pixels de chaque vignette.
            - metadata (str) : Chemin vers le fichier metadata.csv.
            - output_visual (str) : Chemin de sortie de la grille visuelle.
            - output_semantic (str) : Chemin de sortie de la grille sémantique.
    """
    parser = argparse.ArgumentParser(description="Génère des grilles de comparaison visual vs semantic")
    parser.add_argument("--image", default=None,
                        help="Image requête partagée pour les deux modes")
    parser.add_argument("--visual-image", default=None,
                        help="Image requête spécifique au mode visuel")
    parser.add_argument("--semantic-image", default=None,
                        help="Image requête spécifique au mode sémantique")
    parser.add_argument("--k", type=int, default=5,
                        help=f"Nombre de résultats top-k (max {MAX_K})")
    parser.add_argument("--columns", type=int, default=3,
                        help="Nombre de colonnes dans la grille")
    parser.add_argument("--tile-size", type=int, default=220,
                        help="Taille en pixels de chaque vignette")
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
    Parse le champ CUI d'un enregistrement pour estimer sa richesse sémantique.

    Args:
        raw_cui (str): Valeur brute du champ CUI (JSON sérialisé ou chaîne vide).

    Returns:
        int: Nombre de concepts CUI présents, ou 0 si le champ est vide ou invalide.
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
    Collecte les mots-clés présents dans un texte pour le scoring automatique.

    Args:
        text (str): Texte à analyser (généralement une caption d'image).
        keywords (tuple[str, ...]): Liste de mots-clés à rechercher dans le texte.

    Returns:
        list[str]: Liste des mots-clés trouvés dans le texte.
    """
    lowered = text.lower()
    return [keyword for keyword in keywords if keyword in lowered]


def score_visual_query(record: MetadataRecord) -> tuple[int, list[str]]:
    """
    Évalue la pertinence d'une image pour démontrer la recherche visuelle.

    Favorise les images dont la caption mentionne des modalités d'imagerie
    reconnaissables visuellement (radio, CT, IRM) et pénalise les images
    trop chargées en contenu sémantique (pathologies complexes).

    Args:
        record (MetadataRecord): Enregistrement du dataset à évaluer.

    Returns:
        tuple[int, list[str]]: Un couple contenant :
            - Le score de pertinence visuelle (plus élevé = plus pertinent).
            - La liste des mots-clés visuels trouvés dans la caption.
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
    Évalue la pertinence d'une image pour démontrer la recherche sémantique.

    Favorise les images dont la caption mentionne des pathologies spécifiques
    et dont les métadonnées CUI sont riches en concepts médicaux.

    Args:
        record (MetadataRecord): Enregistrement du dataset à évaluer.

    Returns:
        tuple[int, list[str]]: Un couple contenant :
            - Le score de pertinence sémantique (plus élevé = plus pertinent).
            - La liste des mots-clés sémantiques trouvés dans la caption.
    """
    caption = record.caption.lower()
    matches = collect_matches(caption, SEMANTIC_KEYWORDS)
    score = len(matches) * 5
    score += min(len(caption.split()), 20) // 4
    score += min(parse_cui_count(record.cui), 3)
    if "showing" in caption or "demonstrating" in caption:
        score += 1
    return score, matches


def auto_choose_query(
    records: list[MetadataRecord],
    mode: str,
) -> tuple[MetadataRecord, str]:
    """
    Choisit automatiquement l'image requête la plus pertinente pour un mode donné.

    Parcourt tous les enregistrements du dataset et sélectionne celui
    qui obtient le score le plus élevé selon le mode (visuel ou sémantique).

    Args:
        records (list[MetadataRecord]): Liste de tous les enregistrements du dataset.
        mode (str): Mode de recherche ('visual' ou 'semantic').

    Returns:
        tuple[MetadataRecord, str]: Un couple contenant :
            - L'enregistrement sélectionné comme image requête.
            - Une description de la raison de la sélection.
    """
    scorer = score_visual_query if mode == "visual" else score_semantic_query
    best_record = records[0]
    best_score = -(10**9)
    best_matches: list[str] = []

    for record in records:
        score, matches = scorer(record)
        if score > best_score:
            best_record = record
            best_score = score
            best_matches = matches

    if best_matches:
        return best_record, f"auto-selected {mode} query: {', '.join(best_matches[:3])}"
    return best_record, f"auto-selected fallback {mode} query"


def find_query_record(
    records: list[MetadataRecord],
    image_path: Path,
) -> MetadataRecord:
    """
    Trouve l'enregistrement du dataset correspondant à une image donnée.

    Compare à la fois les identifiants d'image (stem du fichier) et les
    chemins absolus pour identifier l'enregistrement correspondant.

    Args:
        records (list[MetadataRecord]): Liste de tous les enregistrements du dataset.
        image_path (Path): Chemin vers l'image requête à identifier.

    Returns:
        MetadataRecord: L'enregistrement correspondant à l'image.

    Raises:
        RuntimeError: Si aucun enregistrement correspondant n'est trouvé
            dans le fichier metadata.csv.
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
    raise RuntimeError(f"Image requête introuvable dans metadata.csv : {image_path}")


def resolve_query_for_mode(
    records: list[MetadataRecord],
    mode: str,
    manual_image: str | None,
    shared_image: str | None,
) -> tuple[MetadataRecord, Path, str]:
    """
    Détermine l'image requête à utiliser pour un mode de recherche donné.

    Priorité : image manuelle spécifique au mode > image partagée > sélection automatique.

    Args:
        records (list[MetadataRecord]): Liste de tous les enregistrements du dataset.
        mode (str): Mode de recherche ('visual' ou 'semantic').
        manual_image (str | None): Chemin vers une image spécifique au mode.
        shared_image (str | None): Chemin vers une image partagée entre les deux modes.

    Returns:
        tuple[MetadataRecord, Path, str]: Un triplet contenant :
            - L'enregistrement sélectionné.
            - Le chemin absolu de l'image requête.
            - Une description de la raison de la sélection.

    Raises:
        FileNotFoundError: Si l'image spécifiée manuellement est introuvable.
    """
    selected_image = manual_image or shared_image
    if selected_image:
        query_image = resolve_path(selected_image)
        if not query_image.exists():
            raise FileNotFoundError(f"Image {mode} introuvable : {query_image}")
        reason = (
            f"image {mode} manuelle"
            if manual_image
            else f"image partagée réutilisée pour {mode}"
        )
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
    Exécute une recherche d'images similaires via le pipeline MediScan.

    Args:
        query_image (Path): Chemin vers l'image requête.
        mode (str): Mode de recherche ('visual' ou 'semantic').
        model_name (str | None): Surcharge optionnelle du nom du modèle.
        index_path (Path): Chemin vers l'index FAISS à utiliser.
        ids_path (Path): Chemin vers le fichier IDs JSON associé.
        k (int): Nombre de résultats à retourner.

    Returns:
        list[dict]: Liste des k résultats, chacun contenant rank, image_id,
            score, path, caption, cui.
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
    Tronque une chaîne de caractères avec des points de suspension.

    Args:
        text (str): Texte à tronquer.
        max_len (int): Longueur maximale autorisée.

    Returns:
        str: Texte original si sa longueur est <= max_len,
            sinon texte tronqué suivi de '...'.
    """
    return text if len(text) <= max_len else text[: max_len - 3] + "..."


def load_tile_image(image_path: Path, tile_size: int) -> Image.Image:
    """
    Charge une image et la redimensionne en vignette carrée (letterboxed).

    L'image est centrée sur un fond gris clair. Si le chargement échoue,
    une vignette d'erreur rouge est retournée à la place.

    Args:
        image_path (Path): Chemin vers l'image à charger.
        tile_size (int): Taille en pixels du carré de destination.

    Returns:
        Image.Image: Vignette PIL de taille tile_size × tile_size.
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
        draw.text(
            (10, tile_size // 2 - 8),
            "unreadable",
            fill=(160, 0, 0),
            font=ImageFont.load_default(),
        )
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
    Construit et sauvegarde une grille JPEG avec la requête et les résultats top-k.

    La première case de la grille contient toujours l'image requête avec le
    label 'QUERY'. Les cases suivantes contiennent les résultats classés par rang.

    Args:
        title (str): Titre principal affiché en haut de la grille.
        subtitle (str): Sous-titre affiché sous le titre (ex: query_id).
        query_image (Path): Chemin vers l'image requête.
        results (list[dict]): Liste des résultats à afficher.
        output_path (Path): Chemin de destination du fichier JPEG généré.
        columns (int): Nombre de colonnes dans la grille.
        tile_size (int): Taille en pixels de chaque vignette.

    Returns:
        None

    Raises:
        OSError: Si le répertoire de sortie ne peut pas être créé ou si
            la sauvegarde du fichier échoue.
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
        draw.text((x0, y0 + tile_size + 6),  truncate(str(card["title"]),    24), fill=(20, 20, 20), font=font)
        draw.text((x0, y0 + tile_size + 20), truncate(str(card["subtitle"]), 32), fill=(40, 40, 40), font=font)
        draw.text((x0, y0 + tile_size + 34), truncate(str(card["meta"]),     36), fill=(70, 70, 70), font=font)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    if output_path.suffix.lower() in {".jpg", ".jpeg"}:
        sheet.save(output_path, format="JPEG", quality=90)
    elif output_path.suffix.lower() == ".png":
        sheet.save(output_path, format="PNG")
    else:
        sheet.save(output_path)


def main() -> None:
    """
    Point d'entrée principal du script de génération des grilles de comparaison.

    Orchestre la sélection des images requêtes, l'exécution des recherches
    visuelle et sémantique, et le rendu des deux grilles JPEG de sortie.

    Returns:
        None

    Raises:
        ValueError: Si --k est hors de l'intervalle [1, MAX_K].
        RuntimeError: Si le dataset est vide.
        FileNotFoundError: Si une image requête spécifiée manuellement est introuvable.
    """
    args = parse_args()
    if not 0 < args.k <= MAX_K:
        raise ValueError(f"--k doit être entre 1 et {MAX_K}")

    records = RocoDataset(metadata_csv=resolve_path(args.metadata)).records
    if not records:
        raise RuntimeError("Dataset vide")

    visual_record, visual_image, visual_reason = resolve_query_for_mode(
        records, "visual", args.visual_image, args.image
    )
    semantic_record, semantic_image, semantic_reason = resolve_query_for_mode(
        records, "semantic", args.semantic_image, args.image
    )

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
    print(f"semantic_query_reason={semantic_reason}")
    print(f"semantic_query_image={semantic_image}")
    print(f"semantic_query_id={semantic_record.image_id}")
    print(f"semantic_query_caption={semantic_record.caption}")


if __name__ == "__main__":
    main()