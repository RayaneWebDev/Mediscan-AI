# MEDISCAN AI

MEDISCAN AI is a CPU-only CBIR project for radiology image retrieval.
The pipeline builds vector embeddings, indexes them with FAISS, and retrieves top-k similar images.

Two retrieval modes are supported:
- `visual`: ResNet50 RadImageNet embeddings (appearance similarity)
- `semantic`: CLIP ViT-B/32 embeddings (concept-level similarity)

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

Build semantic index (CLIP):

```bash
python scripts/build_index.py --embedder clip_vit_b32 --index-path artifacts/index_semantic.faiss --ids-path artifacts/ids_semantic.json
```

Query top-k (visual mode):

```bash
python scripts/query.py --mode visual --image data/roco_small/images/<image_file> --k 5
```

Query top-k (semantic mode, image -> CLIP embedding):

```bash
python scripts/query.py --mode semantic --image data/roco_small/images/<image_file> --k 5
```

Generate demo grids (visual vs semantic):

```bash
python scripts/demo_dual_mode_grid.py --image data/roco_small/images/<image_file> --k 15
```

## Versioning policy

Only code, scripts, and docs are versioned.
`data/`, `artifacts/`, `weights/`, `.venv/`, `.env`, and caches are excluded.
