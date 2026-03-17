"""
Helpers dedicated to the appearance-based visual retrieval branch.

The semantic branch relies purely on embedding-space similarity. For the visual
branch, we add a second lightweight reranking step based on low-level image
appearance so that final neighbors are closer in shape/texture/intensity.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Callable

import numpy as np
from PIL import Image

VISUAL_SHORTLIST_SIZE = 120
_SIGNATURE_SIZE = 96
_COARSE_SIZE = 24
_PADDING_VALUE = 128

# Final score = FAISS shortlist prior + low-level appearance cues.
_FAISS_WEIGHT = 0.10
_PIXEL_WEIGHT = 0.40
_EDGE_WEIGHT = 0.20
_COARSE_WEIGHT = 0.30


def _padded_grayscale(image: Image.Image, size: int) -> np.ndarray:
    gray = image.convert("L")
    width, height = gray.size
    if width <= 0 or height <= 0:
        raise RuntimeError("Invalid image size for visual signature")

    scale = min(size / width, size / height)
    resized_width = max(1, int(round(width * scale)))
    resized_height = max(1, int(round(height * scale)))
    resized = gray.resize((resized_width, resized_height), Image.Resampling.BILINEAR)

    canvas = Image.new("L", (size, size), color=_PADDING_VALUE)
    offset = ((size - resized_width) // 2, (size - resized_height) // 2)
    canvas.paste(resized, offset)
    return np.asarray(canvas, dtype=np.float32) / 255.0


def build_visual_signature(image_path: Path) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Build a compact low-level signature used only by the visual reranker.

    The signature contains:
    - padded grayscale pixels
    - edge magnitude map
    - a coarser resized version to enforce global silhouette consistency
    """
    with Image.open(image_path) as image:
        pixels = _padded_grayscale(image, _SIGNATURE_SIZE)
        coarse = _padded_grayscale(image, _COARSE_SIZE)

    grad_x = np.abs(np.diff(pixels, axis=1, append=pixels[:, -1:]))
    grad_y = np.abs(np.diff(pixels, axis=0, append=pixels[-1:, :]))
    edges = np.sqrt(grad_x * grad_x + grad_y * grad_y)
    return pixels, edges, coarse


def rerank_visual_results(
    query_image: Path,
    candidates: list[dict[str, Any]],
    resolve_path: Callable[[str | Path], Path],
    limit: int,
) -> list[dict[str, Any]]:
    """
    Rerank FAISS candidates by actual visual appearance.

    If the query or candidate images cannot be opened, the original FAISS order
    is preserved. This keeps the pipeline robust and test-friendly.
    """
    try:
        query_signature = build_visual_signature(query_image)
    except Exception:
        return candidates[:limit]

    reranked: list[dict[str, Any]] = []
    query_pixels, query_edges, query_coarse = query_signature

    for candidate in candidates:
        try:
            candidate_path = resolve_path(str(candidate["path"]))
            cand_pixels, cand_edges, cand_coarse = build_visual_signature(candidate_path)
        except Exception:
            reranked.append(dict(candidate))
            continue

        pixel_similarity = 1.0 - float(np.mean(np.abs(query_pixels - cand_pixels)))
        edge_similarity = 1.0 - float(np.mean(np.abs(query_edges - cand_edges)))
        coarse_similarity = 1.0 - float(np.mean(np.abs(query_coarse - cand_coarse)))
        faiss_score = float(candidate["score"])

        combined_score = (
            _FAISS_WEIGHT * faiss_score
            + _PIXEL_WEIGHT * pixel_similarity
            + _EDGE_WEIGHT * edge_similarity
            + _COARSE_WEIGHT * coarse_similarity
        )

        updated = dict(candidate)
        updated["faiss_score"] = faiss_score
        updated["score"] = combined_score
        reranked.append(updated)

    reranked.sort(key=lambda item: float(item["score"]), reverse=True)
    trimmed = reranked[:limit]
    for rank, item in enumerate(trimmed, start=1):
        item["rank"] = rank
    return trimmed


__all__ = ["VISUAL_SHORTLIST_SIZE", "rerank_visual_results"]
