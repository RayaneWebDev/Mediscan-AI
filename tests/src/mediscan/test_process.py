"""Tests for process-level runtime helpers."""

from __future__ import annotations

import os

from mediscan.process import configure_cpu_environment


def test_configure_cpu_environment_sets_default_cpu_flags(monkeypatch) -> None:
    """CPU defaults are applied when the caller did not configure them."""
    monkeypatch.delenv("CUDA_VISIBLE_DEVICES", raising=False)
    monkeypatch.delenv("KMP_DUPLICATE_LIB_OK", raising=False)
    monkeypatch.delenv("OMP_NUM_THREADS", raising=False)

    configure_cpu_environment()

    assert os.environ["CUDA_VISIBLE_DEVICES"] == ""
    assert os.environ["KMP_DUPLICATE_LIB_OK"] == "TRUE"
    assert os.environ["OMP_NUM_THREADS"] == "1"


def test_configure_cpu_environment_preserves_existing_values(monkeypatch) -> None:
    """Existing environment choices must not be overwritten."""
    monkeypatch.setenv("KMP_DUPLICATE_LIB_OK", "FALSE")
    monkeypatch.setenv("OMP_NUM_THREADS", "4")

    configure_cpu_environment()

    assert os.environ["KMP_DUPLICATE_LIB_OK"] == "FALSE"
    assert os.environ["OMP_NUM_THREADS"] == "4"


def test_configure_cpu_environment_hides_cuda_even_if_preconfigured(monkeypatch) -> None:
    """The app is CPU-only, so a CUDA-visible environment is actively disabled."""
    monkeypatch.setenv("CUDA_VISIBLE_DEVICES", "0")

    configure_cpu_environment()

    assert os.environ["CUDA_VISIBLE_DEVICES"] == ""
