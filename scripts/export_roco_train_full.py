#!/usr/bin/env python3
"""
Download the full ROCOv2 radiology train split into a local folder.

Outputs:
- data/roco_train_full/images/
- data/roco_train_full/metadata.csv

The script uses HuggingFace streaming + raw image bytes to avoid loading the
whole dataset in memory and to preserve the original image format.
"""

from __future__ import annotations

import argparse
import csv
import json
import time
from pathlib import Path

from datasets import Image as HFImage
from datasets import load_dataset

CSV_COLUMNS = ["image_id", "path", "caption", "cui"]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Download full ROCOv2 radiology train split")
    parser.add_argument("--split", default="train", choices=("train", "validation", "test"))
    parser.add_argument("--output-root", default="data/roco_train_full")
    parser.add_argument(
        "--log-every",
        type=int,
        default=100,
        help="Print progress every N exported images",
    )
    return parser.parse_args()


def infer_image_extension(image_bytes: bytes) -> str:
    if image_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
        return ".png"
    if image_bytes.startswith(b"\xff\xd8\xff"):
        return ".jpg"
    if image_bytes.startswith((b"II*\x00", b"MM\x00*")):
        return ".tif"
    if image_bytes.startswith(b"GIF87a") or image_bytes.startswith(b"GIF89a"):
        return ".gif"
    return ".png"


def build_paths(output_root: Path) -> tuple[Path, Path]:
    images_dir = output_root / "images"
    metadata_path = output_root / "metadata.csv"
    images_dir.mkdir(parents=True, exist_ok=True)
    metadata_path.parent.mkdir(parents=True, exist_ok=True)
    return images_dir, metadata_path


def main() -> None:
    args = parse_args()

    output_root = Path(args.output_root)
    images_dir, metadata_path = build_paths(output_root)

    dataset = load_dataset(
        "eltorio/ROCOv2-radiology",
        split=args.split,
        streaming=True,
    ).cast_column("image", HFImage(decode=False))

    start = time.time()
    exported = 0

    with metadata_path.open("w", newline="", encoding="utf-8") as metadata_file:
        writer = csv.DictWriter(metadata_file, fieldnames=CSV_COLUMNS, lineterminator="\n")
        writer.writeheader()

        for row in dataset:
            image_id = str(row.get("image_id", "")).strip()
            image_blob = row.get("image") or {}
            image_bytes = image_blob.get("bytes")

            if not image_id or not isinstance(image_bytes, (bytes, bytearray)) or not image_bytes:
                continue

            extension = infer_image_extension(bytes(image_bytes))
            image_path = images_dir / f"{image_id}{extension}"
            image_path.write_bytes(bytes(image_bytes))

            rel_path = f"{output_root.as_posix()}/images/{image_id}{extension}"
            caption = str(row.get("caption", "") or "").strip()
            cui = json.dumps(row.get("cui") or [], ensure_ascii=False)

            writer.writerow(
                {
                    "image_id": image_id,
                    "path": rel_path,
                    "caption": caption,
                    "cui": cui,
                }
            )

            exported += 1
            if exported % args.log_every == 0:
                elapsed = time.time() - start
                rate = exported / elapsed if elapsed > 0 else 0.0
                print(
                    f"exported={exported} elapsed={elapsed:.1f}s rate={rate:.2f} img/s "
                    f"last={image_id}",
                    flush=True,
                )

    elapsed = time.time() - start
    print(
        f"done split={args.split} exported={exported} output_root={output_root} "
        f"elapsed={elapsed:.1f}s",
        flush=True,
    )


if __name__ == "__main__":
    main()
