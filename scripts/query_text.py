#!/usr/bin/env python3
"""
Script CLI pour la recherche texte-vers-image utilisant BioMedCLIP.

Usage :
    PYTHONPATH=src:. .venv311/bin/python scripts/query_text.py --query "chest X-ray pneumonia" --k 5

L'index FAISS sémantique (artifacts/index_semantic.faiss) doit exister.
Construisez-le d'abord avec :
    PYTHONPATH=src:. .venv311/bin/python scripts/build_index.py --mode semantic
"""

from __future__ import annotations

import argparse
import sys


def main() -> None:
    """
    Point d'entrée principal pour la recherche sémantique par texte.
    """
    parser = argparse.ArgumentParser(
        description="Recherche texte-vers-image via l'index sémantique BioMedCLIP"
    )
    # Définition des arguments de la ligne de commande
    parser.add_argument("--query", "-q", required=True, help="Requête texte médicale (en anglais)")
    parser.add_argument("--k", type=int, default=5, help="Nombre de résultats (défaut : 5, max : 50)")
    args = parser.parse_args()

    # Validation des entrées utilisateur
    if not args.query.strip():
        print("ERREUR : la requête est vide", file=sys.stderr)
        sys.exit(1)
    if not 1 <= args.k <= 50:
        print("ERREUR : k doit être compris entre 1 et 50", file=sys.stderr)
        sys.exit(1)

    # Imports différés pour accélérer l'affichage de l'aide CLI
    from mediscan.process import configure_cpu_environment
    from mediscan.search import load_resources, query_text

    configure_cpu_environment()

    print(f"Chargement de l'index sémantique (BioMedCLIP)...")
    try:
        # Chargement des ressources nécessaires (modèle et index)
        resources = load_resources(mode="semantic")
    except FileNotFoundError as exc:
        print(f"ERREUR : {exc}", file=sys.stderr)
        print(
            "Astuce : construisez l'index d'abord avec :\n"
            "  PYTHONPATH=src:. .venv311/bin/python scripts/build_index.py --mode semantic",
            file=sys.stderr,
        )
        sys.exit(1)

    # Affichage des informations de session
    print(f"Modèle d'encodage : {resources.embedder.name}  dim={resources.embedder.dim}")
    print(f"Index            : {resources.index.ntotal} vecteurs")
    print(f"Requête          : \"{args.query}\"")
    print(f"Top-k            : {args.k}")
    print("-" * 72)

    # Exécution de la recherche sémantique
    results = query_text(resources=resources, text=args.query, k=args.k)

    if not results:
        print("Aucun résultat retourné.")
        return

    # Affichage formaté des résultats
    for r in results:
        # Tronquer la légende pour l'affichage en console
        caption_short = r["caption"][:80] + ("…" if len(r["caption"]) > 80 else "")
        # Gérer l'affichage des CUI (concepts médicaux)
        cui = r["cui"] if r["cui"] and r["cui"] != "[]" else "-"
        
        print(
            f"#{r['rank']:2d}  score={r['score']:.4f}  id={r['image_id']:<12s}"
            f"  cui={cui:<20s}  caption={caption_short}"
        )


if __name__ == "__main__":
    main()