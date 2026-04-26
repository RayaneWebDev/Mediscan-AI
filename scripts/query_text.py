#!/usr/bin/env python3
"""
Exécute une recherche text-to-image dans la base MediScan AI via BioMedCLIP.

Ce script permet de rechercher des images médicales à partir d'une description
textuelle en anglais. Il utilise l'index sémantique FAISS construit avec
BioMedCLIP et affiche les k résultats les plus proches sémantiquement.

Prérequis :
    L'index sémantique doit exister dans artifacts/index_semantic.faiss.
    Si ce n'est pas le cas, le construire avec :
        python scripts/rebuild_stable_indexes.py

Usage :
    python scripts/query_text.py --query "chest X-ray pneumonia" --k 5
    python scripts/query_text.py --query "brain MRI tumor" --k 10
"""

from __future__ import annotations

import argparse
import sys


def parse_args() -> argparse.Namespace:
    """
    Analyse et retourne les arguments de la ligne de commande.

    Returns:
        argparse.Namespace: Objet contenant tous les arguments parsés :
            - query (str) : Requête textuelle médicale en anglais.
            - k (int) : Nombre de résultats souhaités (entre 1 et 50).
            - embedder (str | None) : Surcharge optionnelle de l'embedder.
            - model_name (str | None) : Surcharge optionnelle du modèle.
            - index_path (str | None) : Surcharge du chemin de l'index FAISS.
            - ids_path (str | None) : Surcharge du chemin du fichier IDs JSON.
    """
    parser = argparse.ArgumentParser(
        description="Recherche text-to-image via l'index sémantique BioMedCLIP"
    )
    parser.add_argument("--query", "-q", required=True, help="Requête textuelle médicale (en anglais)")
    parser.add_argument("--k", type=int, default=5, help="Nombre de résultats (défaut: 5, max: 50)")
    parser.add_argument("--embedder", default=None, help="Surcharge optionnelle de l'embedder")
    parser.add_argument("--model-name", default=None, help="Surcharge optionnelle du modèle pré-entraîné")
    parser.add_argument("--index-path", default=None, help="Surcharge du chemin de l'index FAISS")
    parser.add_argument("--ids-path", default=None, help="Surcharge du chemin du fichier IDs JSON")
    return parser.parse_args()


def load_resources(args: argparse.Namespace):
    """
    Charge l'index sémantique FAISS et l'embedder BioMedCLIP.

    Args:
        args (argparse.Namespace): Arguments parsés contenant les éventuelles
            surcharges d'embedder, de modèle et de chemins d'index.

    Returns:
        SearchResources: Ressources de recherche contenant l'embedder,
            l'index FAISS et les métadonnées des images.

    Raises:
        FileNotFoundError: Si l'index sémantique est introuvable.
            Affiche un conseil pour le construire avant de quitter.
        SystemExit: Si l'index est introuvable (code 1).
    """
    from mediscan.process import configure_cpu_environment
    from mediscan.search import load_resources as _load_resources

    configure_cpu_environment()

    print("Chargement de l'index sémantique (BioMedCLIP)...")
    try:
        return _load_resources(
            mode="semantic",
            embedder=args.embedder,
            model_name=args.model_name,
            index_path=args.index_path,
            ids_path=args.ids_path,
        )
    except FileNotFoundError as exc:
        print(f"ERREUR: {exc}", file=sys.stderr)
        print(
            "Conseil : construire l'index avec :\n"
            "  python scripts/rebuild_stable_indexes.py",
            file=sys.stderr,
        )
        sys.exit(1)


def print_results(results: list[dict], query: str, k: int, resources) -> None:
    """
    Affiche les résultats de la recherche textuelle dans la console.

    Args:
        results (list[dict]): Liste des résultats retournés par le pipeline,
            chaque élément contenant rank, image_id, score, caption, cui.
        query (str): La requête textuelle utilisée.
        k (int): Nombre de résultats demandés.
        resources (SearchResources): Ressources contenant les infos de l'embedder
            et de l'index FAISS.

    Returns:
        None
    """
    print(f"Embedder : {resources.embedder.name}  dim={resources.embedder.dim}")
    print(f"Index    : {resources.index.ntotal} vecteurs")
    print(f"Requête  : \"{query}\"")
    print(f"Top-k    : {k}")
    print("-" * 72)

    if not results:
        print("Aucun résultat retourné.")
        return

    for r in results:
        caption_short = r["caption"][:80] + ("…" if len(r["caption"]) > 80 else "")
        cui = r["cui"] if r["cui"] and r["cui"] != "[]" else "-"
        print(
            f"#{r['rank']:2d}  score={r['score']:.4f}  id={r['image_id']:<12s}"
            f"  cui={cui:<20s}  caption={caption_short}"
        )


def main() -> None:
    """
    Point d'entrée principal du script de recherche textuelle.

    Orchestre la validation des arguments, le chargement des ressources,
    l'exécution de la recherche text-to-image et l'affichage des résultats.

    Returns:
        None

    Raises:
        SystemExit: Si la requête est vide, si k est hors bornes,
            ou si l'index sémantique est introuvable.
    """
    args = parse_args()

    if not args.query.strip():
        print("ERREUR: la requête est vide.", file=sys.stderr)
        sys.exit(1)
    if not 1 <= args.k <= 50:
        print("ERREUR: k doit être compris entre 1 et 50.", file=sys.stderr)
        sys.exit(1)

    from mediscan.search import query_text

    resources = load_resources(args)
    results = query_text(resources=resources, text=args.query, k=args.k)
    print_results(results, args.query, args.k, resources)


if __name__ == "__main__":
    main()