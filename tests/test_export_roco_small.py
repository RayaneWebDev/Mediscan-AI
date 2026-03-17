import csv
from pathlib import Path
from unittest.mock import patch

import pytest

from scripts import export_roco_small as export


def test_sample_indices():
    indices = export.sample_indices(total=10, n=3, seed=42)
    assert len(indices) == 3
    assert all(0 <= i < 10 for i in indices)
    assert indices == sorted(indices)


def test_row_to_export_fields():
    row = {
        "image_id": "IMG001",
        "caption": "test",
        "cui": ["C123"],
        "image": {"bytes": b"\xff\xd8\xff"},
    }
    image_id, path, caption, cui, bytes_data = export.row_to_export_fields(row)
    assert image_id == "IMG001"
    assert caption == "test"
    assert bytes_data.startswith(b"\xff\xd8\xff")
    assert path == "data/roco_small/images/IMG001.jpg"
    assert cui == '["C123"]'


@patch("scripts.export_roco_small.read_selected_rows_multi")
@patch("scripts.export_roco_small.sample_indices")
@patch("scripts.export_roco_small.count_total_rows")
@patch("scripts.export_roco_small.ensure_pyarrow")
def test_write_dataset(mock_pq, mock_count, mock_sample, mock_read, tmp_path, monkeypatch):
    output_root = tmp_path / "data" / "roco_small"
    images_dir = output_root / "images"
    metadata_path = output_root / "metadata.csv"

    monkeypatch.setattr(export, "OUTPUT_ROOT", output_root)
    monkeypatch.setattr(export, "IMAGES_DIR", images_dir)
    monkeypatch.setattr(export, "METADATA_PATH", metadata_path)

    mock_pq.return_value = object()
    mock_count.return_value = 5
    mock_sample.return_value = [0, 1, 2]
    mock_read.return_value = [
        {"image_id": "IMG001", "caption": "c1", "cui": [], "image": {"bytes": b"\xff\xd8\xff"}},
        {"image_id": "IMG002", "caption": "c2", "cui": [], "image": {"bytes": b"\xff\xd8\xff"}},
        {"image_id": "IMG003", "caption": "c3", "cui": [], "image": {"bytes": b"\xff\xd8\xff"}},
    ]

    export.write_dataset(3, 42, [Path("fake1.parquet"), Path("fake2.parquet")])

    with metadata_path.open(newline="", encoding="utf-8") as csv_file:
        rows = list(csv.DictReader(csv_file))

    assert len(rows) == 3
    assert rows[0]["image_id"] == "IMG001"
    assert (images_dir / "IMG001.jpg").exists()
    assert (images_dir / "IMG002.jpg").exists()
    assert (images_dir / "IMG003.jpg").exists()


@patch("scripts.export_roco_small.write_dataset")
@patch("scripts.export_roco_small.discover_parquet_files")
def test_main_flow(mock_discover, mock_write):
    mock_discover.return_value = [Path("fake.parquet")]

    with patch("argparse.ArgumentParser.parse_args") as mock_args:
        mock_args.return_value = type(
            "Args",
            (),
            {"n": 3, "seed": 42, "source_parquet": None},
        )()
        export.main()

    mock_discover.assert_called_once_with(None)
    mock_write.assert_called_once_with(n=3, seed=42, parquet_files=[Path("fake.parquet")])
