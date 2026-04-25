"""
Configuration de l'application chargée depuis les variables d'environnement.
"""

import os

from mediscan.runtime import SUPPORTED_MODES
from mediscan.search import MAX_K

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # python-dotenv not installed, env vars loaded from shell


def _env_int(name: str, default: int) -> int:
    """
    Lit une variable d'environnement entière.

    Raises:
        ValueError: Si la valeur n'est pas convertible en entier.
    """
    value = os.getenv(name)
    if value is None or not value.strip():
        return default

    try:
        return int(value)
    except ValueError as exc:
        raise ValueError(f"Environment variable {name} must be an integer.") from exc


def _env_csv(name: str, default: tuple[str, ...]) -> list[str]:
    """Lit une variable d'environnement CSV et retourne une liste de valeurs nettoyées."""
    value = os.getenv(name)
    if value is None or not value.strip():
        return list(default)

    return [item.strip() for item in value.split(",") if item.strip()]

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = "mediscan_db"
COLLECTION_NAME = "results"

HF_BASE_URL = "https://huggingface.co/datasets/Mediscan-Team/mediscan-data/resolve/main"

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png"}
ALLOWED_MODES = SUPPORTED_MODES
DEFAULT_CORS_ORIGINS = ("http://127.0.0.1:5173", "http://localhost:5173")
CORS_ALLOWED_ORIGINS = _env_csv("MEDISCAN_CORS_ORIGINS", DEFAULT_CORS_ORIGINS)
MAX_UPLOAD_BYTES = _env_int("MEDISCAN_MAX_UPLOAD_BYTES", 10 * 1024 * 1024)
REMOTE_IMAGE_TIMEOUT_SECONDS = _env_int("MEDISCAN_REMOTE_IMAGE_TIMEOUT_SECONDS", 15)
GROQ_API_KEY = os.getenv("GROQ_KEY_API", "").strip()
GROQ_MODEL = os.getenv("MEDISCAN_GROQ_MODEL", "llama-3.3-70b-versatile").strip()
MAX_CONCLUSION_RESULTS = _env_int("MEDISCAN_MAX_CONCLUSION_RESULTS", 6)

__all__ = [
    "MAX_K",
    "ALLOWED_CONTENT_TYPES",
    "ALLOWED_MODES",
    "COLLECTION_NAME",
    "CORS_ALLOWED_ORIGINS",
    "DB_NAME",
    "GROQ_API_KEY",
    "GROQ_MODEL",
    "HF_BASE_URL",
    "MAX_CONCLUSION_RESULTS",
    "MAX_UPLOAD_BYTES",
    "MONGO_URI",
    "REMOTE_IMAGE_TIMEOUT_SECONDS",
]
