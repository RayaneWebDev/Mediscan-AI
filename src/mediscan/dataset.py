"""Management utilities for ROCOv2 dataset metadata."""

from __future__ import annotations

import csv
from dataclasses import dataclass
from pathlib import Path
from typing import Iterator


@dataclass(frozen=True)
class MetadataRecord:
    """
    Normalized metadata row for one ROCOv2 medical image.

    The fields mirror the IDs JSON consumed by FAISS search, so the dataset loader
    can be used directly by index-building scripts without extra shape adapters.
    """
    image_id: str
    path: str
    caption: str
    cui: str

    def to_dict(self) -> dict[str, str]:
        """Convert the record to a serializable dictionary."""
        return {
            "image_id": self.image_id,
            "path": self.path,
            "caption": self.caption,
            "cui": self.cui,
        }


class RocoDataset:
    """
    In-memory loader for ROCOv2 metadata.

    Loading everything eagerly keeps index construction deterministic: validation
    errors are raised before any model inference starts, and iteration order stays
    identical to the CSV order used for FAISS row alignment.
    """
    REQUIRED_COLUMNS = ("image_id", "path", "caption", "cui")

    def __init__(
        self,
        metadata_csv: str | Path = "data/roco_train_full/metadata.csv",
    ) -> None:
        """Initialize the dataset by loading and validating the CSV file."""
        self.metadata_csv = Path(metadata_csv)
        if not self.metadata_csv.exists():
            raise FileNotFoundError(f"Metadata CSV not found: {self.metadata_csv}")
        self._records = self._load_records()

    def _load_records(self) -> list[MetadataRecord]:
        """Read the CSV and enforce the minimum fields required by the pipeline."""
        records: list[MetadataRecord] = []

        with self.metadata_csv.open("r", newline="", encoding="utf-8") as csv_file:
            reader = csv.DictReader(csv_file)
            if reader.fieldnames is None:
                raise ValueError(f"CSV file has no header: {self.metadata_csv}")

            missing_columns = [
                column for column in self.REQUIRED_COLUMNS
                if column not in reader.fieldnames
            ]
            if missing_columns:
                raise ValueError(
                    f"CSV missing required columns {missing_columns} in {self.metadata_csv}"
                )

            for row_number, row in enumerate(reader, start=2):
                image_id = (row.get("image_id") or "").strip()
                image_path = (row.get("path") or "").strip()
                caption = (row.get("caption") or "").strip()
                cui = (row.get("cui") or "").strip()

                if not image_id or not image_path:
                    raise ValueError(
                        f"Invalid row {row_number} in {self.metadata_csv}: "
                        "image_id and path are required"
                    )

                records.append(
                    MetadataRecord(
                        image_id=image_id,
                        path=image_path,
                        caption=caption,
                        cui=cui,
                    )
                )

        return records

    def __len__(self) -> int:
        """Return the total number of records in the dataset."""
        return len(self._records)

    def __iter__(self) -> Iterator[MetadataRecord]:
        """Iterate over dataset records in CSV order."""
        return iter(self._records)

    @property
    def records(self) -> list[MetadataRecord]:
        """Return a copy of all records."""
        return list(self._records)


__all__ = ["MetadataRecord", "RocoDataset"]
