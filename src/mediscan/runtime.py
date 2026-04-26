"""
Outils d'exécution partagés pour le pipeline MediScan AI.

Ce module centralise la configuration des modes de recherche (visual et semantic),
la résolution des chemins d'artefacts FAISS, le chargement des métadonnées indexées
et les utilitaires de configuration de FAISS et PyTorch.

Il définit les configurations stables pour les deux modes supportés :
- visual : DINOv2 base (768 dimensions, index.faiss)
- semantic : BioMedCLIP fine-tuné ROCOv2 (512 dimensions, index_semantic.faiss)
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from mediscan.embedders.factory import get_embedder

PROJECT_ROOT = Path(__file__).resolve().parents[2]


@dataclass(frozen=True)
class ModeConfig:
    """
    Configuration stable pour un mode de recherche MediScan.

    Attributes:
        mode (str): Identifiant du mode ('visual' ou 'semantic').
        embedder (str): Nom de l'embedder associé (ex: 'dinov2_base').
        index_path (Path): Chemin absolu vers l'index FAISS.
        ids_path (Path): Chemin absolu vers le fichier IDs JSON.
        manifest_path (Path): Chemin absolu vers le fichier manifeste de build.
        model_name (str | None): Nom du modèle pré-entraîné à charger
            (ex: URL HuggingFace pour BioMedCLIP). None pour les modèles
            avec un nom par défaut (ex: DINOv2).
    """
    mode: str
    embedder: str
    index_path: Path
    ids_path: Path
    manifest_path: Path
    model_name: str | None = None


STABLE_MODE_CONFIGS = {
    "visual": ModeConfig(
        mode="visual",
        embedder="dinov2_base",
        index_path=PROJECT_ROOT / "artifacts" / "index.faiss",
        ids_path=PROJECT_ROOT / "artifacts" / "ids.json",
        manifest_path=PROJECT_ROOT / "artifacts" / "manifests" / "visual_stable.json",
        model_name=None,
    ),
    "semantic": ModeConfig(
        mode="semantic",
        embedder="biomedclip",
        index_path=PROJECT_ROOT / "artifacts" / "index_semantic.faiss",
        ids_path=PROJECT_ROOT / "artifacts" / "ids_semantic.json",
        manifest_path=PROJECT_ROOT / "artifacts" / "manifests" / "semantic_stable.json",
        model_name="hf-hub:Ozantsk/biomedclip-rocov2-finetuned",
    ),
}
SUPPORTED_MODES = frozenset(STABLE_MODE_CONFIGS)


def resolve_path(raw_path: str | Path, base_dir: Path | None = None) -> Path:
    """
    Résout un chemin relatif ou absolu depuis la racine du projet.

    Args:
        raw_path (str | Path): Chemin à résoudre. Si absolu, retourné tel quel.
        base_dir (Path | None): Répertoire de base optionnel. Si fourni,
            les chemins relatifs sont résolus depuis ce répertoire plutôt
            que depuis la racine du projet.

    Returns:
        Path: Chemin absolu résolu.
    """
    path = Path(raw_path)
    if path.is_absolute():
        return path
    if base_dir is not None:
        return Path(base_dir) / path
    return PROJECT_ROOT / path


def get_mode_config(mode: str) -> ModeConfig:
    """
    Retourne la configuration stable pour un mode de recherche donné.

    Args:
        mode (str): Identifiant du mode ('visual' ou 'semantic').
            La casse est ignorée.

    Returns:
        ModeConfig: Configuration complète du mode (embedder, chemins d'index,
            de métadonnées et de manifeste).

    Raises:
        ValueError: Si le mode n'est pas supporté.
    """
    normalized = mode.strip().lower()
    config = STABLE_MODE_CONFIGS.get(normalized)
    if config is None:
        raise ValueError(f"Unsupported mode: {mode}")
    return config


def default_config_for_mode(mode: str) -> tuple[str, Path, Path]:
    """
    Retourne l'embedder et les chemins d'artefacts par défaut pour un mode.

    Args:
        mode (str): Identifiant du mode ('visual' ou 'semantic').

    Returns:
        tuple[str, Path, Path]: Un triplet contenant :
            - Le nom de l'embedder (ex: 'dinov2_base').
            - Le chemin vers l'index FAISS.
            - Le chemin vers le fichier IDs JSON.

    Raises:
        ValueError: Si le mode n'est pas supporté.
    """
    config = get_mode_config(mode)
    return config.embedder, config.index_path, config.ids_path


def stable_manifest_path_for_mode(mode: str) -> Path:
    """
    Retourne le chemin du fichier manifeste stable pour un mode donné.

    Args:
        mode (str): Identifiant du mode ('visual' ou 'semantic').

    Returns:
        Path: Chemin absolu vers le fichier manifeste JSON du mode.

    Raises:
        ValueError: Si le mode n'est pas supporté.
    """
    return get_mode_config(mode).manifest_path


def build_embedder(name: str, model_name: str | None = None):
    """
    Instancie un embedder à partir de son nom et d'un modèle optionnel.

    Args:
        name (str): Nom de l'embedder à instancier (ex: 'dinov2_base', 'biomedclip').
        model_name (str | None): Nom ou URL du modèle pré-entraîné à charger.
            Si None, le modèle par défaut de l'embedder est utilisé.

    Returns:
        Embedder: Instance de l'embedder prête à encoder des images.

    Raises:
        ValueError: Si le nom de l'embedder n'est pas reconnu.
    """
    kwargs: dict[str, object] = {}
    if model_name:
        kwargs["model_name"] = model_name
    return get_embedder(name, **kwargs)


def default_model_name_for_mode(mode: str) -> str | None:
    """
    Retourne le nom du modèle par défaut pour un mode donné.

    Args:
        mode (str): Identifiant du mode ('visual' ou 'semantic').

    Returns:
        str | None: Nom ou URL HuggingFace du modèle, ou None si le mode
            utilise le modèle par défaut de l'embedder.

    Raises:
        ValueError: Si le mode n'est pas supporté.
    """
    return get_mode_config(mode).model_name


def load_indexed_rows(ids_path: str | Path) -> list[dict[str, str]]:
    """
    Charge les métadonnées indexées depuis un fichier IDs JSON.

    Args:
        ids_path (str | Path): Chemin vers le fichier IDs JSON à charger.

    Returns:
        list[dict[str, str]]: Liste des enregistrements de métadonnées,
            chacun contenant au minimum image_id, path, caption et cui.

    Raises:
        FileNotFoundError: Si le fichier IDs JSON n'existe pas.
        RuntimeError: Si le fichier n'est pas une liste JSON valide ou est vide.
    """
    path = resolve_path(ids_path)
    if not path.exists():
        raise FileNotFoundError(f"IDs file not found: {path}")

    with path.open("r", encoding="utf-8") as handle:
        rows = json.load(handle)

    if not isinstance(rows, list):
        raise RuntimeError("Invalid ids file format: expected a JSON list")
    if not rows:
        raise RuntimeError("IDs file is empty")
    return rows


def ensure_artifacts_exist(
    index_path: str | Path,
    ids_path: str | Path,
) -> tuple[Path, Path]:
    """
    Vérifie que les artefacts FAISS existent et retourne leurs chemins résolus.

    Args:
        index_path (str | Path): Chemin vers le fichier d'index FAISS.
        ids_path (str | Path): Chemin vers le fichier IDs JSON associé.

    Returns:
        tuple[Path, Path]: Un couple (index_path, ids_path) contenant les
            chemins absolus résolus vers les deux artefacts.

    Raises:
        FileNotFoundError: Si l'index FAISS ou le fichier IDs JSON est introuvable.
    """
    resolved_index = resolve_path(index_path)
    resolved_ids = resolve_path(ids_path)
    if not resolved_index.exists():
        raise FileNotFoundError(f"FAISS index not found: {resolved_index}")
    if not resolved_ids.exists():
        raise FileNotFoundError(f"IDs file not found: {resolved_ids}")
    return resolved_index, resolved_ids


def compute_search_k(k: int, ntotal: int, *, exclude_self: bool = False) -> int:
    """
    Calcule le nombre de candidats à demander à FAISS pour obtenir k résultats.

    Lorsque exclude_self est activé, FAISS doit retourner k+1 candidats
    pour compenser l'exclusion de l'image requête elle-même.

    Args:
        k (int): Nombre de résultats finaux souhaités.
        ntotal (int): Nombre total de vecteurs dans l'index FAISS.
        exclude_self (bool): Si True, ajoute 1 au nombre de candidats demandés
            pour compenser l'exclusion de l'image requête. Défaut : False.

    Returns:
        int: Nombre de candidats à demander à FAISS, plafonné à ntotal.
    """
    extra = 1 if exclude_self else 0
    return min(ntotal, k + extra)


def set_faiss_threads(faiss_module: object, count: int = 1) -> None:
    """
    Configure le nombre de threads CPU utilisés par FAISS.

    Appelle `omp_set_num_threads` si la fonction est disponible dans la
    version de FAISS installée. Ne fait rien si la fonction est absente.

    Args:
        faiss_module (object): Module FAISS importé.
        count (int): Nombre de threads à allouer à FAISS. Défaut : 1.

    Returns:
        None
    """
    setter = getattr(faiss_module, "omp_set_num_threads", None)
    if callable(setter):
        setter(count)


__all__ = [
    "ModeConfig",
    "PROJECT_ROOT",
    "STABLE_MODE_CONFIGS",
    "SUPPORTED_MODES",
    "build_embedder",
    "compute_search_k",
    "default_config_for_mode",
    "default_model_name_for_mode",
    "ensure_artifacts_exist",
    "get_mode_config",
    "load_indexed_rows",
    "resolve_path",
    "set_faiss_threads",
    "stable_manifest_path_for_mode",
]