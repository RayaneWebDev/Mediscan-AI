#!/usr/bin/env python3
"""
Exécute une recherche d'images similaires dans la base MediScan AI.

Ce script permet de lancer une recherche top-k en mode visuel (DINOv2)
ou sémantique (BioMedCLIP) à partir d'une image requête locale.
Les résultats sont affichés dans la console et exportés en CSV.

Usage :
    python scripts/query.py --mode visual --image path/to/image.jpg --k 5
    python scripts/query.py --mode semantic --image path/to/image.png --k 10 --exclude-self
"""

from __future__ import annotations

import argparse
import csv
from datetime import datetime
from pathlib import Path
from typing import Any

from mediscan.process import configure_cpu_environment
from mediscan.search import MAX_K, search_image

configure_cpu_environment()

PROJECT_ROOT = Path(__file__).resolve().parents[1]
EXPORT_DIR = PROJECT_ROOT / "proofs" / "exports"


def parse_args() -> argparse.Namespace:
    """
    Analyse et retourne les arguments de la ligne de commande.

    Returns:
        argparse.Namespace: Objet contenant tous les arguments parsés :
            - mode (str) : Mode de recherche ('visual' ou 'semantic').
            - image (str) : Chemin vers l'image requête.
            - k (int) : Nombre de résultats souhaités.
            - embedder (str | None) : Surcharge optionnelle de l'embedder.
            - model_name (str | None) : Surcharge optionnelle du modèle.
            - index_path (str | None) : Surcharge du chemin de l'index FAISS.
            - ids_path (str | None) : Surcharge du chemin du fichier IDs JSON.
            - exclude_self (bool) : Exclure l'image requête des résultats.
    """
    parser = argparse.ArgumentParser(description="Recherche top-k d'images similaires")
    parser.add_argument("--mode", default="visual", choices=("visual", "semantic"),
                        help="Mode de recherche : visuel (DINOv2) ou sémantique (BioMedCLIP)")
    parser.add_argument("--image", required=True, help="Chemin de l'image de requête")
    parser.add_argument("--k", type=int, default=5, help=f"Nombre de résultats (max {MAX_K})")
    parser.add_argument("--embedder", default=None, help="Surcharge optionnelle de l'embedder")
    parser.add_argument("--model-name", default=None, help="Surcharge optionnelle du modèle pré-entraîné")
    parser.add_argument("--index-path", default=None, help="Surcharge du chemin de l'index FAISS")
    parser.add_argument("--ids-path", default=None, help="Surcharge du chemin du fichier IDs JSON")
    parser.add_argument(
        "--exclude-self",
        action="store_true",
        help="Exclure l'image requête si elle existe déjà dans l'index",
    )
    return parser.parse_args()


def run_query(args: argparse.Namespace) -> tuple[str, str, list[dict[str, Any]]]:
    """
    Exécute la recherche d'images similaires via le pipeline MediScan.

    Args:
        args (argparse.Namespace): Arguments parsés contenant le mode, l'image,
            k, et les éventuelles surcharges d'embedder et de chemins.

    Returns:
        tuple[str, str, list[dict]]: Un triplet contenant :
            - Le nom de l'embedder utilisé.
            - Le chemin absolu de l'image requête.
            - La liste des k résultats, chacun étant un dict avec les clés
              rank, image_id, score, path, caption, cui.

    Raises:
        FileNotFoundError: Si l'image requête ou l'index FAISS est introuvable.
        ValueError: Si k est hors des bornes autorisées.
    """
    return search_image(
        mode=args.mode,
        image=args.image,
        k=args.k,
        embedder=args.embedder,
        model_name=args.model_name,
        index_path=args.index_path,
        ids_path=args.ids_path,
        exclude_self=args.exclude_self,
    )


def print_results(
    mode: str,
    embedder_name: str,
    query_image: str,
    results: list[dict[str, Any]],
) -> None:
    """
    Affiche les résultats de la recherche dans la console.

    Args:
        mode (str): Mode de recherche utilisé ('visual' ou 'semantic').
        embedder_name (str): Nom de l'embedder ayant produit les vecteurs.
        query_image (str): Chemin de l'image requête.
        results (list[dict]): Liste des résultats retournés par le pipeline,
            chaque élément contenant rank, image_id, score, path, caption, cui.

    Returns:
        None
    """
    print(f"mode={mode}")
    print(f"embedder={embedder_name}")
    print(f"image_requete={query_image}")
    print(f"resultats_trouves={len(results)}")
    for item in results:
        print(
            f"{item['rank']}. image_id={item['image_id']} "
            f"score={item['score']:.6f} chemin={item['path']}"
        )
        print(f"   legende={item['caption']}")
        print(f"   cui={item['cui']}")


def export_results_to_csv(results: list[dict[str, Any]], args: argparse.Namespace) -> None:
    """
    Exporte les résultats de la recherche dans un fichier CSV horodaté.

    Le fichier est nommé automatiquement avec un identifiant incrémental (EXP01, EXP02...),
    un horodatage, et un statut OK/KO selon que le nombre de résultats correspond à k.

    Args:
        results (list[dict]): Liste des résultats à exporter, chaque élément
            contenant rank, image_id, score, caption, cui.
        args (argparse.Namespace): Arguments parsés contenant le mode et k,
            utilisés pour nommer le fichier d'export.

    Returns:
        None

    Raises:
        OSError: Si le répertoire d'export ne peut pas être créé ou si
            l'écriture du fichier CSV échoue.
    """
    EXPORT_DIR.mkdir(parents=True, exist_ok=True)

    status = "OK" if len(results) == args.k else "KO"
    comment = f"mode={args.mode}_k={args.k}" if status == "OK" else f"partiel_{len(results)}_vs_{args.k}"

    export_id = 1
    while list(EXPORT_DIR.glob(f"EXP{export_id:02d}_*")):
        export_id += 1

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    export_path = EXPORT_DIR / f"EXP{export_id:02d}_{timestamp}_{status}_{comment}.csv"

    with export_path.open("w", newline="", encoding="utf-8-sig") as output_file:
        writer = csv.DictWriter(
            output_file,
            fieldnames=["rank", "image_id", "score", "caption", "cui"],
            delimiter=";",
        )
        writer.writeheader()
        for result in results:
            writer.writerow(
                {
                    "rank": result.get("rank", ""),
                    "image_id": result.get("image_id", ""),
                    "score": f"{result.get('score', 0)}",
                    "caption": result.get("caption", ""),
                    "cui": result.get("cui", ""),
                }
            )

    print(f"Résultats exportés vers {export_path}")


def main() -> None:
    """
    Point d'entrée principal du script de recherche.

    Orchestre la validation des arguments, l'exécution de la recherche,
    l'affichage des résultats dans la console et leur export en CSV.

    Returns:
        None

    Raises:
        ValueError: Si --k est hors de l'intervalle [1, MAX_K].
        FileNotFoundError: Si l'image requête ou l'index FAISS est introuvable.
    """
    args = parse_args()
    if not 0 < args.k <= MAX_K:
        raise ValueError(f"--k doit être compris entre 1 et {MAX_K}")

    embedder_name, query_image, results = run_query(args)
    print_results(args.mode, embedder_name, query_image, results)
    export_results_to_csv(results, args)


if __name__ == "__main__":
    main()