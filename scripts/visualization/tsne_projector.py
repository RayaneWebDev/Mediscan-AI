#!/usr/bin/env python3
"""
Prepare TensorBoard Projector logs from an existing FAISS index.

This script does not recompute embeddings. It reuses vectors already stored in
`artifacts/*.faiss`, aligns them with `ids*.json`, and writes a TensorBoard
Projector-compatible log directory. TensorBoard then computes PCA / t-SNE in
the UI, which is the intended workflow from the official Projector docs.
"""

from __future__ import annotations

import argparse
import json
import os
import random
import sys
from datetime import datetime
from pathlib import Path

os.environ.setdefault("KMP_DUPLICATE_LIB_OK", "TRUE")
os.environ.setdefault("OMP_NUM_THREADS", "1")

import faiss
import numpy as np
import torch
from PIL import Image
from torchvision import transforms

PROJECT_ROOT = Path(__file__).resolve().parents[2]
MAX_POINTS = 10000


def resolve_path(raw_path: str | Path) -> Path:
    path = Path(raw_path)
    if path.is_absolute():
        return path
    return PROJECT_ROOT / path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Prepare TensorBoard Projector logs for MEDISCAN embeddings"
    )
    parser.add_argument(
        "--mode",
        default="visual",
        choices=("visual", "semantic"),
        help="Choose the default FAISS index pair to export",
    )
    parser.add_argument("--index-path", default=None, help="FAISS index path override")
    parser.add_argument("--ids-path", default=None, help="ids.json path override")
    parser.add_argument(
        "--logdir",
        default=None,
        help="Output log directory. Defaults to artifacts/projector_logs/<mode>_<timestamp>",
    )
    parser.add_argument(
        "--tag",
        default="embeddings",
        help="Embedding tag shown inside TensorBoard Projector",
    )
    parser.add_argument(
        "--max-points",
        type=int,
        default=0,
        help=f"Optional deterministic subsampling. 0 means all points, max {MAX_POINTS}",
    )
    parser.add_argument("--seed", type=int, default=42, help="Seed used for subsampling")
    parser.add_argument(
        "--thumb-size",
        type=int,
        default=48,
        help="Thumbnail size used for the Projector sprite image",
    )
    parser.add_argument(
        "--no-images",
        action="store_true",
        help="Do not attach image thumbnails to the projector logs",
    )
    return parser.parse_args()


def default_paths_for_mode(mode: str) -> tuple[Path, Path]:
    if mode == "visual":
        return (
            resolve_path("artifacts/index.faiss"),
            resolve_path("artifacts/ids.json"),
        )
    return (
        resolve_path("artifacts/index_semantic.faiss"),
        resolve_path("artifacts/ids_semantic.json"),
    )


def sanitize_cell(value: object) -> str:
    return str(value).replace("\t", " ").replace("\r", " ").replace("\n", " ").strip()


def parse_cui_count(raw_cui: str) -> int:
    if not raw_cui:
        return 0
    try:
        parsed = json.loads(raw_cui)
    except json.JSONDecodeError:
        return 0
    return len(parsed) if isinstance(parsed, list) else 0


def load_indexed_rows(ids_path: Path) -> list[dict[str, str]]:
    if not ids_path.exists():
        raise FileNotFoundError(f"IDs file not found: {ids_path}")
    with ids_path.open("r", encoding="utf-8") as ids_file:
        rows = json.load(ids_file)
    if not isinstance(rows, list):
        raise RuntimeError("Invalid ids file: expected a JSON list")
    if not rows:
        raise RuntimeError("IDs file is empty")
    return rows


def load_embeddings(index_path: Path) -> np.ndarray:
    if not index_path.exists():
        raise FileNotFoundError(f"FAISS index not found: {index_path}")

    index = faiss.read_index(str(index_path))
    if index.ntotal <= 0:
        raise RuntimeError("FAISS index is empty")

    try:
        matrix = index.reconstruct_n(0, index.ntotal)
    except Exception:
        try:
            matrix = np.vstack([index.reconstruct(i) for i in range(index.ntotal)])
        except Exception as exc:
            raise RuntimeError(
                "Unable to reconstruct vectors from this FAISS index type"
            ) from exc

    matrix = np.asarray(matrix, dtype=np.float32)
    if matrix.ndim != 2:
        raise RuntimeError(f"Expected a 2D embedding matrix, got shape={matrix.shape}")
    return matrix


def select_indices(total: int, max_points: int, seed: int) -> list[int]:
    if max_points <= 0 or max_points >= total:
        return list(range(total))
    if max_points > MAX_POINTS:
        raise ValueError(f"--max-points must be <= {MAX_POINTS}")
    rng = random.Random(seed)
    selected = rng.sample(range(total), max_points)
    selected.sort()
    return selected


def build_metadata(rows: list[dict[str, str]]) -> tuple[list[str], list[list[str]]]:
    headers = ["image_id", "path", "cui_count", "cui", "caption"]
    metadata: list[list[str]] = []

    for row in rows:
        cui_raw = sanitize_cell(row.get("cui", ""))
        metadata.append(
            [
                sanitize_cell(row.get("image_id", "")),
                sanitize_cell(row.get("path", "")),
                str(parse_cui_count(cui_raw)),
                cui_raw,
                sanitize_cell(row.get("caption", "")),
            ]
        )

    return headers, metadata


def load_label_images(rows: list[dict[str, str]], thumb_size: int) -> torch.Tensor:
    resize = transforms.Resize((thumb_size, thumb_size))
    to_tensor = transforms.ToTensor()
    label_images: list[torch.Tensor] = []

    for row in rows:
        image_path = resolve_path(row.get("path", ""))
        try:
            with Image.open(image_path) as image:
                rgb = image.convert("RGB")
        except Exception:
            rgb = Image.new("RGB", (thumb_size, thumb_size), color=(245, 245, 245))

        label_images.append(to_tensor(resize(rgb)))

    return torch.stack(label_images, dim=0)


def build_default_logdir(mode: str) -> Path:
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    return resolve_path(Path("artifacts") / "projector_logs" / f"{mode}_{timestamp}")


def import_summary_writer():
    try:
        from torch.utils.tensorboard import SummaryWriter
    except ModuleNotFoundError as exc:
        raise RuntimeError(
            "TensorBoard is not installed. Run: python -m pip install -r requirements.txt"
        ) from exc
    return SummaryWriter


def main() -> None:
    args = parse_args()
    summary_writer_cls = import_summary_writer()

    default_index_path, default_ids_path = default_paths_for_mode(args.mode)
    index_path = resolve_path(args.index_path) if args.index_path else default_index_path
    ids_path = resolve_path(args.ids_path) if args.ids_path else default_ids_path
    logdir = resolve_path(args.logdir) if args.logdir else build_default_logdir(args.mode)

    rows = load_indexed_rows(ids_path)
    embeddings = load_embeddings(index_path)

    if len(rows) != embeddings.shape[0]:
        raise RuntimeError(
            f"Index/IDs mismatch: embeddings={embeddings.shape[0]}, ids={len(rows)}"
        )

    selected = select_indices(total=len(rows), max_points=args.max_points, seed=args.seed)
    selected_rows = [rows[i] for i in selected]
    selected_embeddings = embeddings[selected]

    metadata_header, metadata = build_metadata(selected_rows)
    label_img = None if args.no_images else load_label_images(selected_rows, args.thumb_size)

    logdir.mkdir(parents=True, exist_ok=True)
    writer = summary_writer_cls(log_dir=str(logdir))
    writer.add_embedding(
        mat=torch.from_numpy(selected_embeddings),
        metadata=metadata,
        metadata_header=metadata_header,
        label_img=label_img,
        global_step=0,
        tag=args.tag,
    )
    writer.close()

    print(f"mode={args.mode}")
    print(f"points={len(selected_rows)}")
    print(f"dim={selected_embeddings.shape[1]}")
    print(f"index_path={index_path}")
    print(f"ids_path={ids_path}")
    print(f"logdir={logdir}")
    print("next_step=.venv/bin/tensorboard --logdir artifacts/projector_logs")
    print("projector_hint=Open TensorBoard, select the Projector tab, then choose t-SNE or PCA.")


if __name__ == "__main__":
    main()
