"""
Configuration globale de l'application Mediscan.

Ce module centralise les paramètres système : connexion à la base de données,
URLs des ressources distantes et contraintes de validation de l'API.
"""

import os
from mediscan.runtime import SUPPORTED_MODES
from mediscan.search import MAX_K

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  

# Paramètres MongoDB 
MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = "mediscan_db"
COLLECTION_NAME = "results"

# Paramètres HuggingFace 
HF_BASE_URL = "https://huggingface.co/datasets/Mediscan-Team/mediscan-data/resolve/main"

# Contraintes de l'API 
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png"}
# Modes de recherche supportés par le moteur
ALLOWED_MODES = SUPPORTED_MODES

__all__ = ["MAX_K", "ALLOWED_CONTENT_TYPES", "ALLOWED_MODES", "MONGO_URI", "HF_BASE_URL"]
