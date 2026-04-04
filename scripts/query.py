#!/usr/bin/env python3
"""
Exécute la recherche d'images MEDISCAN en mode visuel ou sémantique.
"""

from __future__ import annotations

import argparse
import csv
from datetime import datetime
from pathlib import Path
from typing import Any

from mediscan.process import configure_cpu_environment
from mediscan.search import MAX_K, search_image

# Optimisation de l'environnement pour l'exécution sur CPU
configure_cpu_environment()

# Définition des chemins racines pour l'export des résultats
PROJECT_ROOT = Path(__file__).resolve().parents[1]
EXPORT_DIR = PROJECT_ROOT / "proofs" / "exports"


def parse_args() -> argparse.Namespace:
    """
    - Gestion des arguments pour la recherche d'images similaires (Top-K).
    """
    parser = argparse.ArgumentParser(description="Requête pour trouver les top-k images similaires")
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
        help="Exclure l'image de requête si elle existe déjà dans l'index",
    )
    return parser.parse_args()


def run_query(args: argparse.Namespace) -> tuple[str, str, list[dict[str, Any]]]:
    """
    - Exécute la recherche en déléguant à la fonction search_image du module search.
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


def print_results(mode: str, embedder_name: str, query_image: str, results: list[dict[str, Any]]) -> None:
    """
    - Affiche les résultats de la recherche de manière lisible dans la console.
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
    - Sauvegarde les résultats dans un fichier CSV pour l'archivage des preuves.
    """
    EXPORT_DIR.mkdir(parents=True, exist_ok=True)

    # Détermination du statut pour nommer le fichier
    status = "OK" if len(results) == args.k else "KO"
    comment = f"mode={args.mode}_k={args.k}" if status == "OK" else f"partiel_{len(results)}_vs_{args.k}"

    # Incrémentation du numéro d'export (EXP01, EXP02...)
    export_id = 1
    while list(EXPORT_DIR.glob(f"EXP{export_id:02d}_*")):
        export_id += 1

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    export_path = EXPORT_DIR / f"EXP{export_id:02d}_{timestamp}_{status}_{comment}.csv"

    # Écriture atomique du fichier CSV
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
    - Point d'entrée : validation de k, exécution de la recherche, affichage et export.
    """
    args = parse_args()
    if not 0 < args.k <= MAX_K:
        raise ValueError(f"--k doit être compris entre 1 et {MAX_K}")

    # Lancement de la recherche
    embedder_name, query_image, results = run_query(args)
    
    print_results(args.mode, embedder_name, query_image, results)
    
    export_results_to_csv(results, args)


if __name__ == "__main__":
    main()