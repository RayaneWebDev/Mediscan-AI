"""Shared utilities for PyTorch-based embedders."""

from __future__ import annotations

import os

import numpy as np
import torch

from .base import safe_int


def configure_torch_cpu_threads(
    env_var: str = "MEDISCAN_TORCH_THREADS",
    default: int = 1,
) -> None:
    """Configure the PyTorch thread count for deterministic CPU execution."""
    thread_count = safe_int(os.getenv(env_var), default=default)
    torch.set_num_threads(max(1, thread_count))
    try:
        torch.set_num_interop_threads(1)
    except RuntimeError:
        pass


def normalize_embedding(vector: np.ndarray, dim: int) -> np.ndarray:
    """Validate and L2-normalize an embedding vector."""
    normalized = np.asarray(vector, dtype=np.float32).reshape(-1)
    if normalized.shape != (dim,):
        raise RuntimeError(
            f"Unexpected embedding shape: got {normalized.shape}, expected ({dim},)"
        )

    norm = float(np.linalg.norm(normalized))
    if not np.isfinite(norm) or norm <= 0.0:
        raise RuntimeError("Embedding norm is invalid; cannot apply L2 normalization")

    normalized /= norm
    return normalized


__all__ = ["configure_torch_cpu_threads", "normalize_embedding"]