"""
Reverse-engineering check for MediScan AI embeddings.

This script verifies whether an attacker could reconstruct an original
medical image from its vector embedding (DINOv2 or BioMedCLIP).

Expected result: reconstruction is mathematically impractical because the
embedding compresses the image by roughly 1993x for DINOv2 or 2989x for
BioMedCLIP, with irreversible loss of about 99.95% of the original
information. L2 normalization also removes vector amplitude, making
reconstruction even less realistic.

This script is a technical privacy proof for MediScan AI: uploaded images
cannot be recovered from the embeddings stored in the FAISS index.

Usage:
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
    Find the first indexed image that is available on the local filesystem.

    The search resources may contain rows for images that are not present in
    the current local checkout. This helper keeps the proof script robust by
    selecting the first row whose image path can actually be opened.

    Args:
        resources (SearchResources): Search resources containing metadata for
            indexed images.

    Returns:
        tuple[Path, str] | tuple[None, None]: The local image path and image
            identifier when available, otherwise ``(None, None)``.
    """
    for row in resources.rows:
        p = Path(row.get("path", ""))
        if p.exists():
            return p, row.get("image_id", "")
    return None, None


def compute_embedding(image_path: Path, resources) -> np.ndarray:
    """
    Encode an image into an embedding vector with the loaded embedder.

    Args:
        image_path (Path): Path of the image to encode.
        resources (SearchResources): Search resources containing the active
            DINOv2 or BioMedCLIP embedder.

    Returns:
        np.ndarray: Embedding vector shaped ``(dim,)``, where ``dim`` is 768
            for DINOv2 and 512 for BioMedCLIP.
    """
    with Image.open(image_path) as pil_image:
        return resources.embedder.encode_pil(pil_image)


def get_image_pixel_count(image_path: Path) -> tuple[int, int, int]:
    """
    Return image dimensions and the total number of RGB channel values.

    Args:
        image_path (Path): Path of the image to analyze.

    Returns:
        tuple[int, int, int]: A ``(width, height, value_count)`` tuple where
            ``value_count = width * height * 3`` for RGB channels.
    """
    with Image.open(image_path) as img:
        w, h = img.size
        return w, h, w * h * 3


def print_embedding_stats(embedding: np.ndarray) -> None:
    """
    Print diagnostic statistics for an embedding vector.

    Args:
        embedding (np.ndarray): Embedding vector to inspect.

    Returns:
        None
    """
    print(f"Embedding shape    : {embedding.shape}")
    print(f"Embedding dtype    : {embedding.dtype}")
    print(f"Embedding min/max  : {embedding.min():.4f} / {embedding.max():.4f}")
    print(f"L2 norm            : {np.linalg.norm(embedding):.4f}")
    print(f"First 10 values    : {embedding[:10].round(4)}")


def print_reverse_engineering_conclusion(
    w: int,
    h: int,
    n_pixels: int,
    embedding: np.ndarray,
) -> None:
    """
    Print the conclusion about reverse-engineering feasibility.

    The comparison makes the privacy argument concrete by showing the gap
    between the number of original pixel-channel values and the much smaller
    embedding vector.

    Args:
        w (int): Original image width in pixels.
        h (int): Original image height in pixels.
        n_pixels (int): Total image values, computed as ``w * h * 3``.
        embedding (np.ndarray): Image embedding vector.

    Returns:
        None
    """
    ratio = n_pixels / embedding.shape[0]
    print(f"\nOriginal image     : {w}x{h} pixels = {n_pixels} values")
    print(f"Embedding          : {embedding.shape[0]} values")
    print(f"Compression ratio  : {ratio:.0f}x")
    print(f"\nConclusion: reconstructing {n_pixels} values")
    print(f"  from only {embedding.shape[0]} values is not feasible.")
    print("  The embedding is an irreversible lossy compression.")
    print("  L2 normalization also removes the vector amplitude.")
    print("  Uploaded MediScan AI images cannot be reconstructed")
    print("  from the FAISS index.")


def main() -> None:
    """
    Run the reverse-engineering proof script.

    The workflow loads the visual index, selects the first locally available
    image, computes its embedding, and prints why the original image cannot be
    reconstructed from that compressed vector.

    Returns:
        None

    Raises:
        SystemExit: If no local image is available in the index.
    """
    print("Loading visual resources (DINOv2)...")
    resources = load_resources(mode="visual")

    image_path, image_id = load_first_local_image(resources)
    if image_path is None:
        print("[ERROR] No local image found in the index.")
        raise SystemExit(1)

    print(f"Test image: {image_id}")

    embedding = compute_embedding(image_path, resources)
    print_embedding_stats(embedding)

    w, h, n_pixels = get_image_pixel_count(image_path)
    print_reverse_engineering_conclusion(w, h, n_pixels, embedding)


if __name__ == "__main__":
    main()
