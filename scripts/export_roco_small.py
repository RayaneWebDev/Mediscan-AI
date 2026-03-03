#!/usr/bin/env python3
"""Export a deterministic ROCO-small subset from real ROCOv2 parquet data.

This script generates:
- data/roco_small/images/*.(jpg|png|tif|gif)
- data/roco_small/metadata.csv

CSV columns are stable and ordered as:
image_id,path,caption,cui
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
    parser = argparse.ArgumentParser(
        description="Export a real ROCOv2 subset into data/roco_small."
    )
    parser.add_argument(
        "--n",
        type=int,
        default=500,
        help="Number of images to export (default: 500)",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Random seed for deterministic sampling (default: 42)",
    )
    parser.add_argument(
        "--source-parquet",
        default=None,
        help=(
            "Path to ROCOv2 parquet file (expects columns image,image_id,caption,cui). "
            "If omitted, the script tries to auto-discover from HuggingFace cache."
        ),
    )
    return parser.parse_args()


def discover_parquet_from_hf_cache() -> Path | None:
    cache_dir = (
        Path.home()
        / ".cache"
        / "huggingface"
        / "hub"
        / "datasets--eltorio--ROCOv2-radiology"
        / "blobs"
    )
    if not cache_dir.exists():
        return None

    candidates = []
    for path in sorted(cache_dir.glob("*")):
        if not path.is_file():
            continue
        if path.name.endswith(".incomplete"):
            continue
        if path.stat().st_size < 1024 * 1024:
            continue
        candidates.append(path)

    return max(candidates, key=lambda p: p.stat().st_size) if candidates else None


def ensure_pyarrow() -> Any:
    try:
        import pyarrow.parquet as pq  # type: ignore
    except ImportError as exc:  # pragma: no cover
        raise RuntimeError(
            "pyarrow is required for ROCO parquet export. "
            "Install it in your environment before running this script."
        ) from exc
    return pq


def clean_existing_images(images_dir: Path) -> None:
    allowed_suffixes = {".jpg", ".jpeg", ".png", ".tif", ".tiff", ".gif", ".bmp"}
    for image_path in images_dir.iterdir():
        if image_path.is_file() and image_path.suffix.lower() in allowed_suffixes:
            image_path.unlink()


def parquet_row_count(pq: Any, parquet_path: Path) -> int:
    metadata = pq.read_metadata(parquet_path)
    return int(metadata.num_rows)


def sample_indices(total: int, n: int, seed: int) -> list[int]:
    if n <= 0:
        raise ValueError("--n must be a positive integer")
    if n > total:
        raise ValueError(
            f"Requested n={n} but source parquet only contains {total} rows"
        )

    rng = random.Random(seed)
    sampled = rng.sample(range(total), n)
    sampled.sort()
    return sampled


def read_selected_rows(
    pq: Any,
    parquet_path: Path,
    selected_indices: list[int],
) -> list[dict[str, Any]]:
    parquet_file = pq.ParquetFile(parquet_path)
    rows: list[dict[str, Any]] = []

    pointer = 0
    target_count = len(selected_indices)
    global_index = 0

    for batch in parquet_file.iter_batches(
        columns=["image", "image_id", "caption", "cui"],
        batch_size=128,
        use_threads=False,
    ):
        py_rows = batch.to_pylist()
        for row in py_rows:
            if pointer >= target_count:
                break

            if global_index == selected_indices[pointer]:
                rows.append(row)
                pointer += 1

            global_index += 1

        if pointer >= target_count:
            break

    if len(rows) != target_count:
        raise RuntimeError(
            f"Internal export error: expected {target_count} rows, got {len(rows)}"
        )

    return rows


def infer_image_extension(image_bytes: bytes) -> str:
    if image_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
        return ".png"
    if image_bytes.startswith(b"\xff\xd8\xff"):
        return ".jpg"
    if image_bytes.startswith((b"II*\x00", b"MM\x00*")):
        return ".tif"
    if image_bytes.startswith(b"GIF87a") or image_bytes.startswith(b"GIF89a"):
        return ".gif"
    return ".jpg"


def row_to_export_fields(row: dict[str, Any]) -> tuple[str, str, str, str, bytes]:
    image_id = str(row.get("image_id", "")).strip()
    caption = str(row.get("caption", "")).strip()

    raw_cui = row.get("cui")
    if isinstance(raw_cui, list):
        cui_values = [str(value) for value in raw_cui]
    else:
        cui_values = []
    cui_serialized = json.dumps(cui_values, ensure_ascii=False)

    raw_image = row.get("image")
    image_bytes: bytes | None = None
    source_path: str | None = None

    if isinstance(raw_image, dict):
        raw_bytes = raw_image.get("bytes")
        if isinstance(raw_bytes, (bytes, bytearray)):
            image_bytes = bytes(raw_bytes)

        raw_path = raw_image.get("path")
        if isinstance(raw_path, str) and raw_path.strip():
            source_path = raw_path.strip()

    if not image_id:
        raise ValueError("Missing image_id in source row")

    if image_bytes is None:
        if source_path is None:
            raise ValueError(f"Row {image_id} has no image bytes and no image path")
        source_file = Path(source_path)
        if not source_file.exists():
            raise FileNotFoundError(f"Source image path not found for {image_id}: {source_file}")
        image_bytes = source_file.read_bytes()

    if len(image_bytes) == 0:
        raise ValueError(f"Empty image content for {image_id}")

    extension = infer_image_extension(image_bytes)
    file_name = f"{image_id}{extension}"
    relative_path = f"data/roco_small/images/{file_name}"

    return image_id, relative_path, caption, cui_serialized, image_bytes


def write_dataset(n: int, seed: int, source_parquet: Path) -> None:
    pq = ensure_pyarrow()

    if not source_parquet.exists():
        raise FileNotFoundError(f"Source parquet not found: {source_parquet}")

    total_rows = parquet_row_count(pq, source_parquet)
    selected_indices = sample_indices(total=total_rows, n=n, seed=seed)
    selected_rows = read_selected_rows(pq, source_parquet, selected_indices)

    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    clean_existing_images(IMAGES_DIR)

    with METADATA_PATH.open("w", newline="", encoding="utf-8") as csv_file:
        writer = csv.DictWriter(
            csv_file,
            fieldnames=CSV_COLUMNS,
            lineterminator="\n",
        )
        writer.writeheader()

        for row in selected_rows:
            image_id, relative_path, caption, cui, image_bytes = row_to_export_fields(row)
            image_path = OUTPUT_ROOT / relative_path.removeprefix("data/roco_small/")
            image_path.write_bytes(image_bytes)

            writer.writerow(
                {
                    "image_id": image_id,
                    "path": relative_path,
                    "caption": caption,
                    "cui": cui,
                }
            )


def main() -> None:
    args = parse_args()

    source_parquet = (
        Path(args.source_parquet).expanduser().resolve()
        if args.source_parquet
        else discover_parquet_from_hf_cache()
    )

    if source_parquet is None:
        raise FileNotFoundError(
            "No ROCO parquet source found. Provide --source-parquet explicitly."
        )

    write_dataset(n=args.n, seed=args.seed, source_parquet=source_parquet)
    print(
        f"Exported {args.n} real ROCO samples from {source_parquet} "
        f"to {IMAGES_DIR} and {METADATA_PATH}"
    )


if __name__ == "__main__":
    main()
