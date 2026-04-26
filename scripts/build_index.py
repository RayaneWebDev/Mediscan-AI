#!/usr/bin/env python3
"""
Construit un index FAISS à partir d'un dataset d'images médicales.

Ce script encode toutes les images d'un dataset ROCOv2 en vecteurs d'embeddings
via l'embedder spécifié (DINOv2 ou BioMedCLIP), les normalise en L2, puis
les indexe dans un index FAISS de type IndexFlatIP.

Supporte la reprise sur checkpoint pour les datasets volumineux — si le script
est interrompu, il reprend automatiquement depuis le dernier checkpoint sauvegardé.

Usage :
    python scripts/build_index.py --embedder dinov2_base --metadata data/roco_train_full/metadata.csv
    python scripts/build_index.py --embedder biomedclip --index-path artifacts/index_semantic.faiss
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
    Analyse et retourne les arguments de la ligne de commande.

    Returns:
        argparse.Namespace: Objet contenant tous les arguments parsés :
            - embedder (str) : Nom de l'embedder à utiliser.
            - model_name (str | None) : Surcharge optionnelle du modèle.
            - metadata (str) : Chemin vers le fichier metadata.csv.
            - index_path (str) : Chemin de destination de l'index FAISS.
            - ids_path (str) : Chemin de destination du fichier IDs JSON.
            - checkpoint_prefix (str | None) : Préfixe des fichiers checkpoint.
            - checkpoint_every (int) : Fréquence de sauvegarde des checkpoints.
    """
    parser = argparse.ArgumentParser(description="Construction d'un index FAISS depuis metadata.csv")
    parser.add_argument("--embedder", default="dinov2_base",
                        help="Nom de l'embedder (ex: dinov2_base, biomedclip)")
    parser.add_argument("--model-name", default=None,
                        help="Surcharge optionnelle du modèle pré-entraîné")
    parser.add_argument("--metadata", default="data/roco_train_full/metadata.csv",
                        help="Chemin vers le fichier metadata.csv du dataset")
    parser.add_argument("--index-path", default="artifacts/index.faiss",
                        help="Chemin de destination de l'index FAISS")
    parser.add_argument("--ids-path", default="artifacts/ids.json",
                        help="Chemin de destination du fichier IDs JSON")
    parser.add_argument("--checkpoint-prefix", default=None,
                        help="Préfixe des fichiers checkpoint pour la reprise")
    parser.add_argument("--checkpoint-every", type=int, default=0,
                        help="Sauvegarder un checkpoint toutes les N images (0 = désactivé)")
    return parser.parse_args()


def _checkpoint_paths(prefix: str | Path | None) -> dict[str, Path] | None:
    """
    Génère les chemins des fichiers checkpoint à partir d'un préfixe.

    Args:
        prefix (str | Path | None): Préfixe de base pour les fichiers checkpoint.
            Si None, retourne None (pas de checkpoint).

    Returns:
        dict[str, Path] | None: Dictionnaire contenant les chemins pour les clés
            'meta', 'vectors' et 'ids', ou None si prefix est None.
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
    Écrit du texte dans un fichier de manière atomique.

    Utilise un fichier temporaire intermédiaire pour éviter les corruptions
    en cas d'interruption pendant l'écriture.

    Args:
        path (Path): Chemin de destination du fichier final.
        content (str): Contenu textuel à écrire.

    Returns:
        None
    """
    tmp_path = path.with_name(f"{path.name}.tmp")
    tmp_path.write_text(content, encoding="utf-8")
    tmp_path.replace(path)


def _atomic_save_npy(path: Path, matrix: np.ndarray) -> None:
    """
    Sauvegarde une matrice NumPy dans un fichier de manière atomique.

    Utilise un fichier temporaire intermédiaire pour éviter les corruptions
    en cas d'interruption pendant l'écriture.

    Args:
        path (Path): Chemin de destination du fichier .npy final.
        matrix (np.ndarray): Matrice NumPy à sauvegarder.

    Returns:
        None
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
    Tente de charger un checkpoint existant pour reprendre l'indexation.

    Vérifie la cohérence du checkpoint avec les paramètres actuels
    (embedder, dimension, chemin du metadata). Ignore le checkpoint
    si une incohérence est détectée.

    Args:
        checkpoint_prefix (str | Path | None): Préfixe des fichiers checkpoint.
        embedder_name (str): Nom de l'embedder attendu dans le checkpoint.
        embedder_dim (int): Dimension des embeddings attendue.
        metadata_path (Path): Chemin du metadata.csv utilisé pour l'indexation.

    Returns:
        tuple: Un quadruplet contenant :
            - list[np.ndarray] : Vecteurs déjà encodés.
            - list[dict] : Métadonnées des images déjà indexées.
            - int : Nombre d'enregistrements déjà traités.
            - int : Nombre d'images ignorées (skipped).
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
        print(f"[CHECKPOINT] Checkpoint ignoré (illisible) à {meta_path}: {exc}")
        return [], [], 0, 0

    if meta.get("embedder") != embedder_name:
        print(f"[CHECKPOINT] Checkpoint ignoré (embedder différent) : {meta_path}")
        return [], [], 0, 0

    if int(meta.get("dim", -1)) != embedder_dim:
        print(f"[CHECKPOINT] Checkpoint ignoré (dimension différente) : {meta_path}")
        return [], [], 0, 0

    if str(meta.get("metadata_path")) != str(metadata_path):
        print(f"[CHECKPOINT] Checkpoint ignoré (metadata différent) : {meta_path}")
        return [], [], 0, 0

    if matrix.ndim != 2 or matrix.shape[1] != embedder_dim:
        print(f"[CHECKPOINT] Checkpoint ignoré (forme de matrice invalide) : {matrix.shape}")
        return [], [], 0, 0

    if matrix.shape[0] != len(indexed_rows):
        print(
            f"[CHECKPOINT] Checkpoint ignoré (incohérence vecteurs/lignes) : "
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
    Sauvegarde un checkpoint de l'état actuel de l'indexation.

    Écrit de manière atomique les vecteurs encodés, les métadonnées
    des images indexées et les statistiques d'avancement.

    Args:
        checkpoint_prefix (str | Path | None): Préfixe des fichiers checkpoint.
            Si None, ne fait rien.
        embedder_name (str): Nom de l'embedder utilisé.
        embedder_dim (int): Dimension des embeddings.
        metadata_path (Path): Chemin du metadata.csv utilisé.
        vectors (list[np.ndarray]): Liste des vecteurs encodés jusqu'ici.
        indexed_rows (list[dict]): Liste des métadonnées des images indexées.
        processed_records (int): Nombre total d'enregistrements traités.
        skipped (int): Nombre d'images ignorées.

    Returns:
        None
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
        f"[CHECKPOINT] sauvegardé : traités={processed_records} "
        f"indexés={len(indexed_rows)} ignorés={skipped}"
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
    Sauvegarde un checkpoint si la fréquence configurée est atteinte.

    Ne fait rien si checkpoint_every est à 0 ou si current_record
    n'est pas un multiple de checkpoint_every.

    Args:
        checkpoint_every (int): Fréquence de sauvegarde (toutes les N images).
            0 désactive les checkpoints.
        current_record (int): Index de l'enregistrement courant.
        checkpoint_prefix (str | Path | None): Préfixe des fichiers checkpoint.
        embedder_name (str): Nom de l'embedder utilisé.
        embedder_dim (int): Dimension des embeddings.
        metadata_path (Path): Chemin du metadata.csv utilisé.
        vectors (list[np.ndarray]): Vecteurs encodés jusqu'ici.
        indexed_rows (list[dict]): Métadonnées des images indexées.
        skipped (int): Nombre d'images ignorées.

    Returns:
        None
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
    Point d'entrée principal du script de construction d'index.

    Orchestre l'initialisation de l'embedder, la reprise depuis un checkpoint
    existant si disponible, l'encodage de toutes les images du dataset,
    la normalisation L2 des vecteurs, et la sauvegarde de l'index FAISS
    et du fichier IDs JSON.

    Returns:
        None

    Raises:
        RuntimeError: Si aucun embedding n'a été généré (dataset vide ou
            toutes les images ignorées), ou si la dimension de la matrice
            ne correspond pas à celle de l'embedder.
        FileNotFoundError: Si le fichier metadata.csv est introuvable.
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
            f"[CHECKPOINT] Reprise depuis l'enregistrement {processed_records}/{len(dataset)} "
            f"indexés={len(indexed_rows)} ignorés={skipped}"
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
            print(f"[WARN] Image manquante, ignorée : {image_path}")
            skipped += 1
            save_progress(idx)
            continue

        try:
            with Image.open(image_path) as image:
                vector = embedder.encode_pil(image)
        except Exception as exc:
            print(f"[WARN] Échec d'encodage pour {image_path}: {exc}")
            skipped += 1
            save_progress(idx)
            continue

        if vector.shape != (embedder.dim,):
            print(
                f"[WARN] Forme de vecteur invalide pour {image_path}: {vector.shape} "
                f"(attendu {(embedder.dim,)})"
            )
            skipped += 1
            save_progress(idx)
            continue

        vectors.append(vector.astype(np.float32, copy=False))
        indexed_rows.append(record.to_dict())

        if idx % 100 == 0:
            print(f"Traitement : {idx}/{len(dataset)} images")
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
        raise RuntimeError("Aucun embedding généré. Construction de l'index annulée.")

    matrix = np.vstack(vectors).astype(np.float32, copy=False)
    if matrix.shape[1] != embedder.dim:
        raise RuntimeError(
            f"Incohérence de dimension : matrice={matrix.shape[1]}, "
            f"embedder={embedder.dim}"
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
        f"Index construit avec succès : indexés={len(indexed_rows)}, "
        f"ignorés={skipped}, dim={embedder.dim}, "
        f"index={index_path}, ids={ids_path}"
    )


if __name__ == "__main__":
    main()