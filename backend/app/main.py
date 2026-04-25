"""
Point d'entrée de l'application FastAPI MediScan.
Initialise les services, configure le CORS et monte le router.
"""

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from mediscan.process import configure_cpu_environment

configure_cpu_environment()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api.routes import router
from backend.app.config import CORS_ALLOWED_ORIGINS
from backend.app.services.email_service import EmailService
from backend.app.services.search_service import SearchService

try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover - dependency is present in project requirements
    load_dotenv = None

logger = logging.getLogger(__name__)
ALLOWED_CORS_METHODS = ["GET", "POST"]
PROJECT_ROOT = Path(__file__).resolve().parents[2]

if load_dotenv is not None:
    load_dotenv(PROJECT_ROOT / ".env")


@asynccontextmanager
async def lifespan(application: FastAPI):
    """Initialise SearchService et EmailService au démarrage (ressources chargées à la demande)."""
    application.state.search_service = SearchService(resources={})
    application.state.email_service = EmailService()
    logger.info("Search resources will be loaded lazily on the first request.")
    yield


def configure_cors(application: FastAPI) -> None:
    """Configure le middleware CORS avec les origines autorisées."""
    application.add_middleware(
        CORSMiddleware,
        allow_origins=CORS_ALLOWED_ORIGINS,
        allow_methods=ALLOWED_CORS_METHODS,
        allow_headers=["*"],
    )


def create_app() -> FastAPI:
    """Crée et configure l'application FastAPI."""
    application = FastAPI(title="MEDISCAN API", version="1.0", lifespan=lifespan)
    configure_cors(application)
    application.include_router(router, prefix="/api")
    return application


app = create_app()
