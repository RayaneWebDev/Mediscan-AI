"""
Application configuration loaded from environment variables.
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
    Read an integer environment variable.

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
    """Read a CSV environment variable and return cleaned values."""
    value = os.getenv(name)
    if value is None or not value.strip():
        return list(default)

    return [item.strip() for item in value.split(",") if item.strip()]


def _env_bool(name: str, default: bool = False) -> bool:
    """Read a boolean environment variable."""
    value = os.getenv(name)
    if value is None or not value.strip():
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = "mediscan_db"
COLLECTION_NAME = "results"
MONGO_SERVER_SELECTION_TIMEOUT_MS = _env_int("MEDISCAN_MONGO_SERVER_SELECTION_TIMEOUT_MS", 2000)
MONGO_CONNECT_TIMEOUT_MS = _env_int("MEDISCAN_MONGO_CONNECT_TIMEOUT_MS", 2000)

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
RATE_LIMIT_WINDOW_SECONDS = _env_int("MEDISCAN_RATE_LIMIT_WINDOW_SECONDS", 60)
RATE_LIMITS = {
    "search": _env_int("MEDISCAN_RATE_LIMIT_SEARCH", 12),
    "search_text": _env_int("MEDISCAN_RATE_LIMIT_SEARCH_TEXT", 20),
    "search_by_id": _env_int("MEDISCAN_RATE_LIMIT_SEARCH_BY_ID", 30),
    "search_by_ids": _env_int("MEDISCAN_RATE_LIMIT_SEARCH_BY_IDS", 10),
    "conclusion": _env_int("MEDISCAN_RATE_LIMIT_CONCLUSION", 5),
    "contact": _env_int("MEDISCAN_RATE_LIMIT_CONTACT", 3),
}
CONCURRENCY_LIMITS = {
    "search": _env_int("MEDISCAN_SEARCH_CONCURRENCY_LIMIT", 2),
    "conclusion": _env_int("MEDISCAN_CONCLUSION_CONCURRENCY_LIMIT", 2),
    "contact": _env_int("MEDISCAN_CONTACT_CONCURRENCY_LIMIT", 5),
}
TRUST_PROXY_HEADERS = _env_bool("MEDISCAN_TRUST_PROXY_HEADERS", False)

__all__ = [
    "MAX_K",
    "ALLOWED_CONTENT_TYPES",
    "ALLOWED_MODES",
    "COLLECTION_NAME",
    "CONCURRENCY_LIMITS",
    "CORS_ALLOWED_ORIGINS",
    "DB_NAME",
    "GROQ_API_KEY",
    "GROQ_MODEL",
    "HF_BASE_URL",
    "MAX_CONCLUSION_RESULTS",
    "MAX_UPLOAD_BYTES",
    "MONGO_URI",
    "MONGO_CONNECT_TIMEOUT_MS",
    "MONGO_SERVER_SELECTION_TIMEOUT_MS",
    "RATE_LIMITS",
    "RATE_LIMIT_WINDOW_SECONDS",
    "REMOTE_IMAGE_TIMEOUT_SECONDS",
    "TRUST_PROXY_HEADERS",
]
