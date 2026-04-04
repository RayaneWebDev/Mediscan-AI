"""
Définition des modèles de données pour l'API Mediscan.

Ces classes assurent la validation des données envoyées au client 
et la cohérence entre MongoDB et les réponses de l'API.
"""

from typing import Union, Optional
from pydantic import BaseModel, field_validator


class SearchResult(BaseModel):
    """
    - Représente un résultat de recherche individuel.
    - Contient les scores de Faiss et les métadonnées de MongoDB.
    """
    rank: int
    image_id: str
    score: float
    path: str
    caption: str
    cui: Union[str, list]
    modalite: Optional[str] = None
    organe: Optional[str] = None
    mo: Optional[str] = None

    @field_validator("cui", mode="before")
    @classmethod
    def coerce_cui(cls, v):
        """
        - Nettoie le champ CUI (Concept Unique Identifier).
        - Si MongoDB renvoie une liste de CUI, on ne garde que le premier 
          pour simplifier l'affichage côté interface.
        """
        if isinstance(v, list):
            return v[0] if v else ""
        return v


class SearchResponse(BaseModel):
    """ 
    - Modèle de réponse pour une recherche par image. 
    """
    mode: str
    embedder: str
    query_image: str
    results: list[SearchResult]


class TextSearchResponse(BaseModel):
    """ 
    - Modèle de réponse pour une recherche par texte. 
    """
    mode: str
    embedder: str
    query_text: str
    results: list[SearchResult]


class IdSearchResponse(BaseModel):
    """ 
    - Modèle de réponse pour une recherche basée sur un ID unique. 
    """
    mode: str
    embedder: str
    query_image_id: str
    results: list[SearchResult]


class IdsSearchResponse(BaseModel):
    """ 
    - Modèle de réponse pour une recherche basée sur plusieurs IDs (centroïde). 
    """
    mode: str
    embedder: str
    query_image_ids: list[str]
    results: list[SearchResult]