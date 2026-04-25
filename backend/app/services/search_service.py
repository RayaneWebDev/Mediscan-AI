"""
Service de recherche CBIR — validation des entrées et délégation au pipeline mediscan.
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
    """Lancé quand un mode de recherche n'est pas disponible au runtime."""

class SearchService:
    """
    Valide les entrées utilisateur et délègue au pipeline de recherche mediscan.
    Les ressources FAISS sont chargées à la demande via SearchResourceRegistry.
    """

    def __init__(self, resources: dict[str, SearchResources]) -> None:
        self._resource_registry = SearchResourceRegistry(resources)
        self._result_enricher = MongoResultEnricher.from_environment()

    @staticmethod
    def _normalize_mode(mode: str) -> str:
        return normalize_mode(mode)

    @staticmethod
    def _validate_k(k: int) -> None:
        validate_k(k)

    @staticmethod
    def _validate_content_type(content_type: str | None) -> None:
        validate_content_type(content_type)

    @staticmethod
    def _validate_image_bytes(image_bytes: bytes) -> None:
        validate_image_bytes(image_bytes)

    @staticmethod
    def _validate_text_query(text: str) -> str:
        return validate_text_query(text)

    @staticmethod
    def _validate_selected_image_ids(image_ids: list[str]) -> list[str]:
        return validate_selected_image_ids(image_ids)

    @staticmethod
    def _pick_suffix(filename: str) -> str:
        return pick_image_suffix(filename)

    @staticmethod
    def _verify_image(temp_path: Path) -> None:
        verify_image(temp_path)

    @staticmethod
    def _temporary_image_path(*, suffix: str):
        return temporary_image_path(suffix=suffix)

    def _downloaded_image(self, image_id: str):
        return downloaded_image(image_id)

    def _get_resources(self, mode: str) -> SearchResources:
        """
        Récupère les ressources du mode demandé, les charge si nécessaire.

        Raises:
            SearchUnavailableError: Si le mode est indisponible sur cette instance.
        """
        try:
            return self._resource_registry.get_or_load(mode)
        except (FileNotFoundError, RuntimeError) as exc:
            raise SearchUnavailableError(
                f"Search mode '{mode}' is unavailable on this instance. "
                "Install the required data/artifacts or rebuild the stable indexes."
            ) from exc

    def _enrich_with_mongo(self, results: list[dict]) -> list[dict]:
        return self._result_enricher.enrich(results)

    def _query_image_path(
        self,
        *,
        image_path: Path,
        mode: str,
        k: int,
        exclude_self: bool = False,
    ) -> tuple[SearchResources, list[dict]]:
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
        Recherche par similarité à partir d'octets image.
        Écrit l'image dans un fichier temporaire, la vérifie puis interroge l'index.
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
        """Text-to-image search using BioMedCLIP semantic index."""
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
        """Relance une recherche depuis un image_id existant."""
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
        """Recherche par centroide — moyenne des embeddings de plusieurs images.
        Les images sont telechargees et encodees en parallele pour de meilleures performances.
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
