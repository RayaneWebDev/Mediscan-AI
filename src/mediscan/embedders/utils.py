"""
Utilitaires partagés pour les embedders basés sur PyTorch.

Ce module fournit des fonctions communes utilisées par tous les encodeurs
PyTorch de MediScan AI : configuration des threads CPU et normalisation L2
des vecteurs d'embedding.
"""

from __future__ import annotations

import os

import numpy as np
import torch

from .base import safe_int


def configure_torch_cpu_threads(
    env_var: str = "MEDISCAN_TORCH_THREADS",
    default: int = 1,
) -> None:
    """
    Configure le nombre de threads PyTorch pour une exécution CPU déterministe.

    Lit le nombre de threads depuis une variable d'environnement et l'applique
    à PyTorch. Limite également les threads d'inter-opérabilité à 1 pour
    éviter les conflits avec FAISS.

    Args:
        env_var (str): Nom de la variable d'environnement à lire pour obtenir
            le nombre de threads. Défaut : 'MEDISCAN_TORCH_THREADS'.
        default (int): Nombre de threads à utiliser si la variable d'environnement
            est absente ou invalide. Défaut : 1.

    Returns:
        None

    Notes:
        L'appel à `torch.set_num_interop_threads` peut lever RuntimeError si
        PyTorch a déjà été initialisé — cette exception est silencieusement ignorée.
    """
    thread_count = safe_int(os.getenv(env_var), default=default)
    torch.set_num_threads(max(1, thread_count))
    try:
        torch.set_num_interop_threads(1)
    except RuntimeError:
        pass


def normalize_embedding(vector: np.ndarray, dim: int) -> np.ndarray:
    """
    Valide et normalise un vecteur d'embedding en L2.

    Convertit le vecteur en float32, vérifie sa forme et applique la
    normalisation L2 (division par la norme euclidienne). Le vecteur résultant
    a une norme de 1.0, ce qui permet d'utiliser le produit scalaire comme
    équivalent de la similarité cosinus dans FAISS IndexFlatIP.

    Args:
        vector (np.ndarray): Vecteur d'embedding brut produit par le modèle.
            Peut être de n'importe quelle forme compatible avec reshape(-1).
        dim (int): Dimension attendue du vecteur d'embedding après reshape.

    Returns:
        np.ndarray: Vecteur d'embedding 1D de forme (dim,), type float32,
            normalisé L2 (||v||₂ = 1.0).

    Raises:
        RuntimeError: Si la forme du vecteur après reshape ne correspond pas
            à (dim,), ou si la norme est nulle ou non finie (vecteur invalide).

    Example:
        >>> import numpy as np
        >>> v = np.array([3.0, 4.0], dtype=np.float32)
        >>> normalized = normalize_embedding(v, dim=2)
        >>> float(np.linalg.norm(normalized))
        1.0
    """
    normalized = np.asarray(vector, dtype=np.float32).reshape(-1)
    if normalized.shape != (dim,):
        raise RuntimeError(
            f"Unexpected embedding shape: got {normalized.shape}, expected ({dim},)"
        )

    norm = float(np.linalg.norm(normalized))
    if not np.isfinite(norm) or norm <= 0.0:
        raise RuntimeError("Embedding norm is invalid; cannot apply L2 normalization")

    normalized /= norm
    return normalized


__all__ = ["configure_torch_cpu_threads", "normalize_embedding"]