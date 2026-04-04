"""
Outils de type 'Factory' pour les encodeurs (embedders) pris en charge.

Le module définit une fonction `get_embedder(name: str, **kwargs)` qui instancie un encodeur
en fonction de son nom (ex: "dinov2_base", "biomedclip",
etc.) et de ses paramètres spécifiques (ex: `model_name` pour les modèles Hugging Face).
"""

from __future__ import annotations

from .base import Embedder
from .biomedclip import BioMedCLIPEmbedder
from .dinov2_base import DINOv2BaseEmbedder

EMBEDDER_REGISTRY = {
    DINOv2BaseEmbedder.name: DINOv2BaseEmbedder,
    BioMedCLIPEmbedder.name: BioMedCLIPEmbedder,
}


def get_embedder(name: str, **kwargs: object) -> Embedder:
    """
    - Instancie un encodeur en fonction de son nom et de ses paramètres spécifiques.
    """
    normalized = name.strip().lower()
    embedder_cls = EMBEDDER_REGISTRY.get(normalized)
    if embedder_cls is None:
        supported = sorted(EMBEDDER_REGISTRY)
        raise ValueError(f"Unknown embedder '{name}'. Supported embedders: {supported}")
    return embedder_cls(**kwargs)


__all__ = ["get_embedder"]
