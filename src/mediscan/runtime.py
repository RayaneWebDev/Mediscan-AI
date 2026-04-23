"""
Outils d'exécution partagés pour les scripts MEDISCAN.
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
    - Configuration stable pour un mode de récupération pris en charge.
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
    - Résoudre un chemin d'accès par rapport à la racine du projet ou à un répertoire de base facultatif.
    """
    path = Path(raw_path)
    if path.is_absolute():
        return path
    if base_dir is not None:
        return Path(base_dir) / path
    return PROJECT_ROOT / path


def get_mode_config(mode: str) -> ModeConfig:
    """Retourne la configuration stable de l'artefact pour un mode de récupération."""
    normalized = mode.strip().lower()
    config = STABLE_MODE_CONFIGS.get(normalized)
    if config is None:
        raise ValueError(f"Unsupported mode: {mode}")
    return config


def default_config_for_mode(mode: str) -> tuple[str, Path, Path]:
    """Retourne l'embedder par défaut et les fichiers d'index pour un mode de récupération."""
    config = get_mode_config(mode)
    return config.embedder, config.index_path, config.ids_path


def stable_manifest_path_for_mode(mode: str) -> Path:
    """Retourne le chemin du manifest stable pour un mode de récupération."""
    return get_mode_config(mode).manifest_path


def build_embedder(name: str, model_name: str | None = None):
    """
    - Instancie un encodeur en fonction de son nom et d'un paramètre de modèle optionnel.
    """
    kwargs: dict[str, object] = {}
    if model_name:
        kwargs["model_name"] = model_name
    return get_embedder(name, **kwargs)


def default_model_name_for_mode(mode: str) -> str | None:
    """Retourne le model_name par defaut d'un mode si celui-ci en impose un."""
    return get_mode_config(mode).model_name


def load_indexed_rows(ids_path: str | Path) -> list[dict[str, str]]:
    """
    - Charge les métadonnées indexées à partir d'un fichier JSON et les valide.
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


def ensure_artifacts_exist(index_path: str | Path, ids_path: str | Path) -> tuple[Path, Path]:
    """
    - Vérifie que les fichiers d'index et d'IDs existent et les retourne sous forme de chemins résolus.
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
    - Choisissez le nombre de candidats que FAISS doit retourner.
    """
    extra = 1 if exclude_self else 0
    return min(ntotal, k + extra)


def set_faiss_threads(faiss_module: object, count: int = 1) -> None:
    """
    - Définit le nombre de threads CPU pour FAISS lorsque cela est supporté par la version installée.
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
