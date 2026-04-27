#!/usr/bin/env python3
"""Run a similar-image search in the MediScan AI database."""

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
    """Parse and return command-line arguments."""
    parser = argparse.ArgumentParser(description="Run top-k similar-image search")
    parser.add_argument("--mode", default="visual", choices=("visual", "semantic"),
                        help="Search mode: visual (DINOv2) or semantic (BioMedCLIP)")
    parser.add_argument("--image", required=True, help="Path to the query image")
    parser.add_argument("--k", type=int, default=5, help=f"Number of results (max {MAX_K})")
    parser.add_argument("--embedder", default=None, help="Optional embedder override")
    parser.add_argument("--model-name", default=None, help="Optional pretrained model override")
    parser.add_argument("--index-path", default=None, help="Optional FAISS index path override")
    parser.add_argument("--ids-path", default=None, help="Optional IDs JSON path override")
    parser.add_argument(
        "--exclude-self",
        action="store_true",
        help="Exclude the query image when it already exists in the index",
    )
    return parser.parse_args()


def run_query(args: argparse.Namespace) -> tuple[str, str, list[dict[str, Any]]]:
    """Run similar-image search through the MediScan pipeline."""
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
    """Print search results to the console."""
    print(f"mode={mode}")
    print(f"embedder={embedder_name}")
    print(f"query_image={query_image}")
    print(f"results_found={len(results)}")
    for item in results:
        print(
            f"{item['rank']}. image_id={item['image_id']} "
            f"score={item['score']:.6f} path={item['path']}"
        )
        print(f"   caption={item['caption']}")
        print(f"   cui={item['cui']}")


def export_results_to_csv(results: list[dict[str, Any]], args: argparse.Namespace) -> None:
    """Export search results to a timestamped CSV file."""
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

    print(f"Results exported to {export_path}")


def main() -> None:
    """Main entrypoint for the search script."""
    args = parse_args()
    if not 0 < args.k <= MAX_K:
        raise ValueError(f"--k must be between 1 and {MAX_K}")

    embedder_name, query_image, results = run_query(args)
    print_results(args.mode, embedder_name, query_image, results)
    export_results_to_csv(results, args)


if __name__ == "__main__":
    main()
