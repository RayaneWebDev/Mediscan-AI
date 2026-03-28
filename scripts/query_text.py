"""CLI script for text-to-image search using BioMedCLIP.

Usage:
    PYTHONPATH=src:. .venv311/bin/python scripts/query_text.py --query "chest X-ray pneumonia" --k 5

The semantic FAISS index (artifacts/index_semantic.faiss) must exist.
Build it first with:
    PYTHONPATH=src:. .venv311/bin/python scripts/build_index.py --mode semantic
"""

from __future__ import annotations

import argparse
import sys


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Text-to-image search using BioMedCLIP semantic index"
    )
    parser.add_argument("--query", "-q", required=True, help="Medical text query (English)")
    parser.add_argument("--k", type=int, default=5, help="Number of results (default: 5, max: 50)")
    args = parser.parse_args()

    if not args.query.strip():
        print("ERROR: query is empty", file=sys.stderr)
        sys.exit(1)
    if not 1 <= args.k <= 50:
        print("ERROR: k must be between 1 and 50", file=sys.stderr)
        sys.exit(1)

    from mediscan.process import configure_cpu_environment
    from mediscan.search import load_resources, query_text

    configure_cpu_environment()

    print(f"Loading semantic index (BioMedCLIP)...")
    try:
        resources = load_resources(mode="semantic")
    except FileNotFoundError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        print(
            "Hint: build the index first with:\n"
            "  PYTHONPATH=src:. .venv311/bin/python scripts/build_index.py --mode semantic",
            file=sys.stderr,
        )
        sys.exit(1)

    print(f"Embedder : {resources.embedder.name}  dim={resources.embedder.dim}")
    print(f"Index    : {resources.index.ntotal} vectors")
    print(f"Query    : \"{args.query}\"")
    print(f"Top-k    : {args.k}")
    print("-" * 72)

    results = query_text(resources=resources, text=args.query, k=args.k)

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


if __name__ == "__main__":
    main()
