"""Tests for backend user-input validation helpers."""

from __future__ import annotations

import pytest

from backend.app.config import MAX_K, MAX_UPLOAD_BYTES
from backend.app.services.validation import (
    MAX_SELECTION_SIZE,
    MAX_TEXT_QUERY_LENGTH,
    normalize_mode,
    pick_image_suffix,
    validate_content_type,
    validate_image_bytes,
    validate_k,
    validate_selected_image_ids,
    validate_text_query,
)


def test_normalize_mode_accepts_supported_modes() -> None:
    """Supported modes are stripped and lowercased."""
    assert normalize_mode(" VISUAL ") == "visual"
    assert normalize_mode("semantic") == "semantic"


def test_normalize_mode_rejects_unknown_mode() -> None:
    """Unsupported modes raise a clear validation error."""
    with pytest.raises(ValueError, match="Unsupported mode"):
        normalize_mode("hybrid")


def test_validate_k_accepts_bounds_and_rejects_out_of_range() -> None:
    """k is constrained to the public search range."""
    validate_k(1)
    validate_k(MAX_K)

    with pytest.raises(ValueError, match="k must be"):
        validate_k(0)
    with pytest.raises(ValueError, match="k must be"):
        validate_k(MAX_K + 1)


def test_validate_content_type_accepts_empty_png_and_jpeg() -> None:
    """Supported upload content types pass validation."""
    validate_content_type(None)
    validate_content_type("image/png")
    validate_content_type("image/jpeg")


def test_validate_content_type_rejects_unsupported_types() -> None:
    """Unsupported MIME types are rejected."""
    with pytest.raises(ValueError, match="JPEG and PNG"):
        validate_content_type("text/plain")


def test_validate_image_bytes_requires_non_empty_under_limit() -> None:
    """Image bytes must be present and not oversized."""
    validate_image_bytes(b"x")

    with pytest.raises(ValueError, match="empty"):
        validate_image_bytes(b"")
    with pytest.raises(ValueError, match="limit"):
        validate_image_bytes(b"x" * (MAX_UPLOAD_BYTES + 1))


def test_validate_text_query_strips_and_limits_text() -> None:
    """Text queries are stripped and length-limited."""
    assert validate_text_query(" lung opacity ") == "lung opacity"

    with pytest.raises(ValueError, match="empty"):
        validate_text_query(" ")
    with pytest.raises(ValueError, match="too long"):
        validate_text_query("x" * (MAX_TEXT_QUERY_LENGTH + 1))


def test_validate_selected_image_ids_requires_bounded_non_empty_selection() -> None:
    """Selected image IDs are bounded and sanitized."""
    assert validate_selected_image_ids(["ROCOv2_2023_train_000001"]) == ["ROCOv2_2023_train_000001"]

    with pytest.raises(ValueError, match="vide"):
        validate_selected_image_ids([])
    with pytest.raises(ValueError, match=f"Maximum {MAX_SELECTION_SIZE}"):
        validate_selected_image_ids([f"ROCOv2_2023_train_{index:06d}" for index in range(MAX_SELECTION_SIZE + 1)])
    with pytest.raises(ValueError, match="Invalid image ID"):
        validate_selected_image_ids(["bad.png"])


@pytest.mark.parametrize(
    ("filename", "expected"),
    [
        ("scan.JPG", ".jpg"),
        ("scan.jpeg", ".jpeg"),
        ("scan.png", ".png"),
        ("scan.gif", ".png"),
        ("", ".png"),
    ],
)
def test_pick_image_suffix_uses_safe_extensions(filename: str, expected: str) -> None:
    """Only supported image suffixes are preserved."""
    assert pick_image_suffix(filename) == expected
