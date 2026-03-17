"""Factory helpers for the supported embedders."""

from __future__ import annotations

from .base import Embedder
from .biomedclip import BioMedCLIPEmbedder
from .dinov2_base import DINOv2BaseEmbedder

EMBEDDER_REGISTRY = {
    DINOv2BaseEmbedder.name: DINOv2BaseEmbedder,
    BioMedCLIPEmbedder.name: BioMedCLIPEmbedder,
}


def get_embedder(name: str, **kwargs: object) -> Embedder:
    """Instantiate an embedder by name."""
    normalized = name.strip().lower()
    embedder_cls = EMBEDDER_REGISTRY.get(normalized)
    if embedder_cls is None:
        supported = sorted(EMBEDDER_REGISTRY)
        raise ValueError(f"Unknown embedder '{name}'. Supported embedders: {supported}")
    return embedder_cls(**kwargs)


__all__ = ["get_embedder"]
