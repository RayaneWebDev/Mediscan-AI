"""Tests for the embedder package exports."""

from __future__ import annotations

from mediscan.embedders import BioMedCLIPEmbedder, DINOv2BaseEmbedder, Embedder, get_embedder


def test_embedder_package_exports_public_contracts() -> None:
    """The embedder package exposes the expected public objects."""
    assert Embedder.__name__ == "Embedder"
    assert DINOv2BaseEmbedder.name == "dinov2_base"
    assert BioMedCLIPEmbedder.name == "biomedclip"
    assert callable(get_embedder)
