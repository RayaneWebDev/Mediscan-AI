"""Optional search result enrichment with MongoDB metadata."""

from __future__ import annotations

import logging
from typing import Any

from backend.app.config import (
    COLLECTION_NAME,
    DB_NAME,
    MONGO_CONNECT_TIMEOUT_MS,
    MONGO_SERVER_SELECTION_TIMEOUT_MS,
    MONGO_URI,
)

logger = logging.getLogger(__name__)


def _load_mongo_collection():
    """Try to connect to MongoDB and return the MediScan collection."""
    if not MONGO_URI:
        return None

    try:
        from pymongo import MongoClient

        client = MongoClient(
            MONGO_URI,
            serverSelectionTimeoutMS=MONGO_SERVER_SELECTION_TIMEOUT_MS,
            connectTimeoutMS=MONGO_CONNECT_TIMEOUT_MS,
        )
        client.admin.command("ping")
        return client[DB_NAME][COLLECTION_NAME]
    except Exception as exc:
        logger.warning("MongoDB enrichment disabled: %s", exc)
        return None


class MongoResultEnricher:
    """Optional search result enrichment layer backed by MongoDB."""

    def __init__(self, collection=None) -> None:
        """Initialize the enricher with a MongoDB collection."""
        self._collection = collection

    @classmethod
    def from_environment(cls) -> "MongoResultEnricher":
        """
        Create an enricher by reading configuration from environment variables.

        Returns:
            MongoResultEnricher instance, with or without an active MongoDB connection.
        """
        return cls(collection=_load_mongo_collection())

    def enrich(self, results: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Enrich a search result list with MongoDB metadata."""
        if self._collection is None or not results:
            return results

        image_ids = [result["image_id"] for result in results if result.get("image_id")]

        try:
            docs = {
                doc["image_id"]: doc
                for doc in self._collection.find(
                    {"image_id": {"$in": image_ids}},
                    {"image_id": 1, "caption": 1, "cui": 1},
                )
            }
        except Exception as exc:
            logger.warning("MongoDB enrichment query failed: %s", exc)
            return results

        enriched_results = []
        for result in results:
            db_info = docs.get(result["image_id"])
            if db_info is None:
                enriched_results.append(result)
                continue

            enriched_results.append(
                {
                    "rank": result.get("rank", 0),
                    "image_id": result["image_id"],
                    "score": float(result.get("score", 0)),
                    "caption": db_info.get("caption", result.get("caption", "")),
                    "cui": db_info.get("cui", result.get("cui", "")),
                    "path": result.get("path", ""),
                }
            )

        return enriched_results
