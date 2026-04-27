"""Tests for shared embedder utilities."""

from __future__ import annotations

import numpy as np
import pytest

from mediscan.embedders import utils as embedder_utils
from mediscan.embedders.utils import configure_torch_cpu_threads, normalize_embedding


def test_configure_torch_cpu_threads_uses_env_thread_count(monkeypatch) -> None:
    """Torch thread counts are configured from the environment."""
    calls: list[tuple[str, int]] = []

    monkeypatch.setenv("MEDISCAN_TORCH_THREADS", "3")
    monkeypatch.setattr(
        embedder_utils.torch,
        "set_num_threads",
        lambda count: calls.append(("threads", count)),
    )
    monkeypatch.setattr(
        embedder_utils.torch,
        "set_num_interop_threads",
        lambda count: calls.append(("interop", count)),
    )

    configure_torch_cpu_threads()

    assert calls == [("threads", 3), ("interop", 1)]


def test_configure_torch_cpu_threads_handles_invalid_env_and_interop_runtime_error(
    monkeypatch,
) -> None:
    """Invalid env values fall back to the default and interop errors are ignored."""
    calls: list[tuple[str, int]] = []

    monkeypatch.setenv("MEDISCAN_TORCH_THREADS", "invalid")
    monkeypatch.setattr(
        embedder_utils.torch,
        "set_num_threads",
        lambda count: calls.append(("threads", count)),
    )

    def raise_interop_error(count: int) -> None:
        """Simulate PyTorch refusing a second interop thread configuration."""
        calls.append(("interop", count))
        raise RuntimeError("already configured")

    monkeypatch.setattr(embedder_utils.torch, "set_num_interop_threads", raise_interop_error)

    configure_torch_cpu_threads(default=2)

    assert calls == [("threads", 2), ("interop", 1)]


def test_normalize_embedding_returns_float32_l2_vector() -> None:
    """Embeddings are reshaped, cast and L2-normalized."""
    vector = normalize_embedding(np.array([3.0, 4.0]), dim=2)

    assert vector.dtype == np.float32
    assert vector.shape == (2,)
    assert np.isclose(np.linalg.norm(vector), 1.0)


def test_normalize_embedding_rejects_unexpected_shape() -> None:
    """Embedding dimensionality is part of the contract."""
    with pytest.raises(RuntimeError, match="Unexpected embedding shape"):
        normalize_embedding(np.array([1.0, 2.0, 3.0]), dim=2)


def test_normalize_embedding_rejects_zero_or_non_finite_norm() -> None:
    """Zero and non-finite vectors cannot be normalized."""
    with pytest.raises(RuntimeError, match="Embedding norm is invalid"):
        normalize_embedding(np.array([0.0, 0.0]), dim=2)

    with pytest.raises(RuntimeError, match="Embedding norm is invalid"):
        normalize_embedding(np.array([np.inf, 1.0]), dim=2)
