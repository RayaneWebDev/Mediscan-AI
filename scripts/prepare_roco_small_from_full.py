#!/usr/bin/env python3
"""Build a representative ROCOv2 sample from the local full train split.

The script reads `data/roco_train_full/metadata.csv`, classifies each entry into a
broad modality bucket from its caption, performs a proportional deterministic
sample inside each bucket, then copies the chosen images into `data/roco_small/`.
"""

from __future__ import annotations

import argparse
import csv
import random
import shutil
from collections import defaultdict
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = PROJECT_ROOT / 'data' / 'roco_train_full'
SOURCE_METADATA = SOURCE_ROOT / 'metadata.csv'
SOURCE_IMAGES = SOURCE_ROOT / 'images'
TARGET_ROOT = PROJECT_ROOT / 'data' / 'roco_small'
TARGET_IMAGES = TARGET_ROOT / 'images'
TARGET_METADATA = TARGET_ROOT / 'metadata.csv'
CSV_COLUMNS = ['image_id', 'path', 'caption', 'cui']


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Create a mixed ROCO sample from the local full train split')
    parser.add_argument('--n', type=int, default=10_000)
    parser.add_argument('--seed', type=int, default=42)
    parser.add_argument('--source-metadata', default=str(SOURCE_METADATA))
    parser.add_argument('--target-root', default=str(TARGET_ROOT))
    return parser.parse_args()


def resolve(path: str | Path) -> Path:
    p = Path(path)
    return p if p.is_absolute() else PROJECT_ROOT / p


def classify_modality(caption: str) -> str:
    text = caption.lower()
    if any(token in text for token in ('panoramic', 'orthopantom', 'periapical', 'mandib', 'maxillar', 'dental')):
        return 'dental'
    if any(token in text for token in ('x-ray', 'radiograph', 'radiography', 'plain film', 'roentgenogram')):
        return 'xray'
    if any(token in text for token in ('computed tomography', ' ct ', 'ct:', 'ct-', 'ct scan', 'cta', 'cbct', 'cone-beam')):
        return 'ct'
    if any(token in text for token in ('magnetic resonance', ' mri', 'mri ', 't1', 't2', 'flair', 'diffusion-weighted')):
        return 'mri'
    if any(token in text for token in ('ultrasound', 'usg', 'sonograph', 'echograph')):
        return 'ultrasound'
    if any(token in text for token in ('pet', 'fdg', 'spect', 'scintigraph', 'nuclear medicine')):
        return 'nuclear'
    if any(token in text for token in ('angiograph', 'angiogram', 'arteriogram', 'venography', 'portography', 'ventriculography', 'fluorosc')):
        return 'angiography'
    return 'other'


def load_rows(metadata_path: Path) -> list[dict[str, str]]:
    with metadata_path.open('r', newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = []
        for row in reader:
            image_id = (row.get('image_id') or '').strip()
            path = (row.get('path') or '').strip()
            if not image_id or not path:
                continue
            rows.append({
                'image_id': image_id,
                'path': path,
                'caption': (row.get('caption') or '').strip(),
                'cui': (row.get('cui') or '').strip(),
                'bucket': classify_modality(row.get('caption') or ''),
            })
    return rows


def allocate_counts(groups: dict[str, list[dict[str, str]]], total_n: int) -> dict[str, int]:
    total_rows = sum(len(rows) for rows in groups.values())
    if total_n > total_rows:
        raise ValueError(f'Requested {total_n} rows but only {total_rows} are available')

    allocations: dict[str, int] = {}
    remainders: list[tuple[float, str]] = []
    assigned = 0
    for bucket, rows in groups.items():
        exact = total_n * len(rows) / total_rows
        base = int(exact)
        if base == 0 and rows:
            base = 1
        base = min(base, len(rows))
        allocations[bucket] = base
        assigned += base
        remainders.append((exact - int(exact), bucket))

    while assigned > total_n:
        for _, bucket in sorted(remainders):
            if assigned <= total_n:
                break
            if allocations[bucket] > 1:
                allocations[bucket] -= 1
                assigned -= 1

    while assigned < total_n:
        for _, bucket in sorted(remainders, reverse=True):
            if assigned >= total_n:
                break
            if allocations[bucket] < len(groups[bucket]):
                allocations[bucket] += 1
                assigned += 1

    return allocations


def clean_target(images_dir: Path) -> None:
    if images_dir.exists():
        for path in images_dir.iterdir():
            if path.is_file():
                path.unlink()
    else:
        images_dir.mkdir(parents=True, exist_ok=True)


def main() -> None:
    args = parse_args()
    source_metadata = resolve(args.source_metadata)
    target_root = resolve(args.target_root)
    target_images = target_root / 'images'
    target_metadata = target_root / 'metadata.csv'

    rows = load_rows(source_metadata)
    groups: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in rows:
        groups[row['bucket']].append(row)

    allocations = allocate_counts(groups, args.n)
    rng = random.Random(args.seed)

    selected: list[dict[str, str]] = []
    for bucket, bucket_rows in sorted(groups.items()):
        chosen = rng.sample(bucket_rows, allocations[bucket])
        selected.extend(chosen)
        print(f'bucket={bucket} total={len(bucket_rows)} sampled={len(chosen)}')

    selected.sort(key=lambda row: row['image_id'])

    target_root.mkdir(parents=True, exist_ok=True)
    clean_target(target_images)

    with target_metadata.open('w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=CSV_COLUMNS, lineterminator='\n')
        writer.writeheader()
        for i, row in enumerate(selected, start=1):
            source_path = resolve(row['path'])
            suffix = source_path.suffix.lower() or '.png'
            target_rel = f"data/roco_small/images/{row['image_id']}{suffix}"
            target_path = PROJECT_ROOT / target_rel
            shutil.copy2(source_path, target_path)
            writer.writerow({
                'image_id': row['image_id'],
                'path': target_rel,
                'caption': row['caption'],
                'cui': row['cui'],
            })
            if i % 1000 == 0:
                print(f'copied={i}/{len(selected)}')

    print(f'done sample_n={len(selected)} seed={args.seed} target={target_root}')


if __name__ == '__main__':
    main()
