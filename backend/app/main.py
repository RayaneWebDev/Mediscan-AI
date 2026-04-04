"""
Point d'entrée principal de l'API MEDISCAN.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api.routes import router
from mediscan.process import configure_cpu_environment
from backend.app.services.search_service import SearchService

# Optimisation de l'environnement pour les calculs CPU (Faiss/Torch)
configure_cpu_environment()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(application: FastAPI):
    """
    - Initialise le SearchService au démarrage.
    - Gestion du cycle de vie de l'application.
    - Démarrez rapidement et chargez des ressources de recherche lourdes à la demande
    """
    application.state.search_service = SearchService(resources={})
    logger.info("Search resources will be loaded lazily on the first request.")
    yield

# Création de l'instance FastAPI
app = FastAPI(title="MEDISCAN API", version="1.0", lifespan=lifespan)

# Configuration du Middleware CORS 
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")
