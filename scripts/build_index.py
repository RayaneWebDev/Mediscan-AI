#!/usr/bin/env python3
"""
Permet de construire un index FAISS à partir d'un fichier CSV de métadonnées et d'un outil d'intégration.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import faiss
import numpy as np
from PIL import Image

from mediscan.dataset import RocoDataset
from mediscan.process import configure_cpu_environment
from mediscan.runtime import build_embedder, resolve_path, set_faiss_threads

configure_cpu_environment()


def parse_args() -> argparse.Namespace:
    """
    - Gestion des arguments en ligne de commande pour la construction de l'index.
    """
    parser = argparse.ArgumentParser(description="Build a FAISS index from metadata.csv")
    parser.add_argument("--embedder", default="dinov2_base")
    parser.add_argument("--model-name", default=None)
    parser.add_argument("--metadata", default="data/roco_train_full/metadata.csv")
    parser.add_argument("--index-path", default="artifacts/index.faiss")
    parser.add_argument("--ids-path", default="artifacts/ids.json")
    parser.add_argument("--checkpoint-prefix", default=None)
    parser.add_argument("--checkpoint-every", type=int, default=0)
    return parser.parse_args()


def _checkpoint_paths(prefix: str | Path | None) -> dict[str, Path] | None:
    """
    - Génère les chemins de fichiers pour les checkpoints (métadonnées, vecteurs, ids) à partir d'un préfixe.
    """
    if prefix is None:
        return None

    base_path = resolve_path(prefix)
    base_path.parent.mkdir(parents=True, exist_ok=True)
    return {
        "meta": Path(f"{base_path}.meta.json"),
        "vectors": Path(f"{base_path}.vectors.npy"),
        "ids": Path(f"{base_path}.ids.json"),
    }


def _atomic_write_text(path: Path, content: str) -> None:
    """
    - Écrit du texte dans un fichier de manière atomique pour éviter les corruptions.
    """
    tmp_path = path.with_name(f"{path.name}.tmp")
    tmp_path.write_text(content, encoding="utf-8")
    tmp_path.replace(path)


def _atomic_save_npy(path: Path, matrix: np.ndarray) -> None:
    """
    - Sauvegarde une matrice NumPy dans un fichier de manière atomique.
    """ 
    tmp_path = path.with_name(f"{path.name}.tmp")
    with tmp_path.open("wb") as handle:
        np.save(handle, matrix)
    tmp_path.replace(path)


def _load_checkpoint(
    *,
    checkpoint_prefix: str | Path | None,
    embedder_name: str,
    embedder_dim: int,
    metadata_path: Path,
) -> tuple[list[np.ndarray], list[dict[str, Any]], int, int]:
    """
    - Tente de charger un checkpoint existant et valide pour reprendre l'indexation.
    - Vérifie la cohérence du checkpoint avec les paramètres actuels.
    """
    checkpoint_paths = _checkpoint_paths(checkpoint_prefix)
    if checkpoint_paths is None:
        return [], [], 0, 0

    meta_path = checkpoint_paths["meta"]
    vectors_path = checkpoint_paths["vectors"]
    ids_path = checkpoint_paths["ids"]
    if not (meta_path.exists() and vectors_path.exists() and ids_path.exists()):
        return [], [], 0, 0

    try:
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
        matrix = np.load(vectors_path)
        indexed_rows = json.loads(ids_path.read_text(encoding="utf-8"))
    except Exception as exc:
        print(f"[CHECKPOINT] Ignoring unreadable checkpoint at {meta_path}: {exc}")
        return [], [], 0, 0

    if meta.get("embedder") != embedder_name:
        print(f"[CHECKPOINT] Ignoring checkpoint with different embedder: {meta_path}")
        return [], [], 0, 0

    if int(meta.get("dim", -1)) != embedder_dim:
        print(f"[CHECKPOINT] Ignoring checkpoint with different embedding dim: {meta_path}")
        return [], [], 0, 0

    if str(meta.get("metadata_path")) != str(metadata_path):
        print(f"[CHECKPOINT] Ignoring checkpoint for different metadata: {meta_path}")
        return [], [], 0, 0

    if matrix.ndim != 2 or matrix.shape[1] != embedder_dim:
        print(f"[CHECKPOINT] Ignoring invalid checkpoint matrix shape: {matrix.shape}")
        return [], [], 0, 0

    if matrix.shape[0] != len(indexed_rows):
        print(
            "[CHECKPOINT] Ignoring checkpoint with inconsistent vector/row count: "
            f"{matrix.shape[0]} != {len(indexed_rows)}"
        )
        return [], [], 0, 0

    processed_records = int(meta.get("processed_records", 0))
    skipped = int(meta.get("skipped", 0))
    vectors = [row.astype(np.float32, copy=False) for row in matrix]
    return vectors, indexed_rows, processed_records, skipped


def _save_checkpoint(
    *,
    checkpoint_prefix: str | Path | None,
    embedder_name: str,
    embedder_dim: int,
    metadata_path: Path,
    vectors: list[np.ndarray],
    indexed_rows: list[dict[str, Any]],
    processed_records: int,
    skipped: int,
) -> None:
    """
    - Sauvegarde un checkpoint avec les vecteurs, les métadonnées et les stats d'indexation.
    - Utilise des écritures atomiques pour garantir l'intégrité du checkpoint.
    """
    checkpoint_paths = _checkpoint_paths(checkpoint_prefix)
    if checkpoint_paths is None:
        return

    matrix = (
        np.vstack(vectors).astype(np.float32, copy=False)
        if vectors
        else np.empty((0, embedder_dim), dtype=np.float32)
    )
    meta = {
        "embedder": embedder_name,
        "dim": embedder_dim,
        "metadata_path": str(metadata_path),
        "processed_records": processed_records,
        "indexed": len(indexed_rows),
        "skipped": skipped,
    }

    _atomic_save_npy(checkpoint_paths["vectors"], matrix)
    _atomic_write_text(
        checkpoint_paths["ids"],
        json.dumps(indexed_rows, ensure_ascii=False, indent=2),
    )
    _atomic_write_text(
        checkpoint_paths["meta"],
        json.dumps(meta, ensure_ascii=False, indent=2),
    )
    print(
        f"[CHECKPOINT] saved processed={processed_records} "
        f"indexed={len(indexed_rows)} skipped={skipped}"
    )


def _maybe_save_checkpoint(
    *,
    checkpoint_every: int,
    current_record: int,
    checkpoint_prefix: str | Path | None,
    embedder_name: str,
    embedder_dim: int,
    metadata_path: Path,
    vectors: list[np.ndarray],
    indexed_rows: list[dict[str, Any]],
    skipped: int,
) -> None:
    """
    - Vérifie si un checkpoint doit être sauvegardé à ce stade de 
      l'indexation en fonction du paramètre checkpoint_every.
    """
    if checkpoint_every <= 0 or current_record % checkpoint_every != 0:
        return

    _save_checkpoint(
        checkpoint_prefix=checkpoint_prefix,
        embedder_name=embedder_name,
        embedder_dim=embedder_dim,
        metadata_path=metadata_path,
        vectors=vectors,
        indexed_rows=indexed_rows,
        processed_records=current_record,
        skipped=skipped,
    )


def main() -> None:
    """
    - Point d'entrée principal : initialise l'embedder, gère la reprise par checkpoint,
      encode les images du dataset et sauvegarde l'index FAISS et les identifiants.
    """
    args = parse_args()
    set_faiss_threads(faiss)

    metadata_path = resolve_path(args.metadata)
    dataset = RocoDataset(metadata_csv=metadata_path)
    embedder = build_embedder(args.embedder, model_name=args.model_name)

    vectors, indexed_rows, processed_records, skipped = _load_checkpoint(
        checkpoint_prefix=args.checkpoint_prefix,
        embedder_name=args.embedder,
        embedder_dim=embedder.dim,
        metadata_path=metadata_path,
    )
    if processed_records > 0:
        print(
            f"[CHECKPOINT] Resuming from record {processed_records}/{len(dataset)} "
            f"indexed={len(indexed_rows)} skipped={skipped}"
        )

    def save_progress(current_record: int) -> None:
        _maybe_save_checkpoint(
            checkpoint_every=args.checkpoint_every,
            current_record=current_record,
            checkpoint_prefix=args.checkpoint_prefix,
            embedder_name=args.embedder,
            embedder_dim=embedder.dim,
            metadata_path=metadata_path,
            vectors=vectors,
            indexed_rows=indexed_rows,
            skipped=skipped,
        )

    for idx, record in enumerate(dataset, start=1):
        if idx <= processed_records:
            continue

        image_path = resolve_path(record.path)
        if not image_path.exists():
            print(f"[WARN] Missing image file, skipping: {image_path}")
            skipped += 1
            save_progress(idx)
            continue

        try:
            with Image.open(image_path) as image:
                vector = embedder.encode_pil(image)
        except Exception as exc:
            print(f"[WARN] Failed to embed {image_path}: {exc}")
            skipped += 1
            save_progress(idx)
            continue

        if vector.shape != (embedder.dim,):
            print(
                f"[WARN] Invalid vector shape for {image_path}: {vector.shape} "
                f"(expected {(embedder.dim,)})"
            )
            skipped += 1
            save_progress(idx)
            continue

        vectors.append(vector.astype(np.float32, copy=False))
        indexed_rows.append(record.to_dict())

        if idx % 100 == 0:
            print(f"Processed {idx}/{len(dataset)} images")
        save_progress(idx)

    if args.checkpoint_every > 0:
        _save_checkpoint(
            checkpoint_prefix=args.checkpoint_prefix,
            embedder_name=args.embedder,
            embedder_dim=embedder.dim,
            metadata_path=metadata_path,
            vectors=vectors,
            indexed_rows=indexed_rows,
            processed_records=len(dataset),
            skipped=skipped,
        )

    if not vectors:
        raise RuntimeError("No embeddings generated. Index build aborted.")

    matrix = np.vstack(vectors).astype(np.float32, copy=False)
    if matrix.shape[1] != embedder.dim:
        raise RuntimeError(
            f"Embedding dimension mismatch: matrix dim={matrix.shape[1]} "
            f"embedder dim={embedder.dim}"
        )

    faiss.normalize_L2(matrix)
    index = faiss.IndexFlatIP(embedder.dim)
    index.add(matrix)

    index_path = resolve_path(args.index_path)
    ids_path = resolve_path(args.ids_path)
    index_path.parent.mkdir(parents=True, exist_ok=True)
    ids_path.parent.mkdir(parents=True, exist_ok=True)

    faiss.write_index(index, str(index_path))
    with ids_path.open("w", encoding="utf-8") as output:
        json.dump(indexed_rows, output, ensure_ascii=False, indent=2)

    print(
        f"Index built successfully: indexed={len(indexed_rows)}, skipped={skipped}, "
        f"dim={embedder.dim}, index_path={index_path}, ids_path={ids_path}"
    )


if __name__ == "__main__":
    main()
