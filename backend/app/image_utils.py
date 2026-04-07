"""Helpers for stable public image IDs and HuggingFace-backed image URLs."""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from backend.app.config import HF_BASE_URL


def sanitize_image_id(image_id: str) -> str:
    """Return a safe dataset image id or raise ``ValueError``."""
    safe_id = "".join(char for char in image_id if char.isalnum() or char in {"_", "-"})
    suffix = safe_id.rsplit("_", 1)[-1] if safe_id else ""

    if safe_id != image_id or not suffix.isdigit():
        raise ValueError("Invalid image ID")

    return safe_id


def image_folder_name(image_id: str) -> str:
    """Return the HuggingFace subfolder containing one ROCO image."""
    safe_id = sanitize_image_id(image_id)
    image_number = int(safe_id.rsplit("_", 1)[-1])
    folder_idx = (image_number - 1) // 1000 + 1
    return f"images_{folder_idx:02d}"


def hf_image_url(image_id: str) -> str:
    """Build the public HuggingFace URL for one project image id."""
    safe_id = sanitize_image_id(image_id)
    return f"{HF_BASE_URL}/{image_folder_name(safe_id)}/{safe_id}.png"


def with_public_result_paths(payload: Mapping[str, Any]) -> dict[str, Any]:
    """Copy one response payload and replace result paths with public image URLs."""
    public_payload = dict(payload)
    public_results: list[dict[str, Any]] = []

    for raw_result in payload.get("results", []):
        result = dict(raw_result)
        image_id = result.get("image_id")

        if isinstance(image_id, str):
            try:
                result["path"] = hf_image_url(image_id)
            except ValueError:
                pass

        public_results.append(result)

    public_payload["results"] = public_results
    return public_payload


__all__ = ["hf_image_url", "image_folder_name", "sanitize_image_id", "with_public_result_paths"]
