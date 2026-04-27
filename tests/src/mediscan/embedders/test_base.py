"""Tests for the embedder base contract."""

from __future__ import annotations

import pytest

from mediscan.embedders.base import Embedder, safe_int


def test_safe_int_returns_default_for_missing_or_invalid_values() -> None:
    """Environment integer parsing is defensive."""
    assert safe_int(None, default=3) == 3
    assert safe_int("bad", default=3) == 3


def test_safe_int_parses_valid_integer_strings() -> None:
    """Valid integer strings are converted."""
    assert safe_int("12", default=3) == 12


def test_embedder_base_class_cannot_be_instantiated() -> None:
    """Concrete embedders must implement encode_pil."""
    with pytest.raises(TypeError):
        Embedder()


def test_embedder_base_encode_pil_default_raises_not_implemented() -> None:
    """The abstract default body remains defensive for super() callers."""

    class SuperCallingEmbedder(Embedder):
        """Concrete embedder that delegates to the base implementation."""

        name = "super-calling"
        dim = 1

        def encode_pil(self, image):
            """Call the base method to exercise its defensive branch."""
            return super().encode_pil(image)

    with pytest.raises(NotImplementedError):
        SuperCallingEmbedder().encode_pil(object())
