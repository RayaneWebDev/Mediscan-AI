"""
Factory helpers for embedders.

This module provides a single entry point to instantiate an Embedder by name.
It keeps the rest of the codebase decoupled from concrete embedder classes.

Why a factory?
- CLI scripts (build_index.py, query.py) can accept --embedder <name>.
- Adding a new model (e.g., DenseNet, CLIP) only requires:
  1) implementing the Embedder interface,
  2) registering it here (or in a registry),
  without touching indexing/query logic.
"""

from __future__ import annotations

from .base import Embedder
from .clip_vit_b32 import CLIPViTB32Embedder
from .resnet50_radimagenet import ResNet50RadImageNetEmbedder


def get_embedder(name: str, **kwargs: object) -> Embedder:
    """
    Instantiate and return an embedder by its name.

    Parameters
    ----------
    name : str
        Embedder identifier (case-insensitive). Example: "resnet50_radimagenet".
    **kwargs : object
        Optional parameters forwarded to the embedder constructor.
        Example: weights_path="weights/resnet50_radimagenet.pt".

    Returns
    -------
    Embedder
        A ready-to-use embedder instance that implements the Embedder interface.

    Raises
    ------
    ValueError
        If the given name does not match any supported embedder.
    """
    normalized = name.strip().lower()

    # Register embedders here.
    if normalized == ResNet50RadImageNetEmbedder.name:
        return ResNet50RadImageNetEmbedder(**kwargs)
    if normalized == CLIPViTB32Embedder.name:
        return CLIPViTB32Embedder(**kwargs)

    supported = [ResNet50RadImageNetEmbedder.name, CLIPViTB32Embedder.name]
    raise ValueError(f"Unknown embedder '{name}'. Supported embedders: {supported}")


__all__ = ["get_embedder"]
