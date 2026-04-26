"""
Factory pour l'instanciation des embedders MediScan AI.

Ce module implémente le patron de conception Factory pour créer les encodeurs
d'images supportés par MediScan AI. Il maintient un registre centralisé des
embedders disponibles et expose une fonction unique `get_embedder` pour les
instancier à partir de leur nom.

Embedders disponibles :
    - 'dinov2_base' : DINOv2 base (768 dimensions) — mode visuel.
    - 'biomedclip'  : BioMedCLIP fine-tuné ROCOv2 (512 dimensions) — mode sémantique.
"""

from __future__ import annotations

from .base import Embedder
from .biomedclip import BioMedCLIPEmbedder
from .dinov2_base import DINOv2BaseEmbedder

EMBEDDER_REGISTRY: dict[str, type[Embedder]] = {
    DINOv2BaseEmbedder.name: DINOv2BaseEmbedder,
    BioMedCLIPEmbedder.name: BioMedCLIPEmbedder,
}


def get_embedder(name: str, **kwargs: object) -> Embedder:
    """
    Instancie un embedder à partir de son nom et de ses paramètres.

    Recherche l'embedder dans le registre EMBEDDER_REGISTRY (insensible à la
    casse) et l'instancie avec les paramètres fournis.

    Args:
        name (str): Nom de l'embedder à instancier. Doit correspondre à l'un
            des identifiants enregistrés dans EMBEDDER_REGISTRY
            (ex: 'dinov2_base', 'biomedclip').
        **kwargs: Paramètres additionnels transmis au constructeur de l'embedder.
            Par exemple, `model_name` pour spécifier un modèle HuggingFace
            alternatif pour BioMedCLIP.

    Returns:
        Embedder: Instance de l'embedder demandé, prête à encoder des images.

    Raises:
        ValueError: Si le nom de l'embedder n'est pas reconnu dans le registre.
            Le message d'erreur liste les embedders disponibles.

    Example:
        >>> embedder = get_embedder("dinov2_base")
        >>> embedder = get_embedder("biomedclip", model_name="hf-hub:org/model")
    """
    normalized = name.strip().lower()
    embedder_cls = EMBEDDER_REGISTRY.get(normalized)
    if embedder_cls is None:
        supported = sorted(EMBEDDER_REGISTRY)
        raise ValueError(
            f"Unknown embedder '{name}'. Supported embedders: {supported}"
        )
    return embedder_cls(**kwargs)


__all__ = ["get_embedder", "EMBEDDER_REGISTRY"]