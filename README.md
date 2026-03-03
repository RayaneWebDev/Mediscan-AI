# MEDISCAN AI

MEDISCAN AI is a CPU-only CBIR project for radiology image retrieval.
The pipeline builds vector embeddings, indexes them with FAISS, and retrieves top-k similar images.

## Quickstart

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Model weights (not committed)

Place the RadImageNet checkpoint at:

`weights/resnet50_radimagenet.pt`

The `weights/` directory is local-only and ignored by Git/SVN.

## Main commands

Build index:

```bash
python scripts/build_index.py --embedder resnet50_radimagenet
```

Query top-k:

```bash
python scripts/query.py --embedder resnet50_radimagenet --image data/roco_small/images/<image_file> --k 5
```

## Versioning policy

Only code, scripts, and docs are versioned.
`data/`, `artifacts/`, `weights/`, `.venv/`, `.env`, and caches are excluded.
