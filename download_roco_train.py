from datasets import load_dataset
from pathlib import Path
import csv
import json
import sys

OUT_DIR = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("roco_train_full")
IMG_DIR = OUT_DIR / "images"
META_CSV = OUT_DIR / "metadata.csv"
META_JSONL = OUT_DIR / "metadata.jsonl"

OUT_DIR.mkdir(parents=True, exist_ok=True)
IMG_DIR.mkdir(parents=True, exist_ok=True)

print("Chargement du split train de ROCOv2-radiology...")
ds = load_dataset("eltorio/ROCOv2-radiology", split="train")

print(f"Nombre d'exemples chargés : {len(ds)}")

with META_CSV.open("w", newline="", encoding="utf-8") as f_csv, \
     META_JSONL.open("w", encoding="utf-8") as f_jsonl:

    writer = csv.DictWriter(
        f_csv,
        fieldnames=["image_id", "file_name", "caption", "cui"]
    )
    writer.writeheader()

    for i, sample in enumerate(ds):
        image = sample["image"]
        image_id = sample["image_id"]
        caption = sample["caption"]
        cui = sample["cui"]

        ext = ".png"
        if getattr(image, "format", None):
            ext = "." + image.format.lower()

        file_name = f"{image_id}{ext}"
        out_path = IMG_DIR / file_name

        image.save(out_path)

        row = {
            "image_id": image_id,
            "file_name": f"images/{file_name}",
            "caption": caption,
            "cui": json.dumps(cui, ensure_ascii=False),
        }

        writer.writerow(row)
        f_jsonl.write(json.dumps(row, ensure_ascii=False) + "\n")

        if (i + 1) % 1000 == 0:
            print(f"{i + 1} images sauvegardées...")

print("Téléchargement terminé.")
print(f"Dossier : {OUT_DIR.resolve()}")
print(f"Images : {IMG_DIR.resolve()}")
print(f"Métadonnées CSV : {META_CSV.resolve()}")
print(f"Métadonnées JSONL : {META_JSONL.resolve()}")