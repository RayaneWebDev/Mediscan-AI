"""Tests for public image URL utilities."""

from __future__ import annotations

import pytest

from backend.app.image_utils import hf_image_url, image_folder_name, sanitize_image_id, with_public_result_paths


def test_sanitize_image_id_accepts_project_format() -> None:
    """Valid ROCOv2 identifiers are returned unchanged."""
    image_id = "ROCOv2_2023_train_000123"
    assert sanitize_image_id(image_id) == image_id


@pytest.mark.parametrize(
    "image_id",
    [
        "ROCOv2_2023_train_000123.png",
        "../ROCOv2_2023_train_000123",
        "ROCOv2_2023_train_final",
        "",
    ],
)
def test_sanitize_image_id_rejects_invalid_ids(image_id: str) -> None:
    """Unsafe identifiers and identifiers without numeric suffixes are rejected."""
    with pytest.raises(ValueError, match="Invalid image ID"):
        sanitize_image_id(image_id)


def test_image_folder_name_groups_images_by_thousands() -> None:
    """ROCOv2 images are grouped into thousand-sized HuggingFace folders."""
    assert image_folder_name("ROCOv2_2023_train_000001") == "images_01"
    assert image_folder_name("ROCOv2_2023_train_001000") == "images_01"
    assert image_folder_name("ROCOv2_2023_train_001001") == "images_02"


def test_hf_image_url_builds_public_url() -> None:
    """Public image URLs include the derived folder and PNG filename."""
    image_id = "ROCOv2_2023_train_000001"
    assert hf_image_url(image_id).endswith("/images_01/ROCOv2_2023_train_000001.png")


def test_with_public_result_paths_rewrites_valid_paths_without_mutating_input() -> None:
    """Result paths are copied to public HuggingFace URLs."""
    payload = {
        "mode": "visual",
        "results": [
            {
                "rank": 1,
                "image_id": "ROCOv2_2023_train_000001",
                "score": 0.99,
                "path": "local/path.png",
                "caption": "caption",
                "cui": "[]",
            },
            {"rank": 2, "image_id": "invalid.png", "path": "kept.png"},
        ],
    }

    public_payload = with_public_result_paths(payload)

    assert public_payload["results"][0]["path"] == hf_image_url("ROCOv2_2023_train_000001")
    assert public_payload["results"][1]["path"] == "kept.png"
    assert payload["results"][0]["path"] == "local/path.png"
