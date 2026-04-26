"""
Moteur de recherche CBIR principal de MediScan AI.

Ce module constitue le cœur du pipeline de recherche d'images médicales par
similarité. Il fournit les fonctions partagées entre les scripts CLI et le
backend FastAPI pour :
- Charger les ressources de recherche (embedder, index FAISS, métadonnées).
- Exécuter des requêtes image-to-image via DINOv2 ou BioMedCLIP.
- Exécuter des requêtes text-to-image via BioMedCLIP.
- Collecter et filtrer les résultats top-k depuis l'index FAISS.

Pipeline de recherche :
    1. Chargement des ressources (load_resources) — une seule fois au démarrage.
    2. Encodage de l'image ou du texte requête en vecteur normalisé L2.
    3. Recherche des k vecteurs les plus proches dans l'index FAISS (IndexFlatIP).
    4. Construction et retour des résultats enrichis (rank, score, métadonnées).
"""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from mediscan.process import configure_cpu_environment

configure_cpu_environment()

import faiss
import numpy as np
from PIL import Image

from mediscan.embedders.base import Embedder
from mediscan.runtime import (
    build_embedder,
    compute_search_k,
    default_config_for_mode,
    default_model_name_for_mode,
    ensure_artifacts_exist,
    load_indexed_rows,
    resolve_path,
    set_faiss_threads,
)

MAX_K = 50


@dataclass
class SearchResources:
    """
    Ressources pré-chargées pour exécuter plusieurs requêtes sans rechargement.

    Regroupe l'embedder, l'index FAISS et les métadonnées des images indexées.
    Doit être instancié une seule fois via `load_resources()` et réutilisé
    pour toutes les requêtes suivantes afin d'éviter le rechargement des modèles.

    Attributes:
        embedder (Embedder | None): Instance de l'encodeur (DINOv2 ou BioMedCLIP).
            None si load_embedder=False a été passé à load_resources.
        index (faiss.Index): Index FAISS contenant tous les vecteurs d'embeddings.
        rows (list[dict[str, str]]): Liste des métadonnées des images indexées,
            dans le même ordre que les vecteurs de l'index FAISS.
        row_index_by_image_id (dict[str, int]): Dictionnaire de lookup rapide
            image_id → position dans rows/index. Construit automatiquement
            dans __post_init__ si non fourni.
    """
    embedder: Embedder | None
    index: faiss.Index
    rows: list[dict[str, str]]
    row_index_by_image_id: dict[str, int] = field(default_factory=dict)

    def __post_init__(self) -> None:
        """
        Construit l'index de lookup image_id → position si non fourni.

        Returns:
            None
        """
        if self.row_index_by_image_id:
            return
        self.row_index_by_image_id = {
            str(row.get("image_id", "")): idx for idx, row in enumerate(self.rows)
        }


def _validate_k(k: int) -> None:
    """
    Valide que k est dans l'intervalle autorisé [1, MAX_K].

    Args:
        k (int): Nombre de résultats à valider.

    Raises:
        ValueError: Si k est inférieur à 1 ou supérieur à MAX_K.
    """
    if not 0 < k <= MAX_K:
        raise ValueError(f"k must be between 1 and {MAX_K}")


def _build_result(row: dict[str, Any], *, rank: int, score: float) -> dict[str, Any]:
    """
    Construit un dictionnaire de résultat standardisé depuis une ligne de métadonnées.

    Args:
        row (dict[str, Any]): Ligne de métadonnées de l'image (image_id, path,
            caption, cui).
        rank (int): Rang du résultat dans la liste top-k (commence à 1).
        score (float): Score de similarité FAISS (produit scalaire normalisé).

    Returns:
        dict[str, Any]: Dictionnaire de résultat avec les clés rank, score,
            image_id, path, caption et cui.
    """
    return {
        "rank": rank,
        "score": float(score),
        "image_id": str(row.get("image_id", "")),
        "path": str(row.get("path", "")),
        "caption": str(row.get("caption", "")),
        "cui": str(row.get("cui", "")),
    }


def collect_ranked_results(
    *,
    rows: list[dict[str, str]],
    scores: Iterable[float],
    indices: Iterable[int],
    k: int,
    excluded_image_ids: set[str] | None = None,
    excluded_paths: set[str] | None = None,
) -> list[dict[str, Any]]:
    """
    Construit la liste top-k des résultats depuis les scores et indices FAISS.

    Filtre les résultats invalides (index < 0), les images exclues par identifiant
    ou par chemin, et s'arrête dès que k résultats valides ont été collectés.

    Args:
        rows (list[dict[str, str]]): Métadonnées de toutes les images indexées,
            dans le même ordre que l'index FAISS.
        scores (Iterable[float]): Scores de similarité retournés par FAISS,
            dans l'ordre décroissant.
        indices (Iterable[int]): Indices FAISS des vecteurs les plus proches,
            correspondant aux positions dans rows.
        k (int): Nombre maximum de résultats à retourner.
        excluded_image_ids (set[str] | None): Ensemble d'identifiants d'images
            à exclure des résultats (ex: l'image requête elle-même).
        excluded_paths (set[str] | None): Ensemble de chemins absolus d'images
            à exclure des résultats (complément de excluded_image_ids).

    Returns:
        list[dict[str, Any]]: Liste de k résultats maximum, chacun contenant
            rank, score, image_id, path, caption et cui. Peut être plus courte
            que k si l'index contient moins de résultats valides.
    """
    excluded_ids = excluded_image_ids or set()
    resolved_excluded_paths = {str(Path(path).resolve()) for path in (excluded_paths or set())}
    should_check_paths = bool(resolved_excluded_paths)
    results: list[dict[str, Any]] = []

    for raw_index, raw_score in zip(indices, scores):
        index = int(raw_index)
        if index < 0:
            continue

        row = rows[index]
        image_id = str(row.get("image_id", ""))
        relative_path = str(row.get("path", ""))

        if image_id in excluded_ids:
            continue

        if should_check_paths:
            absolute_path = str(resolve_path(relative_path).resolve()) if relative_path else ""
            if absolute_path in resolved_excluded_paths:
                continue

        results.append(_build_result(row, rank=len(results) + 1, score=float(raw_score)))
        if len(results) >= k:
            break

    return results


def load_resources(
    *,
    mode: str,
    embedder: str | None = None,
    model_name: str | None = None,
    index_path: str | Path | None = None,
    ids_path: str | Path | None = None,
    load_embedder: bool = True,
) -> SearchResources:
    """
    Charge l'embedder, l'index FAISS et les métadonnées pour un mode de recherche.

    Cette fonction doit être appelée une seule fois au démarrage — les ressources
    chargées sont ensuite réutilisées pour toutes les requêtes suivantes via
    les fonctions query(), query_text() et query_from_index().

    Args:
        mode (str): Mode de recherche ('visual' pour DINOv2, 'semantic' pour BioMedCLIP).
        embedder (str | None): Surcharge optionnelle du nom de l'embedder.
            Si None, utilise l'embedder par défaut du mode.
        model_name (str | None): Surcharge optionnelle du nom du modèle pré-entraîné.
            Si None, utilise le modèle par défaut du mode.
        index_path (str | Path | None): Surcharge optionnelle du chemin de l'index FAISS.
            Si None, utilise le chemin par défaut du mode.
        ids_path (str | Path | None): Surcharge optionnelle du chemin des IDs JSON.
            Si None, utilise le chemin par défaut du mode.
        load_embedder (bool): Si False, ne charge pas l'embedder (utile pour
            des opérations ne nécessitant pas d'encodage). Défaut : True.

    Returns:
        SearchResources: Instance contenant l'embedder, l'index FAISS,
            les métadonnées et l'index de lookup image_id → position.

    Raises:
        ValueError: Si le mode n'est pas supporté.
        FileNotFoundError: Si l'index FAISS ou le fichier IDs JSON est introuvable.
        RuntimeError: Si l'index FAISS est vide, si le nombre de vecteurs ne
            correspond pas au nombre de métadonnées, ou si la dimension de
            l'embedder ne correspond pas à celle de l'index.
    """
    set_faiss_threads(faiss)

    default_embedder, default_index_path, default_ids_path = default_config_for_mode(mode)
    embedder_name = embedder or default_embedder
    resolved_index = index_path if index_path is not None else default_index_path
    resolved_ids = ids_path if ids_path is not None else default_ids_path
    resolved_model_name = (
        model_name if model_name is not None else default_model_name_for_mode(mode)
    )
    index_path_obj, ids_path_obj = ensure_artifacts_exist(resolved_index, resolved_ids)

    rows = load_indexed_rows(ids_path_obj)
    faiss_index = faiss.read_index(str(index_path_obj))
    if faiss_index.ntotal == 0:
        raise RuntimeError("FAISS index is empty")
    if len(rows) != faiss_index.ntotal:
        raise RuntimeError(
            f"Index/IDs mismatch: index.ntotal={faiss_index.ntotal}, ids={len(rows)}"
        )

    image_embedder: Embedder | None = None
    if load_embedder:
        image_embedder = build_embedder(embedder_name, model_name=resolved_model_name)
        if image_embedder.dim != faiss_index.d:
            raise RuntimeError(
                f"Index dimension ({faiss_index.d}) does not match embedder ({image_embedder.dim})"
            )

    row_index_by_image_id = {
        str(row.get("image_id", "")): idx for idx, row in enumerate(rows)
    }
    return SearchResources(
        embedder=image_embedder,
        index=faiss_index,
        rows=rows,
        row_index_by_image_id=row_index_by_image_id,
    )


def query(
    *,
    resources: SearchResources,
    image: str | Path,
    k: int,
    exclude_self: bool = False,
) -> list[dict[str, Any]]:
    """
    Exécute une requête image-to-image top-k sur les ressources pré-chargées.

    Encode l'image requête via l'embedder, normalise le vecteur en L2 et
    recherche les k vecteurs les plus proches dans l'index FAISS.

    Args:
        resources (SearchResources): Ressources pré-chargées via load_resources().
        image (str | Path): Chemin vers l'image requête à encoder.
        k (int): Nombre de résultats à retourner (entre 1 et MAX_K).
        exclude_self (bool): Si True, exclut l'image requête des résultats
            (utile si l'image est déjà dans l'index). Défaut : False.

    Returns:
        list[dict[str, Any]]: Liste de k résultats maximum, triés par score
            décroissant, chacun contenant rank, score, image_id, path,
            caption et cui.

    Raises:
        ValueError: Si k est hors de l'intervalle [1, MAX_K].
        FileNotFoundError: Si l'image requête est introuvable.
        RuntimeError: Si l'embedder n'est pas chargé dans les ressources.
    """
    _validate_k(k)

    query_image = resolve_path(image)
    if not query_image.exists():
        raise FileNotFoundError(f"Query image not found: {query_image}")

    embedder = resources.embedder
    index = resources.index
    rows = resources.rows
    if embedder is None:
        raise RuntimeError("Image embedder is not loaded for this SearchResources instance")

    with Image.open(query_image) as pil_image:
        query_vector = embedder.encode_pil(pil_image).reshape(1, -1).astype(np.float32)
    faiss.normalize_L2(query_vector)

    search_k = compute_search_k(k, index.ntotal, exclude_self=exclude_self)
    scores, indices = index.search(query_vector, search_k)

    excluded_image_ids = {query_image.stem} if exclude_self else set()
    excluded_paths = {str(query_image.resolve())} if exclude_self else set()
    return collect_ranked_results(
        rows=rows,
        scores=scores[0],
        indices=indices[0],
        k=k,
        excluded_image_ids=excluded_image_ids,
        excluded_paths=excluded_paths,
    )


def query_from_index(
    *,
    resources: SearchResources,
    image_id: str,
    k: int,
    exclude_self: bool = False,
) -> list[dict[str, Any]]:
    """
    Exécute une requête top-k depuis un vecteur déjà stocké dans l'index FAISS.

    Récupère directement le vecteur d'embedding de l'image identifiée par
    image_id depuis l'index FAISS (via reconstruct), sans nécessiter l'accès
    au fichier image original ni le rechargement de l'embedder.

    Args:
        resources (SearchResources): Ressources pré-chargées via load_resources().
        image_id (str): Identifiant de l'image dont le vecteur est à utiliser
            comme requête (ex: 'ROCOv2_2023_train_000001').
        k (int): Nombre de résultats à retourner (entre 1 et MAX_K).
        exclude_self (bool): Si True, exclut l'image requête des résultats.
            Défaut : False.

    Returns:
        list[dict[str, Any]]: Liste de k résultats maximum, triés par score
            décroissant, chacun contenant rank, score, image_id, path,
            caption et cui.

    Raises:
        ValueError: Si k est hors de l'intervalle [1, MAX_K].
        KeyError: Si image_id n'est pas trouvé dans les métadonnées indexées.
    """
    _validate_k(k)

    row_index = resources.row_index_by_image_id.get(image_id.strip())
    if row_index is None:
        raise KeyError(f"Image id not found in indexed rows: {image_id}")

    index = resources.index
    rows = resources.rows
    query_vector = np.asarray(
        index.reconstruct(int(row_index)), dtype=np.float32
    ).reshape(1, -1)

    search_k = compute_search_k(k, index.ntotal, exclude_self=exclude_self)
    scores, indices = index.search(query_vector, search_k)

    row = rows[row_index]
    relative_path = str(row.get("path", ""))
    excluded_image_ids = {image_id} if exclude_self else set()
    excluded_paths = (
        {str(resolve_path(relative_path).resolve())}
        if exclude_self and relative_path
        else set()
    )
    return collect_ranked_results(
        rows=rows,
        scores=scores[0],
        indices=indices[0],
        k=k,
        excluded_image_ids=excluded_image_ids,
        excluded_paths=excluded_paths,
    )


def query_text(
    *,
    resources: SearchResources,
    text: str,
    k: int,
) -> list[dict[str, Any]]:
    """
    Exécute une requête text-to-image top-k sur les ressources pré-chargées.

    Encode la requête textuelle via l'encodeur de texte BioMedCLIP et recherche
    les k images les plus proches sémantiquement dans le même index FAISS que
    les requêtes image-to-image — aucune reconstruction d'index n'est nécessaire.

    Args:
        resources (SearchResources): Ressources pré-chargées via load_resources()
            avec mode='semantic'. L'embedder doit implémenter encode_text().
        text (str): Requête textuelle médicale en anglais. Les espaces en début
            et fin sont automatiquement supprimés.
        k (int): Nombre de résultats à retourner (entre 1 et MAX_K).

    Returns:
        list[dict[str, Any]]: Liste de k résultats maximum, triés par score
            décroissant, chacun contenant rank, score, image_id, path,
            caption et cui.

    Raises:
        ValueError: Si k est hors de l'intervalle [1, MAX_K], si l'embedder
            ne supporte pas encode_text() (mode visuel), ou si le texte
            est vide après suppression des espaces.
    """
    _validate_k(k)
    if not hasattr(resources.embedder, "encode_text"):
        raise ValueError(
            f"Embedder '{resources.embedder.name}' does not support encode_text(). "
            "Use mode='semantic' (BioMedCLIP) for text queries."
        )

    text = text.strip()
    if not text:
        raise ValueError("Query text is empty")

    query_vector = resources.embedder.encode_text(text).reshape(1, -1).astype(np.float32)
    faiss.normalize_L2(query_vector)

    search_k = compute_search_k(k, resources.index.ntotal)
    scores, indices = resources.index.search(query_vector, search_k)

    return collect_ranked_results(
        rows=resources.rows,
        scores=scores[0],
        indices=indices[0],
        k=k,
    )


def search_image(
    *,
    mode: str,
    image: str | Path,
    k: int,
    embedder: str | None = None,
    model_name: str | None = None,
    index_path: str | Path | None = None,
    ids_path: str | Path | None = None,
    exclude_self: bool = False,
) -> tuple[str, str, list[dict[str, Any]]]:
    """
    Wrapper de commodité : charge les ressources et exécute une requête en une seule fois.

    Combine load_resources() et query() pour les cas où une seule requête
    est nécessaire (scripts CLI). Pour des requêtes multiples, préférer
    load_resources() une seule fois puis query() à chaque requête.

    Args:
        mode (str): Mode de recherche ('visual' ou 'semantic').
        image (str | Path): Chemin vers l'image requête.
        k (int): Nombre de résultats à retourner.
        embedder (str | None): Surcharge optionnelle du nom de l'embedder.
        model_name (str | None): Surcharge optionnelle du nom du modèle.
        index_path (str | Path | None): Surcharge optionnelle du chemin FAISS.
        ids_path (str | Path | None): Surcharge optionnelle du chemin IDs JSON.
        exclude_self (bool): Si True, exclut l'image requête des résultats.

    Returns:
        tuple[str, str, list[dict]]: Un triplet contenant :
            - Le nom de l'embedder utilisé.
            - Le chemin absolu de l'image requête.
            - La liste des k résultats.

    Raises:
        ValueError: Si le mode ou k sont invalides.
        FileNotFoundError: Si l'image requête ou les artefacts FAISS sont introuvables.
        RuntimeError: Si l'index FAISS est vide ou incohérent.
    """
    resources = load_resources(
        mode=mode,
        embedder=embedder,
        model_name=model_name,
        index_path=index_path,
        ids_path=ids_path,
    )
    results = query(
        resources=resources,
        image=image,
        k=k,
        exclude_self=exclude_self,
    )
    return resources.embedder.name, str(resolve_path(image)), results


__all__ = [
    "MAX_K",
    "SearchResources",
    "collect_ranked_results",
    "load_resources",
    "query",
    "query_from_index",
    "query_text",
    "search_image",
]