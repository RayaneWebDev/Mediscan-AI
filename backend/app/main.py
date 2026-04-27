"""FastAPI application entrypoint for MediScan."""

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from mediscan.process import configure_cpu_environment

configure_cpu_environment()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api.routes import router
from backend.app.config import (
    CONCURRENCY_LIMITS,
    CORS_ALLOWED_ORIGINS,
    RATE_LIMITS,
    RATE_LIMIT_WINDOW_SECONDS,
)
from backend.app.services.email_service import EmailService
from backend.app.services.request_guards import InMemoryRateLimiter, RequestConcurrencyLimiter
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
    """Initialize SearchService and EmailService at startup with resources loaded on demand."""
    application.state.search_service = SearchService(resources={})
    application.state.email_service = EmailService()
    application.state.rate_limiter = InMemoryRateLimiter(RATE_LIMITS, RATE_LIMIT_WINDOW_SECONDS)
    application.state.concurrency_limiter = RequestConcurrencyLimiter(CONCURRENCY_LIMITS)
    logger.info("Search resources will be loaded lazily on the first request.")
    yield


def configure_cors(application: FastAPI) -> None:
    """Configure CORS middleware with the allowed origins."""
    application.add_middleware(
        CORSMiddleware,
        allow_origins=CORS_ALLOWED_ORIGINS,
        allow_methods=ALLOWED_CORS_METHODS,
        allow_headers=["*"],
    )


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    application = FastAPI(title="MEDISCAN API", version="1.0", lifespan=lifespan)
    configure_cors(application)
    application.include_router(router, prefix="/api")
    return application


app = create_app()
