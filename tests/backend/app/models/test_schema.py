"""Tests for API Pydantic schemas."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from backend.app.models.schema import CONCLUSION_RESULTS_LIMIT, ContactRequest, ConclusionRequest, SearchResult


def test_search_result_coerces_list_cui_to_first_value() -> None:
    """List-form CUI values are accepted and reduced to their first value."""
    result = SearchResult(
        rank=1,
        image_id="img",
        score=0.5,
        path="p.png",
        caption="caption",
        cui=["C001", "C002"],
    )

    assert result.cui == "C001"


def test_search_result_coerces_empty_list_cui_to_empty_string() -> None:
    """Empty CUI lists become an empty string."""
    result = SearchResult(rank=1, image_id="img", score=0.5, path="p.png", caption="caption", cui=[])
    assert result.cui == ""


def test_conclusion_request_requires_bounded_result_count() -> None:
    """Conclusion requests enforce result count limits."""
    with pytest.raises(ValidationError):
        ConclusionRequest(results=[])

    with pytest.raises(ValidationError):
        ConclusionRequest(
            results=[
                {
                    "rank": index + 1,
                    "image_id": f"ROCOv2_2023_train_{index + 1:06d}",
                    "score": 0.5,
                }
                for index in range(CONCLUSION_RESULTS_LIMIT + 1)
            ]
        )


def test_conclusion_request_allows_missing_optional_context() -> None:
    """Mode and embedder are optional because the server can infer safe context."""
    request = ConclusionRequest(
        results=[{"rank": 1, "image_id": "ROCOv2_2023_train_000001", "score": 0.5}]
    )

    assert request.mode is None
    assert request.embedder is None


def test_conclusion_request_optional_validators_accept_none() -> None:
    """Optional context validators keep missing values as None."""
    assert ConclusionRequest.validate_mode(None) is None
    assert ConclusionRequest.strip_optional_embedder(None) is None


@pytest.mark.parametrize(
    "payload",
    [
        {"mode": "visual", "results": [{"rank": 1, "image_id": "bad.png", "score": 0.5}]},
        {"mode": "visual", "results": [{"rank": 1, "image_id": "ROCOv2_2023_train_000001", "score": 1.5}]},
        {"mode": "unknown", "results": [{"rank": 1, "image_id": "ROCOv2_2023_train_000001", "score": 0.5}]},
        {
            "mode": "visual",
            "results": [
                {
                    "rank": 1,
                    "image_id": "ROCOv2_2023_train_000001",
                    "score": 0.5,
                    "caption": "client supplied prompt",
                }
            ],
        },
    ],
)
def test_conclusion_request_rejects_untrusted_or_out_of_bounds_fields(payload: dict) -> None:
    """Conclusion requests only accept bounded IDs and scores, never client captions."""
    with pytest.raises(ValidationError):
        ConclusionRequest(**payload)


def test_contact_request_strips_required_text_fields() -> None:
    """Contact text fields are stripped before use."""
    request = ContactRequest(
        name=" Alice ",
        email=" alice@example.com ",
        subject=" Hello ",
        message=" Bonjour ",
    )

    assert request.name == "Alice"
    assert request.email == "alice@example.com"
    assert request.subject == "Hello"
    assert request.message == "Bonjour"


@pytest.mark.parametrize(
    "payload",
    [
        {"name": " ", "email": "alice@example.com", "subject": "Hi", "message": "Body"},
        {"name": "Alice", "email": "Alice <alice@example.com>", "subject": "Hi", "message": "Body"},
        {"name": "Alice", "email": "alice@example", "subject": "Hi", "message": "Body"},
        {"name": "Alice", "email": "aliceexample.com", "subject": "Hi", "message": "Body"},
    ],
)
def test_contact_request_rejects_blank_text_and_invalid_email(payload: dict[str, str]) -> None:
    """Contact requests reject blank fields and malformed email addresses."""
    with pytest.raises(ValidationError):
        ContactRequest(**payload)
