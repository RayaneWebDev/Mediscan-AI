"""Factory helpers for embedders."""

from __future__ import annotations

from .base import Embedder
from .resnet50_radimagenet import ResNet50RadImageNetEmbedder


def get_embedder(name: str, **kwargs: object) -> Embedder:
    normalized = name.strip().lower()

    if normalized == ResNet50RadImageNetEmbedder.name:
        return ResNet50RadImageNetEmbedder(**kwargs)

    supported = [ResNet50RadImageNetEmbedder.name]
    raise ValueError(f"Unknown embedder '{name}'. Supported embedders: {supported}")


__all__ = ["get_embedder"]
