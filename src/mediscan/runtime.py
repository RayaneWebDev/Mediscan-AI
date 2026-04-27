"""Shared runtime tools for resolving models, artifacts, and project paths."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from mediscan.embedders.factory import get_embedder

PROJECT_ROOT = Path(__file__).resolve().parents[2]


@dataclass(frozen=True)
class ModeConfig:
    """
    Immutable runtime contract for one search mode.

    The rest of the application uses this object as the single source of truth
    for the embedder name, FAISS index, IDs metadata, and validation manifest
    associated with each public search mode.
    """
    mode: str
    embedder: str
    index_path: Path
    ids_path: Path
    manifest_path: Path
    model_name: str | None = None


# Stable artifacts are the production-ready indexes shipped with the project.
STABLE_MODE_CONFIGS = {
    "visual": ModeConfig(
        mode="visual",
        embedder="dinov2_base",
        index_path=PROJECT_ROOT / "artifacts" / "index.faiss",
        ids_path=PROJECT_ROOT / "artifacts" / "ids.json",
        manifest_path=PROJECT_ROOT / "artifacts" / "manifests" / "visual_stable.json",
        model_name=None,
    ),
    "semantic": ModeConfig(
        mode="semantic",
        embedder="biomedclip",
        index_path=PROJECT_ROOT / "artifacts" / "index_semantic.faiss",
        ids_path=PROJECT_ROOT / "artifacts" / "ids_semantic.json",
        manifest_path=PROJECT_ROOT / "artifacts" / "manifests" / "semantic_stable.json",
        model_name="hf-hub:Ozantsk/biomedclip-rocov2-finetuned",
    ),
}
SUPPORTED_MODES = frozenset(STABLE_MODE_CONFIGS)


def resolve_path(raw_path: str | Path, base_dir: Path | None = None) -> Path:
    """
    Resolve an input path consistently across CLI scripts, tests, and the API.

    Absolute paths are returned unchanged. Relative paths are interpreted from
    base_dir when provided, otherwise from PROJECT_ROOT so callers do not depend
    on the current working directory.
    """
    path = Path(raw_path)
    if path.is_absolute():
        return path
    if base_dir is not None:
        return Path(base_dir) / path
    return PROJECT_ROOT / path


def get_mode_config(mode: str) -> ModeConfig:
    """Normalize a mode label and return its stable runtime configuration."""
    normalized = mode.strip().lower()
    config = STABLE_MODE_CONFIGS.get(normalized)
    if config is None:
        raise ValueError(f"Unsupported mode: {mode}")
    return config


def default_config_for_mode(mode: str) -> tuple[str, Path, Path]:
    """Return the default embedder and FAISS/IDs artifact paths for a mode."""
    config = get_mode_config(mode)
    return config.embedder, config.index_path, config.ids_path


def stable_manifest_path_for_mode(mode: str) -> Path:
    """Return the manifest used to prove the stable artifacts were validated."""
    return get_mode_config(mode).manifest_path


def build_embedder(name: str, model_name: str | None = None):
    """
    Instantiate an embedder through the registry while preserving optional overrides.

    CLI tools and services pass model_name only when they need a non-default
    checkpoint. Keeping this helper small keeps construction behavior identical
    across index building, querying, and the web API.
    """
    kwargs: dict[str, object] = {}
    if model_name:
        kwargs["model_name"] = model_name
    return get_embedder(name, **kwargs)


def default_model_name_for_mode(mode: str) -> str | None:
    """Return the default model checkpoint for a mode, when it is pinned."""
    return get_mode_config(mode).model_name


def load_indexed_rows(ids_path: str | Path) -> list[dict[str, str]]:
    """
    Load the metadata rows aligned with a FAISS index.

    The JSON file must be a non-empty list where row order matches vector order
    inside FAISS. Search code relies on this positional contract for ranking and
    for reconstructing vectors during relaunch searches.
    """
    path = resolve_path(ids_path)
    if not path.exists():
        raise FileNotFoundError(f"IDs file not found: {path}")

    with path.open("r", encoding="utf-8") as handle:
        rows = json.load(handle)

    if not isinstance(rows, list):
        raise RuntimeError("Invalid ids file format: expected a JSON list")
    if not rows:
        raise RuntimeError("IDs file is empty")
    return rows


def ensure_artifacts_exist(
    index_path: str | Path,
    ids_path: str | Path,
) -> tuple[Path, Path]:
    """Resolve and validate the two files required to query a FAISS index."""
    resolved_index = resolve_path(index_path)
    resolved_ids = resolve_path(ids_path)
    if not resolved_index.exists():
        raise FileNotFoundError(f"FAISS index not found: {resolved_index}")
    if not resolved_ids.exists():
        raise FileNotFoundError(f"IDs file not found: {resolved_ids}")
    return resolved_index, resolved_ids


def compute_search_k(k: int, ntotal: int, *, exclude_self: bool = False) -> int:
    """
    Compute the number of raw FAISS neighbors needed to return k public results.

    When the query item can appear in the index, one extra candidate is requested
    so the caller can drop the query itself without shortening the displayed list.
    """
    extra = 1 if exclude_self else 0
    return min(ntotal, k + extra)


def set_faiss_threads(faiss_module: object, count: int = 1) -> None:
    """Configure FAISS CPU threads when the installed FAISS build exposes it."""
    setter = getattr(faiss_module, "omp_set_num_threads", None)
    if callable(setter):
        setter(count)


__all__ = [
    "ModeConfig",
    "PROJECT_ROOT",
    "STABLE_MODE_CONFIGS",
    "SUPPORTED_MODES",
    "build_embedder",
    "compute_search_k",
    "default_config_for_mode",
    "default_model_name_for_mode",
    "ensure_artifacts_exist",
    "get_mode_config",
    "load_indexed_rows",
    "resolve_path",
    "set_faiss_threads",
    "stable_manifest_path_for_mode",
]
