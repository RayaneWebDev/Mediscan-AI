"""Core CBIR search engine: resource loading, FAISS querying, and ranking."""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from mediscan.process import configure_cpu_environment

configure_cpu_environment()

import faiss
import numpy as np
from PIL import Image

from mediscan.embedders.base import Embedder
from mediscan.runtime import (
    build_embedder,
    compute_search_k,
    default_config_for_mode,
    default_model_name_for_mode,
    ensure_artifacts_exist,
    load_indexed_rows,
    resolve_path,
    set_faiss_threads,
)

MAX_K = 50


@dataclass
class SearchResources:
    """
    Bundle all heavy resources required to query one search mode.

    Keeping the embedder, FAISS index, metadata rows, and image-id lookup together
    prevents accidental mismatches between vectors and metadata across repeated
    API calls or CLI queries.
    """
    embedder: Embedder | None
    index: faiss.Index
    rows: list[dict[str, str]]
    row_index_by_image_id: dict[str, int] = field(default_factory=dict)

    def __post_init__(self) -> None:
        """Build the image_id-to-position lookup used by index-backed relaunches."""
        if self.row_index_by_image_id:
            return
        self.row_index_by_image_id = {
            str(row.get("image_id", "")): idx for idx, row in enumerate(self.rows)
        }


def _validate_k(k: int) -> None:
    """Validate the requested result count before any expensive work starts."""
    if not 0 < k <= MAX_K:
        raise ValueError(f"k must be between 1 and {MAX_K}")


def _build_result(row: dict[str, Any], *, rank: int, score: float) -> dict[str, Any]:
    """Normalize one metadata row into the API/CLI result shape."""
    return {
        "rank": rank,
        "score": float(score),
        "image_id": str(row.get("image_id", "")),
        "path": str(row.get("path", "")),
        "caption": str(row.get("caption", "")),
        "cui": str(row.get("cui", "")),
    }


def collect_ranked_results(
    *,
    rows: list[dict[str, str]],
    scores: Iterable[float],
    indices: Iterable[int],
    k: int,
    excluded_image_ids: set[str] | None = None,
    excluded_paths: set[str] | None = None,
) -> list[dict[str, Any]]:
    """
    Convert raw FAISS scores and row indices into displayable ranked results.

    This function centralizes post-processing so image search, relaunch search,
    text search, and centroid search all skip excluded records the same way and
    expose the same payload fields.
    """
    excluded_ids = excluded_image_ids or set()
    resolved_excluded_paths = {str(Path(path).resolve()) for path in (excluded_paths or set())}
    should_check_paths = bool(resolved_excluded_paths)
    results: list[dict[str, Any]] = []

    for raw_index, raw_score in zip(indices, scores):
        index = int(raw_index)
        if index < 0:
            continue

        row = rows[index]
        image_id = str(row.get("image_id", ""))
        relative_path = str(row.get("path", ""))

        if image_id in excluded_ids:
            continue

        if should_check_paths:
            absolute_path = str(resolve_path(relative_path).resolve()) if relative_path else ""
            if absolute_path in resolved_excluded_paths:
                continue

        results.append(_build_result(row, rank=len(results) + 1, score=float(raw_score)))
        if len(results) >= k:
            break

    return results


def load_resources(
    *,
    mode: str,
    embedder: str | None = None,
    model_name: str | None = None,
    index_path: str | Path | None = None,
    ids_path: str | Path | None = None,
    load_embedder: bool = True,
) -> SearchResources:
    """
    Load the FAISS index, aligned metadata rows, and optionally the embedder.

    Integration tests can set load_embedder=False to validate real artifacts
    without downloading model weights. Runtime callers leave it enabled so query
    vectors can be computed from uploaded images or text.
    """
    set_faiss_threads(faiss)

    default_embedder, default_index_path, default_ids_path = default_config_for_mode(mode)
    embedder_name = embedder or default_embedder
    resolved_index = index_path if index_path is not None else default_index_path
    resolved_ids = ids_path if ids_path is not None else default_ids_path
    resolved_model_name = (
        model_name if model_name is not None else default_model_name_for_mode(mode)
    )
    index_path_obj, ids_path_obj = ensure_artifacts_exist(resolved_index, resolved_ids)

    rows = load_indexed_rows(ids_path_obj)
    faiss_index = faiss.read_index(str(index_path_obj))
    if faiss_index.ntotal == 0:
        raise RuntimeError("FAISS index is empty")
    if len(rows) != faiss_index.ntotal:
        raise RuntimeError(
            f"Index/IDs mismatch: index.ntotal={faiss_index.ntotal}, ids={len(rows)}"
        )

    image_embedder: Embedder | None = None
    if load_embedder:
        image_embedder = build_embedder(embedder_name, model_name=resolved_model_name)
        if image_embedder.dim != faiss_index.d:
            raise RuntimeError(
                f"Index dimension ({faiss_index.d}) does not match embedder ({image_embedder.dim})"
            )

    row_index_by_image_id = {
        str(row.get("image_id", "")): idx for idx, row in enumerate(rows)
    }
    return SearchResources(
        embedder=image_embedder,
        index=faiss_index,
        rows=rows,
        row_index_by_image_id=row_index_by_image_id,
    )


def query(
    *,
    resources: SearchResources,
    image: str | Path,
    k: int,
    exclude_self: bool = False,
) -> list[dict[str, Any]]:
    """
    Encode a query image and search the matching FAISS index.

    The produced embedding is L2-normalized before search so score interpretation
    remains compatible with indexes built from normalized vectors.
    """
    _validate_k(k)

    query_image = resolve_path(image)
    if not query_image.exists():
        raise FileNotFoundError(f"Query image not found: {query_image}")

    embedder = resources.embedder
    index = resources.index
    rows = resources.rows
    if embedder is None:
        raise RuntimeError("Image embedder is not loaded for this SearchResources instance")

    with Image.open(query_image) as pil_image:
        query_vector = embedder.encode_pil(pil_image).reshape(1, -1).astype(np.float32)
    faiss.normalize_L2(query_vector)

    search_k = compute_search_k(k, index.ntotal, exclude_self=exclude_self)
    scores, indices = index.search(query_vector, search_k)

    excluded_image_ids = {query_image.stem} if exclude_self else set()
    excluded_paths = {str(query_image.resolve())} if exclude_self else set()
    return collect_ranked_results(
        rows=rows,
        scores=scores[0],
        indices=indices[0],
        k=k,
        excluded_image_ids=excluded_image_ids,
        excluded_paths=excluded_paths,
    )


def query_from_index(
    *,
    resources: SearchResources,
    image_id: str,
    k: int,
    exclude_self: bool = False,
) -> list[dict[str, Any]]:
    """
    Relaunch search from a vector already stored in the index.

    This powers "search from result" without downloading and re-encoding the
    original image. The stored FAISS vector is reconstructed by row position, then
    queried against the same index.
    """
    _validate_k(k)

    row_index = resources.row_index_by_image_id.get(image_id.strip())
    if row_index is None:
        raise KeyError(f"Image id not found in indexed rows: {image_id}")

    index = resources.index
    rows = resources.rows
    query_vector = np.asarray(
        index.reconstruct(int(row_index)), dtype=np.float32
    ).reshape(1, -1)

    search_k = compute_search_k(k, index.ntotal, exclude_self=exclude_self)
    scores, indices = index.search(query_vector, search_k)

    row = rows[row_index]
    relative_path = str(row.get("path", ""))
    excluded_image_ids = {image_id} if exclude_self else set()
    excluded_paths = (
        {str(resolve_path(relative_path).resolve())}
        if exclude_self and relative_path
        else set()
    )
    return collect_ranked_results(
        rows=rows,
        scores=scores[0],
        indices=indices[0],
        k=k,
        excluded_image_ids=excluded_image_ids,
        excluded_paths=excluded_paths,
    )


def query_text(
    *,
    resources: SearchResources,
    text: str,
    k: int,
) -> list[dict[str, Any]]:
    """
    Encode a text prompt and search the semantic FAISS index.

    Only embedders exposing encode_text are accepted, which intentionally limits
    text queries to semantic models such as BioMedCLIP.
    """
    _validate_k(k)
    if not hasattr(resources.embedder, "encode_text"):
        raise ValueError(
            f"Embedder '{resources.embedder.name}' does not support encode_text(). "
            "Use mode='semantic' (BioMedCLIP) for text queries."
        )

    text = text.strip()
    if not text:
        raise ValueError("Query text is empty")

    query_vector = resources.embedder.encode_text(text).reshape(1, -1).astype(np.float32)
    faiss.normalize_L2(query_vector)

    search_k = compute_search_k(k, resources.index.ntotal)
    scores, indices = resources.index.search(query_vector, search_k)

    return collect_ranked_results(
        rows=resources.rows,
        scores=scores[0],
        indices=indices[0],
        k=k,
    )


def search_image(
    *,
    mode: str,
    image: str | Path,
    k: int,
    embedder: str | None = None,
    model_name: str | None = None,
    index_path: str | Path | None = None,
    ids_path: str | Path | None = None,
    exclude_self: bool = False,
) -> tuple[str, str, list[dict[str, Any]]]:
    """Convenience CLI wrapper that loads resources, searches, and returns metadata."""
    resources = load_resources(
        mode=mode,
        embedder=embedder,
        model_name=model_name,
        index_path=index_path,
        ids_path=ids_path,
    )
    results = query(
        resources=resources,
        image=image,
        k=k,
        exclude_self=exclude_self,
    )
    return resources.embedder.name, str(resolve_path(image)), results


__all__ = [
    "MAX_K",
    "SearchResources",
    "collect_ranked_results",
    "load_resources",
    "query",
    "query_from_index",
    "query_text",
    "search_image",
]
