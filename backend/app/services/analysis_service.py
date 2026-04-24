"""
Service de génération de synthèse clinique IA via le LLM Groq.

Ce module fournit une analyse prudente et non diagnostique des résultats
de recherche d'images médicales. Il utilise le modèle Groq (Llama) pour
produire un résumé en anglais à partir des descriptions textuelles des
images les plus similaires trouvées par le pipeline CBIR.

Important : cette synthèse est un outil exploratoire non clinique et
ne remplace en aucun cas l'avis d'un professionnel de santé.
"""

from __future__ import annotations

from groq import Groq

from backend.app.config import GROQ_API_KEY, GROQ_MODEL, MAX_CONCLUSION_RESULTS


class ClinicalConclusionError(RuntimeError):
    """
    Lancé lorsque le service de synthèse IA optionnel ne peut pas être utilisé.
    Causes possibles : clé API absente, service indisponible, réponse vide.
    """


def _prepare_ranked_captions(search_result: dict) -> tuple[str, int]:
    """
    Extrait et formate les descriptions des résultats de recherche pour le prompt LLM.

    Sélectionne les MAX_CONCLUSION_RESULTS premiers résultats disposant d'une
    description (caption), les formate avec leur score de similarité, et les
    concatène en une chaîne prête à l'envoi au modèle.

    Args:
        search_result: Le dictionnaire de résultats bruts du pipeline de recherche.

    Returns:
        Un tuple (texte_formaté, nombre_de_descriptions) prêt pour le prompt.

    Raises:
        ValueError: Si aucun résultat ne possède de description exploitable.
    """
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
    """
    Construit la liste de messages (system + user) pour l'appel au LLM Groq.

    Le prompt system instruit le modèle à rester prudent, non diagnostique
    et à ne pas mentionner l'infrastructure technique (FAISS, embeddings, etc.).
    Le prompt user fournit les descriptions triées par similarité décroissante.

    Args:
        search_result: Le dictionnaire de résultats bruts du pipeline de recherche.

    Returns:
        La liste de messages au format attendu par l'API Groq.
    """
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
    """
    Génère une synthèse clinique prudente à partir des résultats de recherche.

    Appelle l'API Groq avec un prompt non diagnostique construit à partir des
    descriptions des images similaires trouvées. Retourne un texte en anglais
    structuré en 3 paragraphes (interprétation clinique, limites, rappel non clinique).

    Args:
        search_result: Le dictionnaire de résultats bruts du pipeline de recherche,
                       incluant les champs 'results', 'mode', et les métadonnées
                       associées (caption, score, etc.).

    Returns:
        La synthèse textuelle générée par le LLM, en anglais.

    Raises:
        ClinicalConclusionError: Si GROQ_API_KEY n'est pas configuré,
                                  si le service est indisponible,
                                  ou si la réponse est vide.
        ValueError: Si aucun résultat ne possède de description exploitable.
    """
    if not GROQ_API_KEY:
        raise ClinicalConclusionError(
            "La fonctionnalite d'analyse IA n'est pas configuree sur cette instance."
        )

    try:
        client = Groq(api_key=GROQ_API_KEY)
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=_build_messages(search_result),
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
