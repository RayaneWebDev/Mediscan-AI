"""Process-level configuration helpers for MediScan AI."""

from __future__ import annotations

import os


def configure_cpu_environment() -> None:
    """Configure the environment for deterministic CPU execution."""
    os.environ["CUDA_VISIBLE_DEVICES"] = ""
    os.environ.setdefault("KMP_DUPLICATE_LIB_OK", "TRUE")
    os.environ.setdefault("OMP_NUM_THREADS", "1")


__all__ = ["configure_cpu_environment"]
