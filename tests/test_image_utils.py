from backend.app.image_utils import hf_image_url, image_folder_name, sanitize_image_id, with_public_result_paths


def test_sanitize_image_id_accepts_project_format():
    image_id = "ROCOv2_2023_train_000123"
    assert sanitize_image_id(image_id) == image_id


def test_sanitize_image_id_rejects_invalid_characters():
    try:
        sanitize_image_id("ROCOv2_2023_train_000123.png")
    except ValueError as exc:
        assert "Invalid image ID" in str(exc)
    else:
        raise AssertionError("Expected ValueError for invalid image id")


def test_image_folder_name_groups_images_by_thousands():
    assert image_folder_name("ROCOv2_2023_train_000001") == "images_01"
    assert image_folder_name("ROCOv2_2023_train_001001") == "images_02"


def test_hf_image_url_builds_public_url():
    image_id = "ROCOv2_2023_train_000001"
    assert hf_image_url(image_id).endswith("/images_01/ROCOv2_2023_train_000001.png")


def test_with_public_result_paths_rewrites_valid_result_paths():
    payload = {
        "mode": "visual",
        "results": [
            {
                "rank": 1,
                "image_id": "ROCOv2_2023_train_000001",
                "score": 0.99,
                "path": "local/path.png",
                "caption": "caption",
                "cui": "[]",
            }
        ],
    }

    public_payload = with_public_result_paths(payload)

    assert public_payload["results"][0]["path"] == hf_image_url("ROCOv2_2023_train_000001")
    assert payload["results"][0]["path"] == "local/path.png"
