#!/usr/bin/env python3
"""Rebuild stable DINOv2 and BioMedCLIP indexes in parallel."""

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
    """Build specification for one stable index mode."""
    mode: str
    embedder: str
    metadata: Path
    index_path: Path
    ids_path: Path
    log_path: Path


def parse_args() -> argparse.Namespace:
    """Parse and return command-line arguments."""
    parser = argparse.ArgumentParser(description="Rebuild stable MediScan indexes in parallel")
    parser.add_argument("--metadata", default="data/roco_train_full/metadata.csv")
    parser.add_argument("--logs-dir", default="artifacts/logs")
    parser.add_argument(
        "--threads-per-process",
        type=int,
        default=1,
        help="Number of PyTorch threads used by each parallel process",
    )
    return parser.parse_args()


def build_specs(metadata: Path, logs_dir: Path) -> list[BuildSpec]:
    """Build index specifications for visual and semantic modes."""
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
    """Build the shell command that launches build_index.py."""
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
    """Read process output in real time and redirect it to the console and log."""
    for line in stream:
        sys.stdout.write(f"[{mode}] {line}")
        sys.stdout.flush()
        log_handle.write(line)
        log_handle.flush()


def launch_build(
    spec: BuildSpec,
    threads_per_process: int,
) -> tuple[subprocess.Popen, object, threading.Thread]:
    """Launch an index-building process in an isolated environment."""
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
        raise RuntimeError(f"Could not capture stdout for {spec.mode}")
    thread = threading.Thread(
        target=_stream_output,
        args=(spec.mode, process.stdout, log_handle),
        daemon=True,
    )
    thread.start()
    return process, log_handle, thread


def write_manifest(spec: BuildSpec) -> Path:
    """Generate a JSON manifest confirming a successful build."""
    manifest_path = stable_manifest_path_for_mode(spec.mode)
    manifest_path.parent.mkdir(parents=True, exist_ok=True)

    index = faiss.read_index(str(spec.index_path))
    rows = json.loads(spec.ids_path.read_text(encoding="utf-8"))
    if len(rows) != index.ntotal:
        raise RuntimeError(
            f"Index/IDs mismatch for {spec.mode}: "
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
    """Main entrypoint for the index rebuild script."""
    args = parse_args()
    metadata = Path(args.metadata)
    if not metadata.is_absolute():
        metadata = (PROJECT_ROOT / metadata).resolve()
    logs_dir = Path(args.logs_dir)
    if not logs_dir.is_absolute():
        logs_dir = (PROJECT_ROOT / logs_dir).resolve()
    if not metadata.exists():
        raise FileNotFoundError(f"Metadata CSV file not found: {metadata}")
    if args.threads_per_process <= 0:
        raise ValueError("--threads-per-process must be strictly positive")

    specs = build_specs(metadata, logs_dir)
    running: list[tuple[BuildSpec, subprocess.Popen, object, threading.Thread]] = []

    for spec in specs:
        spec.index_path.parent.mkdir(parents=True, exist_ok=True)
        spec.ids_path.parent.mkdir(parents=True, exist_ok=True)
        process, log_handle, thread = launch_build(spec, args.threads_per_process)
        running.append((spec, process, log_handle, thread))
        print(f"[STARTED] {spec.mode}: {spec.embedder} -> {spec.index_path.name}")

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
        print(f"[DONE] {spec.mode}: manifest={manifest_path}")

    if failures:
        for spec, return_code in failures:
            print(
                f"[FAILED] {spec.mode}: code={return_code} log={spec.log_path}",
                file=sys.stderr,
            )
        raise SystemExit(1)

    print("Stable rebuild completed successfully.")
    for manifest in manifests:
        print(f" - {manifest}")


if __name__ == "__main__":
    main()
