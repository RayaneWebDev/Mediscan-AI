"""Shared runtime helpers for MEDISCAN scripts."""

from __future__ import annotations

import json
from pathlib import Path

from mediscan.embedders.factory import get_embedder
from mediscan.visual_similarity import VISUAL_SHORTLIST_SIZE

PROJECT_ROOT = Path(__file__).resolve().parents[2]
VISUAL_EMBEDDERS = frozenset({"dinov2_base"})
SEMANTIC_EMBEDDERS = frozenset({"biomedclip"})
SUPPORTED_MODES = frozenset({"visual", "semantic"})


def resolve_path(raw_path: str | Path, base_dir: Path | None = None) -> Path:
    """Resolve a path against the project root or an optional base directory."""
    path = Path(raw_path)
    if path.is_absolute():
        return path
    if base_dir is not None:
        return Path(base_dir) / path
    return PROJECT_ROOT / path


def default_config_for_mode(mode: str) -> tuple[str, Path, Path]:
    """Return the default embedder and index files for one retrieval mode."""
    normalized = mode.strip().lower()
    if normalized == "visual":
        return (
            "dinov2_base",
            resolve_path("artifacts/index.faiss"),
            resolve_path("artifacts/ids.json"),
        )
    if normalized == "semantic":
        return (
            "biomedclip",
            resolve_path("artifacts/index_semantic.faiss"),
            resolve_path("artifacts/ids_semantic.json"),
        )
    raise ValueError(f"Unsupported mode: {mode}")


def build_embedder(name: str, model_name: str | None = None):
    """Build one of the supported embedders."""
    kwargs: dict[str, object] = {}
    if model_name:
        kwargs["model_name"] = model_name
    return get_embedder(name, **kwargs)


def load_indexed_rows(ids_path: str | Path) -> list[dict[str, str]]:
    """Load the metadata rows aligned with a FAISS index."""
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


def is_visual_embedder(name: str) -> bool:
    """Return True when the embedder belongs to the visual branch."""
    return name.strip().lower() in VISUAL_EMBEDDERS


def compute_search_k(
    embedder_name: str,
    k: int,
    ntotal: int,
    *,
    exclude_self: bool = False,
) -> int:
    """Choose how many candidates FAISS should return before optional reranking."""
    if is_visual_embedder(embedder_name):
        return min(ntotal, max(VISUAL_SHORTLIST_SIZE, k + 20))
    extra = 10 if exclude_self else 0
    return min(ntotal, k + extra)


def set_faiss_threads(faiss_module: object, count: int = 1) -> None:
    """Set FAISS CPU threads when supported by the installed wheel."""
    setter = getattr(faiss_module, "omp_set_num_threads", None)
    if callable(setter):
        setter(count)

