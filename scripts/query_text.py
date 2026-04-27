#!/usr/bin/env python3
"""Run text-to-image search in the MediScan AI database through BioMedCLIP."""

from __future__ import annotations

import argparse
import sys


def parse_args() -> argparse.Namespace:
    """Parse and return command-line arguments."""
    parser = argparse.ArgumentParser(
        description="Run text-to-image search through the BioMedCLIP semantic index"
    )
    parser.add_argument("--query", "-q", required=True, help="Medical text query in English")
    parser.add_argument("--k", type=int, default=5, help="Number of results (default: 5, max: 50)")
    parser.add_argument("--embedder", default=None, help="Optional embedder override")
    parser.add_argument("--model-name", default=None, help="Optional pretrained model override")
    parser.add_argument("--index-path", default=None, help="Optional FAISS index path override")
    parser.add_argument("--ids-path", default=None, help="Optional IDs JSON path override")
    return parser.parse_args()


def load_resources(args: argparse.Namespace):
    """Load the semantic FAISS index and BioMedCLIP embedder."""
    from mediscan.process import configure_cpu_environment
    from mediscan.search import load_resources as _load_resources

    configure_cpu_environment()

    print("Loading semantic index (BioMedCLIP)...")
    try:
        return _load_resources(
            mode="semantic",
            embedder=args.embedder,
            model_name=args.model_name,
            index_path=args.index_path,
            ids_path=args.ids_path,
        )
    except FileNotFoundError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        print(
            "Tip: build the index with:\n"
            "  python scripts/rebuild_stable_indexes.py",
            file=sys.stderr,
        )
        sys.exit(1)


def print_results(results: list[dict], query: str, k: int, resources) -> None:
    """Print text-search results to the console."""
    print(f"Embedder : {resources.embedder.name}  dim={resources.embedder.dim}")
    print(f"Index    : {resources.index.ntotal} vectors")
    print(f"Query    : \"{query}\"")
    print(f"Top-k    : {k}")
    print("-" * 72)

    if not results:
        print("No results returned.")
        return

    for r in results:
        caption_short = r["caption"][:80] + ("…" if len(r["caption"]) > 80 else "")
        cui = r["cui"] if r["cui"] and r["cui"] != "[]" else "-"
        print(
            f"#{r['rank']:2d}  score={r['score']:.4f}  id={r['image_id']:<12s}"
            f"  cui={cui:<20s}  caption={caption_short}"
        )


def main() -> None:
    """Main entrypoint for the text-search script."""
    args = parse_args()

    if not args.query.strip():
        print("ERROR: query is empty.", file=sys.stderr)
        sys.exit(1)
    if not 1 <= args.k <= 50:
        print("ERROR: k must be between 1 and 50.", file=sys.stderr)
        sys.exit(1)

    from mediscan.search import query_text

    resources = load_resources(args)
    results = query_text(resources=resources, text=args.query, k=args.k)
    print_results(results, args.query, args.k, resources)


if __name__ == "__main__":
    main()
