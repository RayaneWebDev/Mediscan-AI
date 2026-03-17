"""Analyse simple de la distribution des CUI dans ids.json."""

from __future__ import annotations

import json
import statistics
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
IDS_PATH = PROJECT_ROOT / "artifacts" / "ids.json"


def main() -> None:
    with IDS_PATH.open(encoding="utf-8") as ids_file:
        ids = json.load(ids_file)

    counts = [len(json.loads(row.get("cui", "[]"))) for row in ids]

    print(f"Total images      : {len(counts)}")
    print(f"Images avec 0 CUI : {counts.count(0)}")
    print(f"Images avec 1 CUI : {counts.count(1)}")
    print(f"Images avec 2 CUI : {counts.count(2)}")
    print(f"Images avec 3 CUI : {counts.count(3)}")
    print(f"Images avec 4+ CUI: {sum(1 for count in counts if count >= 4)}")
    print(f"Moyenne CUI/image : {statistics.mean(counts):.2f}")


if __name__ == "__main__":
    main()
