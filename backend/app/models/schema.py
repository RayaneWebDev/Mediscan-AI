"""Pydantic schemas for the MediScan API."""

from email.utils import parseaddr
from typing import Union

from pydantic import BaseModel, ConfigDict, Field, field_validator

from backend.app.config import ALLOWED_MODES, MAX_CONCLUSION_RESULTS
from backend.app.image_utils import sanitize_image_id

CONCLUSION_IMAGE_ID_MAX_LENGTH = 80
CONCLUSION_MODE_MAX_LENGTH = 24
CONCLUSION_EMBEDDER_MAX_LENGTH = 80
CONCLUSION_RESULTS_LIMIT = max(1, min(MAX_CONCLUSION_RESULTS, 20))


class SearchResult(BaseModel):
    """Full result returned by search endpoints."""

    rank: int
    image_id: str
    score: float
    path: str
    caption: str
    cui: Union[str, list]

    @field_validator("cui", mode="before")
    @classmethod
    def coerce_cui(cls, v):
        """Normalize the CUI field by extracting the first item when it is a list."""
        if isinstance(v, list):
            return v[0] if v else ""
        return v


class SearchResponseBase(BaseModel):
    """Common base for search responses."""
    mode: str
    embedder: str
    results: list[SearchResult]


class SearchResponse(SearchResponseBase):
    """Response for an uploaded-image search."""
    query_image: str


class TextSearchResponse(SearchResponseBase):
    """Response for a text search."""
    query_text: str


class IdSearchResponse(SearchResponseBase):
    """Response for a search from an existing image identifier."""
    query_image_id: str


class IdsSearchResponse(SearchResponseBase):
    """Response for a centroid search from multiple image identifiers."""
    query_image_ids: list[str]


class ConclusionSearchResult(BaseModel):
    """Compact result used as context for AI clinical conclusion generation."""

    model_config = ConfigDict(extra="forbid")

    rank: int = Field(ge=1, le=100)
    image_id: str = Field(min_length=1, max_length=CONCLUSION_IMAGE_ID_MAX_LENGTH)
    score: float = Field(ge=0, le=1)

    @field_validator("image_id")
    @classmethod
    def validate_image_id(cls, value: str) -> str:
        """Validate the identifier before any server-side resolution."""
        return sanitize_image_id(value.strip())


class ConclusionRequest(BaseModel):
    """Request for AI clinical conclusion generation."""

    model_config = ConfigDict(extra="forbid")

    mode: str | None = Field(default=None, max_length=CONCLUSION_MODE_MAX_LENGTH)
    embedder: str | None = Field(default=None, max_length=CONCLUSION_EMBEDDER_MAX_LENGTH)
    results: list[ConclusionSearchResult] = Field(
        min_length=1,
        max_length=CONCLUSION_RESULTS_LIMIT,
    )

    @field_validator("mode")
    @classmethod
    def validate_mode(cls, value: str | None) -> str | None:
        """Reject unknown modes to limit the context sent to the LLM."""
        if value is None:
            return None
        normalized = value.strip().lower()
        if normalized not in ALLOWED_MODES:
            raise ValueError(f"Unsupported mode: {value}")
        return normalized

    @field_validator("embedder")
    @classmethod
    def strip_optional_embedder(cls, value: str | None) -> str | None:
        """Normalize the optional embedder name without making it required."""
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None


class ConclusionResponse(BaseModel):
    """Response containing the generated clinical conclusion."""
    conclusion: str


class ContactRequest(BaseModel):
    """Request for sending a contact message."""
    name: str = Field(min_length=1, max_length=120)
    email: str = Field(min_length=3, max_length=320)
    subject: str = Field(min_length=1, max_length=160)
    message: str = Field(min_length=1, max_length=5000)
    website: str = Field(default="", max_length=200)

    @field_validator("name", "subject", "message")
    @classmethod
    def strip_required_text(cls, value: str) -> str:
        """Clean a required text field and reject empty values."""
        text = value.strip()
        if not text:
            raise ValueError("Field cannot be empty.")
        return text

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        """Validate and normalize a contact email address."""
        email = value.strip()
        parsed_name, parsed_email = parseaddr(email)
        if parsed_name or not parsed_email or "@" not in parsed_email:
            raise ValueError("Invalid email address.")
        local_part, _, domain = parsed_email.partition("@")
        if not local_part or "." not in domain:
            raise ValueError("Invalid email address.")
        return parsed_email


class ContactResponse(BaseModel):
    """Response for contact message delivery."""
    success: bool
    message: str
