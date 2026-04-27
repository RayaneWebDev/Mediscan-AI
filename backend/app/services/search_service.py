"""
CBIR search service for input validation and delegation to the MediScan pipeline.
"""

from __future__ import annotations

from pathlib import Path

from mediscan.process import configure_cpu_environment

configure_cpu_environment()

import faiss as faiss_lib

from backend.app.image_utils import sanitize_image_id
from backend.app.services.image_store import (
    build_centroid_embedding,
    downloaded_image,
    temporary_image_path,
    verify_image,
)
from backend.app.services.resource_registry import SearchResourceRegistry
from backend.app.services.result_enricher import MongoResultEnricher
from backend.app.services.validation import (
    normalize_mode,
    pick_image_suffix,
    validate_content_type,
    validate_image_bytes,
    validate_k,
    validate_selected_image_ids,
    validate_text_query,
)
from mediscan.search import SearchResources, collect_ranked_results, query, query_text


class SearchUnavailableError(RuntimeError):
    """Raised when a search mode is unavailable at runtime."""

class SearchService:
    """
    Application service that protects and orchestrates the search pipeline.

    Routes pass user-facing inputs here; the service validates them, manages
    temporary files/downloaded images, retrieves the right search resources, and
    enriches ranked results before the API response is built.
    """

    def __init__(self, resources: dict[str, SearchResources]) -> None:
        """Initialize the resource registry and result enricher."""
        self._resource_registry = SearchResourceRegistry(resources)
        self._result_enricher = MongoResultEnricher.from_environment()

    @staticmethod
    def _normalize_mode(mode: str) -> str:
        """Normalize and validate the requested search mode."""
        return normalize_mode(mode)

    @staticmethod
    def _validate_k(k: int) -> None:
        """Validate the requested top-k depth."""
        validate_k(k)

    @staticmethod
    def _validate_content_type(content_type: str | None) -> None:
        """Validate the uploaded image Content-Type."""
        validate_content_type(content_type)

    @staticmethod
    def _validate_image_bytes(image_bytes: bytes) -> None:
        """Validate image byte presence and size."""
        validate_image_bytes(image_bytes)

    @staticmethod
    def _validate_text_query(text: str) -> str:
        """Validate and normalize a text query."""
        return validate_text_query(text)

    @staticmethod
    def _validate_selected_image_ids(image_ids: list[str]) -> list[str]:
        """Validate a selection of image identifiers."""
        return validate_selected_image_ids(image_ids)

    @staticmethod
    def _pick_suffix(filename: str) -> str:
        """Infer a safe image file extension from the original name."""
        return pick_image_suffix(filename)

    @staticmethod
    def _verify_image(temp_path: Path) -> None:
        """Check that the temporary file is a decodable image."""
        verify_image(temp_path)

    @staticmethod
    def _temporary_image_path(*, suffix: str):
        """Create a scoped temporary path for storing an uploaded image."""
        return temporary_image_path(suffix=suffix)

    def _downloaded_image(self, image_id: str):
        """Download a result image for relaunch search and clean it up afterward."""
        return downloaded_image(image_id)

    def _get_resources(self, mode: str) -> SearchResources:
        """
        Get resources for the requested mode, loading them when necessary.

        Raises:
            SearchUnavailableError: If the mode is unavailable on this instance.
        """
        try:
            return self._resource_registry.get_or_load(mode)
        except (FileNotFoundError, RuntimeError) as exc:
            raise SearchUnavailableError(
                f"Search mode '{mode}' is unavailable on this instance. "
                "Install the required data/artifacts or rebuild the stable indexes."
            ) from exc

    def _enrich_with_mongo(self, results: list[dict]) -> list[dict]:
        """Attach optional MongoDB metadata while preserving the base search payload."""
        return self._result_enricher.enrich(results)

    def _query_image_path(
        self,
        *,
        image_path: Path,
        mode: str,
        k: int,
        exclude_self: bool = False,
    ) -> tuple[SearchResources, list[dict]]:
        """Run image search against one mode and return resources plus enriched results."""
        resources = self._get_resources(mode)
        results = query(resources=resources, image=image_path, k=k, exclude_self=exclude_self)
        return resources, self._enrich_with_mongo(results)

    @staticmethod
    def _build_payload(
        *,
        mode: str,
        resources: SearchResources,
        query_field: str,
        query_value: object,
        results: list[dict],
    ) -> dict:
        """Build the common API payload consumed by response models and the frontend."""
        return {
            "mode": mode,
            "embedder": resources.embedder.name,
            query_field: query_value,
            "results": results,
        }

    def search(
        self,
        *,
        image_bytes: bytes,
        filename: str,
        content_type: str | None,
        mode: str = "visual",
        k: int = 5,
    ) -> dict:
        """
        Run similarity search from uploaded image bytes.

        The upload is first written to a temporary file because PIL validation and
        the lower-level search pipeline both operate on paths.
        """
        normalized_mode = self._normalize_mode(mode)
        self._validate_k(k)
        self._validate_content_type(content_type)
        self._validate_image_bytes(image_bytes)

        with self._temporary_image_path(suffix=self._pick_suffix(filename)) as temp_path:
            temp_path.write_bytes(image_bytes)
            self._verify_image(temp_path)
            resources, results = self._query_image_path(
                image_path=temp_path,
                mode=normalized_mode,
                k=k,
            )

        return self._build_payload(
            mode=normalized_mode,
            resources=resources,
            query_field="query_image",
            query_value=filename,
            results=results,
        )

    def search_text(self, *, text: str, k: int) -> dict:
        """Run text-to-image retrieval against the semantic BioMedCLIP index."""
        normalized_text = self._validate_text_query(text)
        self._validate_k(k)

        resources = self._get_resources("semantic")
        results = self._enrich_with_mongo(query_text(resources=resources, text=normalized_text, k=k))

        return self._build_payload(
            mode="semantic",
            resources=resources,
            query_field="query_text",
            query_value=normalized_text,
            results=results,
        )

    def search_by_id(
        self,
        *,
        image_id: str,
        mode: str = "visual",
        k: int = 5,
    ) -> dict:
        """
        Relaunch a search from one existing image identifier.

        The image is downloaded from the public dataset URL, encoded with the
        selected mode, and excluded from the returned neighbors to avoid echoing
        the query as rank one.
        """
        safe_image_id = sanitize_image_id(image_id)
        normalized_mode = self._normalize_mode(mode)
        self._validate_k(k)

        with self._downloaded_image(safe_image_id) as temp_path:
            resources, results = self._query_image_path(
                image_path=temp_path,
                mode=normalized_mode,
                k=k,
                exclude_self=True,
            )

        return self._build_payload(
            mode=normalized_mode,
            resources=resources,
            query_field="query_image_id",
            query_value=safe_image_id,
            results=results,
        )

    def search_by_ids(
        self,
        *,
        image_ids: list[str],
        mode: str = "visual",
        k: int = 5,
    ) -> dict:
        """
        Run centroid search from a selected group of result images.

        Selected images are downloaded and encoded by the image-store helper,
        averaged into one normalized query vector, then excluded from the result
        list so the response focuses on new neighbors.
        """
        normalized_image_ids = self._validate_selected_image_ids(image_ids)
        normalized_mode = self._normalize_mode(mode)
        self._validate_k(k)

        resources = self._get_resources(normalized_mode)
        embedder = resources.embedder

        centroid = build_centroid_embedding(
            image_ids=normalized_image_ids,
            embedder=embedder,
        )
        faiss_lib.normalize_L2(centroid)

        search_k = min(k + len(normalized_image_ids), resources.index.ntotal)
        scores, indices = resources.index.search(centroid, search_k)

        results = self._enrich_with_mongo(
            collect_ranked_results(
                rows=resources.rows,
                scores=scores[0],
                indices=indices[0],
                k=k,
                excluded_image_ids=set(normalized_image_ids),
            )
        )

        return self._build_payload(
            mode=normalized_mode,
            resources=resources,
            query_field="query_image_ids",
            query_value=normalized_image_ids,
            results=results,
        )
