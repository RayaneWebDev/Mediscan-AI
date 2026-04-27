"""Factory for instantiating MediScan AI embedders."""

from __future__ import annotations

from .base import Embedder
from .biomedclip import BioMedCLIPEmbedder
from .dinov2_base import DINOv2BaseEmbedder

EMBEDDER_REGISTRY: dict[str, type[Embedder]] = {
    DINOv2BaseEmbedder.name: DINOv2BaseEmbedder,
    BioMedCLIPEmbedder.name: BioMedCLIPEmbedder,
}


def get_embedder(name: str, **kwargs: object) -> Embedder:
    """Instantiate an embedder from its name and parameters."""
    normalized = name.strip().lower()
    embedder_cls = EMBEDDER_REGISTRY.get(normalized)
    if embedder_cls is None:
        supported = sorted(EMBEDDER_REGISTRY)
        raise ValueError(
            f"Unknown embedder '{name}'. Supported embedders: {supported}"
        )
    return embedder_cls(**kwargs)


__all__ = ["get_embedder", "EMBEDDER_REGISTRY"]