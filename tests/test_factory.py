import pytest

from mediscan.embedders.factory import get_embedder


class FakeDino:
    def __init__(self, **kwargs):
        self.kwargs = kwargs


class FakeBioMed:
    def __init__(self, **kwargs):
        self.kwargs = kwargs


@pytest.fixture(autouse=True)
def registry_patch(monkeypatch):
    monkeypatch.setattr(
        "mediscan.embedders.factory.EMBEDDER_REGISTRY",
        {
            "dinov2_base": FakeDino,
            "biomedclip": FakeBioMed,
        },
    )


def test_get_embedder_returns_registered_class():
    embedder = get_embedder("dinov2_base", model_name="facebook/dinov2-base")
    assert isinstance(embedder, FakeDino)
    assert embedder.kwargs["model_name"] == "facebook/dinov2-base"


def test_get_embedder_is_case_insensitive():
    embedder = get_embedder("  BIOMEDCLIP  ")
    assert isinstance(embedder, FakeBioMed)


def test_get_embedder_unknown_raises():
    with pytest.raises(ValueError, match="Supported embedders"):
        get_embedder("unknown")
