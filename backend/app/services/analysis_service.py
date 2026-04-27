"""AI clinical summary generation service using the Groq LLM."""

from __future__ import annotations

from functools import lru_cache
from typing import Any

from groq import Groq

from backend.app.config import GROQ_API_KEY, GROQ_MODEL, MAX_CONCLUSION_RESULTS
from backend.app.image_utils import sanitize_image_id
from mediscan.runtime import STABLE_MODE_CONFIGS, load_indexed_rows


class ClinicalConclusionError(RuntimeError):
    """Raised when the optional AI summary service cannot be used."""


SERVER_CAPTION_MAX_LENGTH = 600


def _normalize_caption(caption: object) -> str:
    """Clean and bound a caption loaded from server artifacts."""
    text = " ".join(str(caption or "").split())
    if len(text) <= SERVER_CAPTION_MAX_LENGTH:
        return text
    return f"{text[:SERVER_CAPTION_MAX_LENGTH].rstrip()}..."


@lru_cache(maxsize=4)
def _caption_lookup_for_mode(mode: str) -> dict[str, str]:
    """Load server-side captions for a stable mode and cache them."""
    config = STABLE_MODE_CONFIGS[mode]
    rows = load_indexed_rows(config.ids_path)
    return {
        str(row.get("image_id", "")): _normalize_caption(row.get("caption", ""))
        for row in rows
        if row.get("image_id")
    }


def _candidate_modes(mode: str | None) -> tuple[str, ...]:
    """Prioritize the requested mode, then stable fallback modes."""
    normalized_mode = str(mode or "").strip().lower()
    modes = list(STABLE_MODE_CONFIGS)
    if normalized_mode in STABLE_MODE_CONFIGS:
        return (normalized_mode, *[candidate for candidate in modes if candidate != normalized_mode])
    return tuple(modes)


def _server_caption_for_image_id(image_id: str, mode: str | None) -> str:
    """Fetch a caption from server artifacts, never from the client."""
    safe_image_id = sanitize_image_id(image_id)
    for candidate_mode in _candidate_modes(mode):
        caption = _caption_lookup_for_mode(candidate_mode).get(safe_image_id, "")
        if caption:
            return caption
    return ""


def build_server_owned_conclusion_context(search_result: dict[str, Any]) -> dict[str, Any]:
    """Rebuild the LLM context using server-owned captions."""
    mode = str(search_result.get("mode") or "").strip().lower() or None
    trusted_results: list[dict[str, Any]] = []

    for raw_result in search_result.get("results", [])[:MAX_CONCLUSION_RESULTS]:
        image_id = str(raw_result.get("image_id", "")).strip()
        caption = _server_caption_for_image_id(image_id, mode)
        if not caption:
            continue

        trusted_results.append(
            {
                "rank": int(raw_result.get("rank", len(trusted_results) + 1)),
                "image_id": sanitize_image_id(image_id),
                "score": float(raw_result.get("score", 0)),
                "caption": caption,
            }
        )

    return {
        "mode": mode or "inconnu",
        "embedder": search_result.get("embedder"),
        "results": trusted_results,
    }


def _prepare_ranked_captions(search_result: dict) -> tuple[str, int]:
    """Extract and format search result descriptions for the LLM prompt."""
    results = search_result.get("results", [])
    ranked_captions: list[str] = []

    for result in results[:MAX_CONCLUSION_RESULTS]:
        caption = str(result.get("caption", "")).strip()
        if not caption:
            continue

        similarity_pct = round(float(result.get("score", 0)) * 100, 1)
        ranked_captions.append(f"- Similarity {similarity_pct}%: {caption}")

    if not ranked_captions:
        raise ValueError("Impossible de generer une synthese sans descriptions exploitables.")

    return "\n".join(ranked_captions), len(ranked_captions)


def _build_messages(search_result: dict) -> list[dict[str, str]]:
    """Build the message list (system + user) for the Groq LLM call."""
    ranked_captions, caption_count = _prepare_ranked_captions(search_result)
    mode = str(search_result.get("mode", "inconnu")).strip() or "inconnu"

    return [
        {
            "role": "system",
            "content": (
                "You support a non-clinical university prototype for medical image retrieval. "
                "Write the summary in English. Use a careful, clinically oriented style based only on "
                "the provided descriptions of similar images. Do not make a diagnosis, do not recommend "
                "treatment, and do not imply certainty beyond the retrieved evidence. "
                "Do not mention CBIR, FAISS, embeddings, vector indexes, or technical infrastructure. "
                "No tables, no HTML, and no long bullet lists."
            ),
        },
        {
            "role": "user",
            "content": (
                f"Search mode: {mode}\n"
                f"Number of retained descriptions: {caption_count}\n\n"
                "Descriptions of similar images, sorted by decreasing similarity:\n"
                f"{ranked_captions}\n\n"
                "Write a structured summary in English with 3 paragraphs:\n"
                "1. A longer clinical interpretation paragraph: describe the recurring imaging findings, "
                "shared anatomical or modality patterns, and medically relevant similarities visible in the descriptions. "
                "Stay factual and use cautious language such as 'may suggest', 'is consistent with', or 'appears related to'.\n"
                "2. A shorter limitations paragraph: mention uncertainty, missing clinical context, and possible variability "
                "between retrieved images.\n"
                "3. A very short disclaimer in one sentence: state that this is exploratory and not a diagnosis.\n"
                "Keep the first paragraph noticeably longer than the limitations and disclaimer paragraphs."
            ),
        },
    ]


def generate_clinical_conclusion(search_result: dict) -> str:
    """Generate a cautious clinical summary from search results."""
    if not GROQ_API_KEY:
        raise ClinicalConclusionError(
            "La fonctionnalite d'analyse IA n'est pas configuree sur cette instance."
        )

    try:
        trusted_context = build_server_owned_conclusion_context(search_result)
        client = Groq(api_key=GROQ_API_KEY)
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=_build_messages(trusted_context),
            temperature=0.2,
            max_tokens=500,
        )
    except ValueError:
        raise
    except Exception as exc:
        raise ClinicalConclusionError(
            "Le service d'analyse IA est temporairement indisponible."
        ) from exc

    conclusion = (response.choices[0].message.content or "").strip()
    if not conclusion:
        raise ClinicalConclusionError("Le service d'analyse IA a retourne une reponse vide.")

    return conclusion
