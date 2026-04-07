from groq import Groq
import os


def generate_clinical_conclusion(search_result: dict) -> str:
    results = search_result.get("results", [])
    print("PREMIER RÉSULTAT:", results[0] if results else "vide")
    scores = [r.get("score", 0) for r in results]
    confidence = round(sum(scores) / len(scores) * 100, 1) if scores else 0

    # Captions pondérées par score de similarité (rank 1 = poids maximal)
    weighted_captions = "\n".join([
        f"- [similarité {round(r.get('score', 0) * 100, 1)}%] {r.get('caption', '')}"
        for r in results if r.get('caption', '').strip()
    ])

    client = Groq(api_key=os.environ.get("GROQ_KEY_API"))

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": (
                    "Tu es un radiologue francophone expert. "
                    "On te donne des descriptions d'images médicales similaires, chacune accompagnée de son score de similarité. "
                    "Tu rédiges une synthèse médicale précise et structurée en français. "
                    "Les descriptions avec un score de similarité élevé doivent avoir plus de poids dans ton analyse. "
                    "Les descriptions avec un score faible sont des cas moins représentatifs et ne doivent pas dominer la synthèse. "
                    "Tu ne mentionnes jamais CBIR, FAISS ou tout système informatique. "
                    "Tu ne fais jamais de tableau. Tu ne copies jamais les descriptions mot pour mot."
                )
            },
            {
                "role": "user",
                "content": (
                    f"Images médicales similaires retrouvées (classées par score de similarité décroissant) :\n{weighted_captions}\n\n"
                    f"Niveau de confiance global : {confidence}%\n\n"
                    "Rédige une synthèse médicale complète en 3 paragraphes :\n"
                    "1. Pathologie dominante observée — base-toi principalement sur les résultats à score élevé (termes médicaux précis)\n"
                    "2. Recommandations (examens ou suivi à envisager)\n"
                    "3. Niveau de confiance et limites de l'analyse\n\n"
                    "Français médical uniquement. Pas de tableau. Réponse complète."
                )
            }
        ],
        temperature=0.3,
        max_tokens=1000,
    )

    return response.choices[0].message.content
