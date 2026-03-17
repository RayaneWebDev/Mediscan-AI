# MEDISCAN CBIR

Prototype CBIR non clinique en imagerie médicale.

Pipeline actuelle :
- `visual` : `dinov2_base`
- `semantic` : `biomedclip`
- recherche : `FAISS IndexFlatIP`
- exécution : CPU only

## Données

Dataset local par défaut :
- images : `data/roco_small/images`
- métadonnées : `data/roco_small/metadata.csv`

## Construire les index

Mode visuel :

```bash
python scripts/build_index.py \
  --embedder dinov2_base \
  --index-path artifacts/index.faiss \
  --ids-path artifacts/ids.json
```

Mode sémantique :

```bash
python scripts/build_index.py \
  --embedder biomedclip \
  --index-path artifacts/index_semantic.faiss \
  --ids-path artifacts/ids_semantic.json
```

## Lancer une requête

Mode visuel :

```bash
python scripts/query.py --mode visual --image data/roco_small/images/<IMAGE>.png --k 10
```

Mode sémantique :

```bash
python scripts/query.py --mode semantic --image data/roco_small/images/<IMAGE>.png --k 10
```

## Évaluation

Qualité CUI :

```bash
python scripts/evaluation/evaluate_cui.py --mode visual --k 10 --n-queries 50 --seed 42
python scripts/evaluation/evaluate_cui.py --mode semantic --k 10 --n-queries 50 --seed 42
```

Benchmark :

```bash
python scripts/evaluation/benchmark.py --mode visual --k 10 --n-queries 10 --n-warmup 2
python scripts/evaluation/benchmark.py --mode semantic --k 10 --n-queries 10 --n-warmup 2
```

## Démo qualitative

```bash
python scripts/visualization/demo_dual_mode_grid.py --k 10
```
