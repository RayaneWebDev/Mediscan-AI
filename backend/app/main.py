import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api.routes import router
from mediscan.process import configure_cpu_environment
from backend.app.services.search_service import SearchService
from mediscan.search import load_resources

configure_cpu_environment()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(application: FastAPI):
    """Load heavy resources once at startup, release on shutdown."""
    resources = {}
    for mode in ("visual", "semantic"):
        try:
            resources[mode] = load_resources(mode=mode)
        except Exception as exc:
            logger.warning("Could not load '%s' search resources at startup: %s", mode, exc)
    application.state.search_service = SearchService(resources=resources)
    yield


app = FastAPI(title="MEDISCAN API", version="1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")
