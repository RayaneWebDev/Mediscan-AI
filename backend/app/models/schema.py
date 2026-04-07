from typing import Union
from pydantic import BaseModel, field_validator


class SearchResult(BaseModel):
    rank: int
    image_id: str
    score: float
    path: str
    caption: str
    cui: Union[str, list]

    @field_validator("cui", mode="before")
    @classmethod
    def coerce_cui(cls, v):
        if isinstance(v, list):
            return v[0] if v else ""
        return v


class SearchResponseBase(BaseModel):
    mode: str
    embedder: str
    results: list[SearchResult]


class SearchResponse(SearchResponseBase):
    query_image: str


class TextSearchResponse(SearchResponseBase):
    query_text: str


class IdSearchResponse(SearchResponseBase):
    query_image_id: str


class IdsSearchResponse(SearchResponseBase):
    query_image_ids: list[str]
