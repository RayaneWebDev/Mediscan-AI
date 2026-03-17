from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
MAX_K = 50
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png"}
ALLOWED_MODES = {"visual", "semantic"}
