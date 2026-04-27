"""Tests for ROCO metadata dataset loading."""

from __future__ import annotations

import pytest

from mediscan.dataset import MetadataRecord, RocoDataset


def test_metadata_record_to_dict_returns_all_fields() -> None:
    """Metadata records expose the CSV fields as a plain dictionary."""
    record = MetadataRecord(
        image_id="img-1",
        path="images/img-1.png",
        caption="Chest scan",
        cui="C123",
    )

    assert record.to_dict() == {
        "image_id": "img-1",
        "path": "images/img-1.png",
        "caption": "Chest scan",
        "cui": "C123",
    }


def test_roco_dataset_loads_valid_metadata_csv(tmp_path) -> None:
    """A valid metadata CSV is loaded in order and stripped."""
    metadata = tmp_path / "metadata.csv"
    metadata.write_text(
        "image_id,path,caption,cui\n"
        " img-1 , images/img-1.png , Chest scan , C123 \n",
        encoding="utf-8",
    )

    dataset = RocoDataset(metadata)

    assert len(dataset) == 1
    assert dataset.records == [
        MetadataRecord(
            image_id="img-1",
            path="images/img-1.png",
            caption="Chest scan",
            cui="C123",
        )
    ]
    assert list(dataset) == dataset.records


def test_roco_dataset_rejects_missing_required_columns(tmp_path) -> None:
    """The loader fails early when a required CSV column is missing."""
    metadata = tmp_path / "metadata.csv"
    metadata.write_text("image_id,path,caption\nimg-1,a.png,Caption\n", encoding="utf-8")

    with pytest.raises(ValueError, match="CSV missing required columns"):
        RocoDataset(metadata)


def test_roco_dataset_rejects_missing_file(tmp_path) -> None:
    """The metadata CSV must exist."""
    with pytest.raises(FileNotFoundError, match="Metadata CSV not found"):
        RocoDataset(tmp_path / "missing.csv")


def test_roco_dataset_rejects_csv_without_header(tmp_path) -> None:
    """A CSV without a header cannot be mapped into metadata records."""
    metadata = tmp_path / "metadata.csv"
    metadata.write_text("", encoding="utf-8")

    with pytest.raises(ValueError, match="CSV file has no header"):
        RocoDataset(metadata)


def test_roco_dataset_rejects_rows_without_image_id_or_path(tmp_path) -> None:
    """Rows without an image id or path are invalid."""
    metadata = tmp_path / "metadata.csv"
    metadata.write_text("image_id,path,caption,cui\n,img.png,Caption,C1\n", encoding="utf-8")

    with pytest.raises(ValueError, match="image_id and path are required"):
        RocoDataset(metadata)
