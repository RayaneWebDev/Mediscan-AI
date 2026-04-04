"""
Interface de base pour les encodeurs (embedders) d'images.

Ce module définit le contrat minimal que tout encodeur doit respecter pour être
intégré dans le pipeline CBIR (construction d'index et recherche).

Pourquoi une interface ?
- Elle découple l'extraction de caractéristiques (modèle profond, caractéristiques 
  artisanales, etc.) du reste du système (indexation FAISS, recherche, évaluation).
- Elle rend le système flexible : vous pouvez changer le réseau de neurones (ResNet50,
  DenseNet, CLIP, etc.) sans modifier le code d'indexation ou de recherche.
"""

from __future__ import annotations

from abc import ABC, abstractmethod

import numpy as np
from PIL import Image as PILImage


def safe_int(value: str | None, default: int) -> int:
    """
    - Extrait un entier d'une variable d'environnement, sinon renvoie *default*.
    """
    if value is None:
        return default
    try:
        return int(value)
    except ValueError:
        return default


class Embedder(ABC):
    """
    Classe de base abstraite (interface) pour tous les encodeurs.

    Un encodeur convertit une image d'entrée en un vecteur numérique de taille fixe
    ("embedding") qui représente son contenu visuel. Ces vecteurs sont ensuite :
    - stockés dans un index FAISS (indexation hors ligne),
    - comparés à un vecteur de requête au moment de la recherche (récupération en ligne).

    Attributs
    ----------
    name : str
        Identifiant stable utilisé pour sélectionner un encodeur (ex: "dinov2_base").
    dim : int
        Dimension du vecteur d'embedding en sortie (ex: 2048 pour ResNet50).

    Notes
    -----
    Les implémentations DOIVENT retourner :
    - un tableau NumPy 1D de forme (dim,)
    - de type float32
    - normalisé L2 (||v||2 ~= 1), afin que la similarité cosinus puisse être calculée
      efficacement par produit scalaire (IndexFlatIP).
    """

    name: str
    dim: int

    @abstractmethod
    def encode_pil(self, image: PILImage.Image) -> np.ndarray:
        """
        Encode une image PIL en un vecteur d'embedding.

        Paramètres
        ----------
        image : PIL.Image.Image
            Image d'entrée (déjà chargée). Les implémentations peuvent convertir en RGB,
            redimensionner, normaliser, etc., selon les besoins du modèle.

        Retours
        -------
        np.ndarray
            Un vecteur d'embedding 1D normalisé L2 de forme (dim,), type float32.

        Exceptions
        ------
        ValueError
            Si l'image est invalide ou ne peut pas être traitée.
        """
        raise NotImplementedError


__all__ = ["Embedder", "safe_int"]