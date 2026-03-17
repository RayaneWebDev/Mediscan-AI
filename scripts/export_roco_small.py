"""
export_roco_small.py — modifié pour supporter plusieurs fichiers parquet

Les données ROCO v2 sont stockées dans 27 fichiers parquet séparés sur HuggingFace.
Ce script pioche N images au hasard parmi tous ces fichiers et les exporte
dans data/roco_small/ avec un metadata.csv prêt pour build_index.py.
"""

from __future__ import annotations

import argparse
import csv
import json
import random
from pathlib import Path
from typing import Any

OUTPUT_ROOT = Path("data") / "roco_small"
IMAGES_DIR = OUTPUT_ROOT / "images"
METADATA_PATH = OUTPUT_ROOT / "metadata.csv"
CSV_COLUMNS = ["image_id", "path", "caption", "cui"]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--n", type=int, default=500)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--source-parquet", default=None)
    return parser.parse_args()


def discover_parquet_files(source: str | None) -> list[Path]:
    """
    NOUVEAU PAR RAPPORT À L'ORIGINAL :
    Accepte soit un fichier unique, soit un dossier contenant plusieurs parquets.
    Si on lui donne train-00000-of-00027.parquet, il détecte automatiquement
    tous les autres fichiers train-*.parquet dans le même dossier.
    """
    if source is None:
        # Cherche dans le cache HuggingFace par défaut (C:/Users/.../.cache/huggingface)
        cache_dir = (
            Path.home()
            / ".cache" / "huggingface" / "hub"
            / "datasets--eltorio--ROCOv2-radiology" / "blobs"
        )
        if cache_dir.exists():
            candidates = sorted(
                [p for p in cache_dir.glob("*")
                 if p.is_file()
                 and not p.name.endswith(".incomplete")
                 and p.stat().st_size > 1024 * 1024],
                key=lambda p: p.stat().st_size,
                reverse=True,
            )
            if candidates:
                return candidates
        raise FileNotFoundError("No ROCO parquet source found. Provide --source-parquet.")

    path = Path(source).expanduser().resolve()

    if path.is_dir():
        # Si c'est un dossier, prend tous les fichiers train-*.parquet dedans
        files = sorted(path.glob("train-*.parquet"))
        if not files:
            raise FileNotFoundError(f"No train parquet files found in: {path}")
        return files

    if path.is_file():
        # Si c'est un fichier, cherche ses "frères" train-*.parquet dans le même dossier
        # C'est ce qui permet de donner train-00000 et d'avoir automatiquement les 27
        siblings = sorted(path.parent.glob("train-*.parquet"))
        if siblings:
            return siblings
        return [path]

    raise FileNotFoundError(f"Source parquet not found: {path}")


def ensure_pyarrow() -> Any:
    """pyarrow est nécessaire pour lire les fichiers .parquet"""
    try:
        import pyarrow.parquet as pq
    except ImportError as exc:
        raise RuntimeError("pip install pyarrow") from exc
    return pq


def count_total_rows(pq: Any, parquet_files: list[Path]) -> int:
    """
    Compte le nombre total de lignes sur TOUS les fichiers parquet.
    On lit juste les métadonnées (rapide), pas les données elles-mêmes.
    Sur 27 fichiers ROCO v2 → ~60 000 lignes au total.
    """
    total = 0
    for path in parquet_files:
        metadata = pq.read_metadata(path)
        total += int(metadata.num_rows)
    return total


def sample_indices(total: int, n: int, seed: int) -> list[int]:
    """
    Tire au sort N indices parmi [0, total-1] de façon déterministe.
    Le seed=42 garantit qu'on obtient toujours les mêmes images → reproductibilité.
    Les indices sont triés pour pouvoir les parcourir dans l'ordre (lecture séquentielle).
    """
    if n <= 0:
        raise ValueError("--n must be a positive integer")
    if n > total:
        raise ValueError(f"Requested n={n} but only {total} rows available")
    rng = random.Random(seed)
    sampled = rng.sample(range(total), n)
    sampled.sort()  # Important : tri pour lecture séquentielle efficace
    return sampled


def read_selected_rows_multi(
    pq: Any,
    parquet_files: list[Path],
    selected_indices: list[int],
) -> list[dict[str, Any]]:
    """
    NOUVEAU PAR RAPPORT À L'ORIGINAL :
    Lit les lignes sélectionnées en parcourant les fichiers parquet un par un.

    Fonctionnement :
    - global_index : position absolue dans l'ensemble des 27 fichiers
    - pointer : index dans notre liste d'indices sélectionnés
    - Quand global_index == selected_indices[pointer], on garde la ligne
    
    Exemple : si on veut les indices [5, 2300, 4100]
    - indices 0-4 dans fichier 1 → ignorés
    - indice 5 dans fichier 1 → gardé (pointer passe à 1)
    - indices 6-2299 → ignorés
    - indice 2300 (dans fichier 2) → gardé (pointer passe à 2)
    - etc.
    """
    rows: list[dict[str, Any]] = []
    pointer = 0
    target_count = len(selected_indices)
    global_index = 0

    for parquet_path in parquet_files:
        if pointer >= target_count:
            break  # On a tout ce qu'il faut, inutile de lire les fichiers suivants

        parquet_file = pq.ParquetFile(parquet_path)
        # iter_batches lit par lots de 128 lignes (économise la RAM)
        for batch in parquet_file.iter_batches(
            columns=["image", "image_id", "caption", "cui"],
            batch_size=128,
            use_threads=False,
        ):
            if pointer >= target_count:
                break

            for row in batch.to_pylist():
                if pointer >= target_count:
                    break
                if global_index == selected_indices[pointer]:
                    rows.append(row)
                    pointer += 1
                global_index += 1

    if len(rows) != target_count:
        raise RuntimeError(f"Expected {target_count} rows, got {len(rows)}")
    return rows


def infer_image_extension(image_bytes: bytes) -> str:
    """
    Détecte le format de l'image à partir de ses premiers octets (magic bytes).
    On ne fait pas confiance à l'extension du fichier source — on lit le vrai format.
    PNG commence par \x89PNG, JPEG par \xff\xd8\xff, etc.
    """
    if image_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
        return ".png"
    if image_bytes.startswith(b"\xff\xd8\xff"):
        return ".jpg"
    if image_bytes.startswith((b"II*\x00", b"MM\x00*")):
        return ".tif"
    if image_bytes.startswith(b"GIF87a") or image_bytes.startswith(b"GIF89a"):
        return ".gif"
    return ".jpg"  # fallback


def row_to_export_fields(row: dict[str, Any]) -> tuple[str, str, str, str, bytes]:
    """
    Extrait les champs utiles d'une ligne parquet.

    CUI : dans le parquet c'est une liste Python ["C0037949", "C1306645"]
    On la sérialise en JSON string pour le CSV → '["C0037949", "C1306645"]'
    C'est ce format que dataset.py et query.py savent lire.
    """
    image_id = str(row.get("image_id", "")).strip()
    caption = str(row.get("caption", "")).strip()

    raw_cui = row.get("cui")
    cui_serialized = json.dumps(
        [str(v) for v in raw_cui] if isinstance(raw_cui, list) else [],
        ensure_ascii=False
    )

    raw_image = row.get("image")
    image_bytes: bytes | None = None

    if isinstance(raw_image, dict):
        raw_bytes = raw_image.get("bytes")
        if isinstance(raw_bytes, (bytes, bytearray)):
            image_bytes = bytes(raw_bytes)

    if not image_id:
        raise ValueError("Missing image_id")
    if image_bytes is None or len(image_bytes) == 0:
        raise ValueError(f"Empty image for {image_id}")

    extension = infer_image_extension(image_bytes)
    relative_path = f"data/roco_small/images/{image_id}{extension}"
    return image_id, relative_path, caption, cui_serialized, image_bytes


def clean_existing_images(images_dir: Path) -> None:
    """Supprime les images existantes avant un nouvel export (évite les doublons)."""
    allowed = {".jpg", ".jpeg", ".png", ".tif", ".tiff", ".gif", ".bmp"}
    for p in images_dir.iterdir():
        if p.is_file() and p.suffix.lower() in allowed:
            p.unlink()


def write_dataset(n: int, seed: int, parquet_files: list[Path]) -> None:
    pq = ensure_pyarrow()

    print(f"Found {len(parquet_files)} parquet file(s).")
    total_rows = count_total_rows(pq, parquet_files)
    print(f"Total rows available: {total_rows}")

    selected_indices = sample_indices(total=total_rows, n=n, seed=seed)
    print(f"Sampling {n} rows with seed={seed}...")
    selected_rows = read_selected_rows_multi(pq, parquet_files, selected_indices)

    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    clean_existing_images(IMAGES_DIR)

    with METADATA_PATH.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_COLUMNS, lineterminator="\n")
        writer.writeheader()
        for i, row in enumerate(selected_rows, start=1):
            image_id, relative_path, caption, cui, image_bytes = row_to_export_fields(row)
            (OUTPUT_ROOT / relative_path.removeprefix("data/roco_small/")).write_bytes(image_bytes)
            writer.writerow({"image_id": image_id, "path": relative_path, "caption": caption, "cui": cui})
            if i % 1000 == 0:
                print(f"Exported {i}/{n} images...")

    print(f"Done! Exported {n} images to {IMAGES_DIR} and {METADATA_PATH}")


def main() -> None:
    args = parse_args()
    parquet_files = discover_parquet_files(args.source_parquet)
    write_dataset(n=args.n, seed=args.seed, parquet_files=parquet_files)


if __name__ == "__main__":
    main()