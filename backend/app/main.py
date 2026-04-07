import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api.routes import router
from mediscan.process import configure_cpu_environment
from backend.app.services.search_service import SearchService

configure_cpu_environment()
logger = logging.getLogger(__name__)
ALLOWED_CORS_METHODS = ["GET", "POST"]


@asynccontextmanager
async def lifespan(application: FastAPI):
    """Start quickly and load heavy search resources on demand."""
    application.state.search_service = SearchService(resources={})
    logger.info("Search resources will be loaded lazily on the first request.")
    yield


def configure_cors(application: FastAPI) -> None:
    application.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=ALLOWED_CORS_METHODS,
        allow_headers=["*"],
    )


def create_app() -> FastAPI:
    application = FastAPI(title="MEDISCAN API", version="1.0", lifespan=lifespan)
    configure_cors(application)
    application.include_router(router, prefix="/api")
    return application


app = create_app()
