#!/usr/bin/env python3
"""
Reconstruit les index stables DINOv2 et BioMedCLIP en parallèle.

Ce script lance deux processus séparés — un pour le mode visuel (DINOv2)
et un pour le mode sémantique (BioMedCLIP) — afin d'optimiser l'utilisation
des ressources CPU. Les logs de chaque processus sont sauvegardés
séparément dans le dossier artifacts/logs/.

Un fichier manifeste JSON est généré pour chaque index reconstruit,
confirmant la réussite et l'état de l'index (nombre de vecteurs, dimension,
horodatage UTC).

Usage :
    python scripts/rebuild_stable_indexes.py
    python scripts/rebuild_stable_indexes.py --metadata data/roco_train_full/metadata.csv
    python scripts/rebuild_stable_indexes.py --threads-per-process 2
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import threading
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

import faiss

from mediscan.runtime import get_mode_config, stable_manifest_path_for_mode

PROJECT_ROOT = Path(__file__).resolve().parents[1]


@dataclass(frozen=True)
class BuildSpec:
    """
    Spécification de construction d'un index stable pour un mode donné.

    Attributes:
        mode (str): Mode de recherche ('visual' ou 'semantic').
        embedder (str): Nom de l'embedder à utiliser (ex: 'dinov2_base').
        metadata (Path): Chemin vers le fichier metadata.csv du dataset.
        index_path (Path): Chemin de destination de l'index FAISS.
        ids_path (Path): Chemin de destination du fichier IDs JSON.
        log_path (Path): Chemin du fichier de log du processus de construction.
    """
    mode: str
    embedder: str
    metadata: Path
    index_path: Path
    ids_path: Path
    log_path: Path


def parse_args() -> argparse.Namespace:
    """
    Analyse et retourne les arguments de la ligne de commande.

    Returns:
        argparse.Namespace: Objet contenant tous les arguments parsés :
            - metadata (str) : Chemin vers le fichier metadata.csv.
            - logs_dir (str) : Répertoire de destination des fichiers de log.
            - threads_per_process (int) : Nombre de threads PyTorch par processus.

    Raises:
        ValueError: Si threads_per_process est inférieur ou égal à zéro.
    """
    parser = argparse.ArgumentParser(description="Reconstruit les index stables MediScan en parallèle")
    parser.add_argument("--metadata", default="data/roco_train_full/metadata.csv")
    parser.add_argument("--logs-dir", default="artifacts/logs")
    parser.add_argument(
        "--threads-per-process",
        type=int,
        default=1,
        help="Nombre de threads PyTorch utilisés par chaque processus parallèle",
    )
    return parser.parse_args()


def build_specs(metadata: Path, logs_dir: Path) -> list[BuildSpec]:
    """
    Construit les spécifications de construction pour les modes visual et semantic.

    Récupère la configuration de chaque mode (embedder, chemins d'index et d'IDs)
    depuis le module runtime, et prépare les chemins de log associés.

    Args:
        metadata (Path): Chemin vers le fichier metadata.csv du dataset.
        logs_dir (Path): Répertoire de destination des fichiers de log.

    Returns:
        list[BuildSpec]: Liste de deux spécifications — une pour 'visual',
            une pour 'semantic'.
    """
    specs: list[BuildSpec] = []
    for mode in ("visual", "semantic"):
        config = get_mode_config(mode)
        specs.append(
            BuildSpec(
                mode=mode,
                embedder=config.embedder,
                metadata=metadata,
                index_path=config.index_path,
                ids_path=config.ids_path,
                log_path=logs_dir / f"rebuild_{mode}_stable.log",
            )
        )
    return specs


def build_command(spec: BuildSpec) -> list[str]:
    """
    Construit la commande shell pour lancer le script build_index.py.

    Args:
        spec (BuildSpec): Spécification contenant le mode, l'embedder
            et les chemins d'index et d'IDs à utiliser.

    Returns:
        list[str]: Liste de tokens représentant la commande à exécuter
            via subprocess.Popen.
    """
    return [
        sys.executable,
        "-u",
        str(PROJECT_ROOT / "scripts" / "build_index.py"),
        "--embedder", spec.embedder,
        "--metadata", str(spec.metadata),
        "--index-path", str(spec.index_path),
        "--ids-path", str(spec.ids_path),
    ]


def _stream_output(mode: str, stream, log_handle) -> None:
    """
    Lit la sortie d'un processus en temps réel et la redirige vers la console et le log.

    Chaque ligne est préfixée par le mode (ex: '[visual]') pour distinguer
    les sorties des deux processus parallèles.

    Args:
        mode (str): Mode de recherche ('visual' ou 'semantic'), utilisé comme préfixe.
        stream: Flux stdout du processus subprocess à lire.
        log_handle: Fichier de log ouvert en écriture pour archiver la sortie.

    Returns:
        None
    """
    for line in stream:
        sys.stdout.write(f"[{mode}] {line}")
        sys.stdout.flush()
        log_handle.write(line)
        log_handle.flush()


def launch_build(
    spec: BuildSpec,
    threads_per_process: int,
) -> tuple[subprocess.Popen, object, threading.Thread]:
    """
    Lance un processus de construction d'index dans un environnement isolé.

    Configure les variables d'environnement pour limiter le parallélisme
    interne (OpenMP, MKL, PyTorch) et démarre un thread de lecture de la
    sortie du processus.

    Args:
        spec (BuildSpec): Spécification du mode à construire.
        threads_per_process (int): Nombre de threads PyTorch alloués
            à ce processus.

    Returns:
        tuple: Un triplet contenant :
            - subprocess.Popen : Le processus lancé.
            - file object : Le handle du fichier de log ouvert.
            - threading.Thread : Le thread de lecture de la sortie.

    Raises:
        RuntimeError: Si la capture du stdout du processus échoue.
    """
    env = os.environ.copy()
    env["OMP_NUM_THREADS"] = "1"
    env["MKL_NUM_THREADS"] = "1"
    env["OPENBLAS_NUM_THREADS"] = "1"
    env["NUMEXPR_NUM_THREADS"] = "1"
    env["MEDISCAN_TORCH_THREADS"] = str(threads_per_process)
    env["PYTHONUNBUFFERED"] = "1"
    env.setdefault("KMP_DUPLICATE_LIB_OK", "TRUE")

    spec.log_path.parent.mkdir(parents=True, exist_ok=True)
    log_handle = spec.log_path.open("w", encoding="utf-8")
    process = subprocess.Popen(
        build_command(spec),
        cwd=PROJECT_ROOT,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )
    if process.stdout is None:
        raise RuntimeError(f"Impossible de capturer le stdout pour {spec.mode}")
    thread = threading.Thread(
        target=_stream_output,
        args=(spec.mode, process.stdout, log_handle),
        daemon=True,
    )
    thread.start()
    return process, log_handle, thread


def write_manifest(spec: BuildSpec) -> Path:
    """
    Génère un fichier manifeste JSON confirmant la réussite de la construction.

    Vérifie la cohérence entre l'index FAISS et le fichier IDs JSON,
    puis écrit un manifeste contenant les métadonnées de la construction
    (mode, embedder, nombre de vecteurs, dimension, horodatage UTC).

    Args:
        spec (BuildSpec): Spécification du mode dont le manifeste est à générer.

    Returns:
        Path: Chemin du fichier manifeste généré.

    Raises:
        RuntimeError: Si le nombre de vecteurs dans l'index FAISS ne correspond
            pas au nombre de lignes dans le fichier IDs JSON.
    """
    manifest_path = stable_manifest_path_for_mode(spec.mode)
    manifest_path.parent.mkdir(parents=True, exist_ok=True)

    index = faiss.read_index(str(spec.index_path))
    rows = json.loads(spec.ids_path.read_text(encoding="utf-8"))
    if len(rows) != index.ntotal:
        raise RuntimeError(
            f"Incohérence index/IDs pour {spec.mode}: "
            f"index.ntotal={index.ntotal}, ids={len(rows)}"
        )
    manifest = {
        "mode": spec.mode,
        "embedder": spec.embedder,
        "metadata": str(spec.metadata),
        "index_path": str(spec.index_path),
        "ids_path": str(spec.ids_path),
        "log_path": str(spec.log_path),
        "index_ntotal": int(index.ntotal),
        "index_dim": int(index.d),
        "ids_rows": len(rows),
        "rebuilt_at_utc": datetime.now(timezone.utc).isoformat(),
    }
    manifest_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return manifest_path


def main() -> None:
    """
    Point d'entrée principal du script de reconstruction des index.

    Orchestre le lancement parallèle des deux processus de construction
    (visual et semantic), suit leur exécution, génère les manifestes
    et lève une erreur si l'un des processus échoue.

    Returns:
        None

    Raises:
        FileNotFoundError: Si le fichier metadata.csv est introuvable.
        ValueError: Si --threads-per-process est inférieur ou égal à zéro.
        SystemExit: Si un ou plusieurs processus de construction échouent (code 1).
        RuntimeError: Si la cohérence index/IDs est invalide lors de l'écriture
            du manifeste.
    """
    args = parse_args()
    metadata = Path(args.metadata)
    if not metadata.is_absolute():
        metadata = (PROJECT_ROOT / metadata).resolve()
    logs_dir = Path(args.logs_dir)
    if not logs_dir.is_absolute():
        logs_dir = (PROJECT_ROOT / logs_dir).resolve()
    if not metadata.exists():
        raise FileNotFoundError(f"Fichier metadata CSV introuvable : {metadata}")
    if args.threads_per_process <= 0:
        raise ValueError("--threads-per-process doit être strictement positif")

    specs = build_specs(metadata, logs_dir)
    running: list[tuple[BuildSpec, subprocess.Popen, object, threading.Thread]] = []

    for spec in specs:
        spec.index_path.parent.mkdir(parents=True, exist_ok=True)
        spec.ids_path.parent.mkdir(parents=True, exist_ok=True)
        process, log_handle, thread = launch_build(spec, args.threads_per_process)
        running.append((spec, process, log_handle, thread))
        print(f"[DÉMARRÉ] {spec.mode}: {spec.embedder} -> {spec.index_path.name}")

    failures: list[tuple[BuildSpec, int]] = []
    manifests: list[Path] = []

    for spec, process, log_handle, thread in running:
        return_code = process.wait()
        thread.join(timeout=1.0)
        log_handle.close()
        if return_code != 0:
            failures.append((spec, return_code))
            continue
        manifest_path = write_manifest(spec)
        manifests.append(manifest_path)
        print(f"[TERMINÉ] {spec.mode}: manifeste={manifest_path}")

    if failures:
        for spec, return_code in failures:
            print(
                f"[ÉCHEC] {spec.mode}: code={return_code} log={spec.log_path}",
                file=sys.stderr,
            )
        raise SystemExit(1)

    print("Reconstruction stable terminée avec succès.")
    for manifest in manifests:
        print(f" - {manifest}")


if __name__ == "__main__":
    main()