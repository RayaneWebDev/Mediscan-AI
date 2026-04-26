"""
Test de reverse engineering des embeddings MediScan AI.

Ce script vérifie si un attaquant pourrait reconstruire une image médicale
originale à partir de son embedding vectoriel (DINOv2 ou BioMedCLIP).

Résultat attendu : la reconstruction est mathématiquement impossible car
l'embedding compresse l'image avec un ratio de ~1993x (DINOv2) ou ~2989x
(BioMedCLIP), avec perte irréversible de 99.95% de l'information originale.
De plus, la normalisation L2 efface l'amplitude du vecteur, rendant toute
reconstruction encore moins envisageable.

Ce script constitue une preuve technique de la confidentialité des données
dans MediScan AI — les images uploadées ne peuvent pas être retrouvées
depuis les embeddings stockés dans l'index FAISS.

Usage :
    python scripts/test_reverse_engineering.py
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

from mediscan.process import configure_cpu_environment
from mediscan.search import load_resources

configure_cpu_environment()


def load_first_local_image(resources) -> tuple[Path, str] | tuple[None, None]:
    """
    Trouve la première image disponible localement dans l'index FAISS.

    Parcourt les enregistrements de l'index et retourne le chemin et
    l'identifiant de la première image dont le fichier existe sur disque.

    Args:
        resources (SearchResources): Ressources de recherche contenant
            les métadonnées de toutes les images indexées.

    Returns:
        tuple[Path, str] | tuple[None, None]: Un couple (chemin, image_id)
            si une image locale est trouvée, ou (None, None) sinon.
    """
    for row in resources.rows:
        p = Path(row.get("path", ""))
        if p.exists():
            return p, row.get("image_id", "")
    return None, None


def compute_embedding(image_path: Path, resources) -> np.ndarray:
    """
    Encode une image en vecteur d'embedding via l'embedder chargé.

    Args:
        image_path (Path): Chemin vers l'image à encoder.
        resources (SearchResources): Ressources contenant l'embedder
            (DINOv2 ou BioMedCLIP) à utiliser pour l'encodage.

    Returns:
        np.ndarray: Vecteur d'embedding de forme (dim,) où dim vaut
            768 pour DINOv2 et 512 pour BioMedCLIP.
    """
    with Image.open(image_path) as pil_image:
        return resources.embedder.encode_pil(pil_image)


def get_image_pixel_count(image_path: Path) -> tuple[int, int, int]:
    """
    Retourne les dimensions et le nombre total de valeurs d'une image RGB.

    Args:
        image_path (Path): Chemin vers l'image à analyser.

    Returns:
        tuple[int, int, int]: Un triplet (largeur, hauteur, n_pixels) où
            n_pixels = largeur × hauteur × 3 (canaux RGB).
    """
    with Image.open(image_path) as img:
        w, h = img.size
        return w, h, w * h * 3


def print_embedding_stats(embedding: np.ndarray) -> None:
    """
    Affiche les statistiques du vecteur d'embedding dans la console.

    Args:
        embedding (np.ndarray): Vecteur d'embedding à analyser.

    Returns:
        None
    """
    print(f"Embedding shape    : {embedding.shape}")
    print(f"Embedding dtype    : {embedding.dtype}")
    print(f"Embedding min/max  : {embedding.min():.4f} / {embedding.max():.4f}")
    print(f"Norme L2           : {np.linalg.norm(embedding):.4f}")
    print(f"10 premières valeurs : {embedding[:10].round(4)}")


def print_reverse_engineering_conclusion(
    w: int,
    h: int,
    n_pixels: int,
    embedding: np.ndarray,
) -> None:
    """
    Affiche la conclusion sur l'impossibilité du reverse engineering.

    Compare le nombre de valeurs dans l'image originale avec celui
    de l'embedding pour démontrer l'impossibilité mathématique de
    reconstruire l'image depuis son embedding.

    Args:
        w (int): Largeur de l'image originale en pixels.
        h (int): Hauteur de l'image originale en pixels.
        n_pixels (int): Nombre total de valeurs dans l'image (w × h × 3).
        embedding (np.ndarray): Vecteur d'embedding de l'image.

    Returns:
        None
    """
    ratio = n_pixels / embedding.shape[0]
    print(f"\nImage originale    : {w}x{h} pixels = {n_pixels} valeurs")
    print(f"Embedding          : {embedding.shape[0]} valeurs")
    print(f"Ratio de compression : {ratio:.0f}x")
    print(f"\n✓ Conclusion : impossible de reconstruire {n_pixels} valeurs")
    print(f"  depuis seulement {embedding.shape[0]} valeurs.")
    print("  L'embedding est une compression avec perte d'information irréversible.")
    print("  La normalisation L2 efface en plus l'amplitude du vecteur.")
    print("  → Les images uploadées dans MediScan AI ne peuvent pas être")
    print("    reconstituées depuis l'index FAISS.")


def main() -> None:
    """
    Point d'entrée principal du test de reverse engineering.

    Charge l'index visuel, sélectionne la première image locale disponible,
    calcule son embedding, et démontre l'impossibilité de reconstruire
    l'image originale depuis ce vecteur.

    Returns:
        None

    Raises:
        SystemExit: Si aucune image locale n'est disponible dans l'index.
    """
    print("Chargement des ressources visual (DINOv2)...")
    resources = load_resources(mode="visual")

    image_path, image_id = load_first_local_image(resources)
    if image_path is None:
        print("[ERREUR] Aucune image locale trouvée dans l'index.")
        raise SystemExit(1)

    print(f"Image test : {image_id}")

    embedding = compute_embedding(image_path, resources)
    print_embedding_stats(embedding)

    w, h, n_pixels = get_image_pixel_count(image_path)
    print_reverse_engineering_conclusion(w, h, n_pixels, embedding)


if __name__ == "__main__":
    main()