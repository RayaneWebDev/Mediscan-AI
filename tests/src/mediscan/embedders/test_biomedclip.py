"""Tests for the BioMedCLIP embedder contract."""

from __future__ import annotations

from types import SimpleNamespace

import numpy as np
import pytest
import torch
from PIL import Image

from mediscan.embedders import biomedclip as biomedclip_module
from mediscan.embedders.biomedclip import BioMedCLIPEmbedder


class StubBioMedCLIPModel:
    """Tiny OpenCLIP-like model that avoids loading real weights."""

    def __init__(self) -> None:
        """Document the __init__ function behavior."""
        self.visual = SimpleNamespace(output_dim=2)
        self.device = None
        self.eval_called = False
        self.image_inputs: list[torch.Tensor] = []
        self.text_inputs: list[torch.Tensor] = []

    def to(self, device: torch.device) -> None:
        """Record the target device selected by the embedder."""
        self.device = device

    def eval(self) -> None:
        """Record that evaluation mode was requested."""
        self.eval_called = True

    def encode_image(self, input_tensor: torch.Tensor) -> torch.Tensor:
        """Return a deterministic image embedding tensor."""
        self.image_inputs.append(input_tensor)
        return torch.tensor([[3.0, 4.0]], dtype=torch.float32)

    def encode_text(self, tokens: torch.Tensor) -> torch.Tensor:
        """Return a deterministic text embedding tensor."""
        self.text_inputs.append(tokens)
        return torch.tensor([[1.0, 1.0]], dtype=torch.float32)


def test_biomedclip_embedder_metadata_is_stable() -> None:
    """The semantic embedder keeps its public name and default dimension."""
    assert BioMedCLIPEmbedder.name == "biomedclip"
    assert BioMedCLIPEmbedder.dim == 512


def test_biomedclip_encode_pil_rejects_non_pil_images() -> None:
    """Input validation runs before model-specific work."""
    embedder = object.__new__(BioMedCLIPEmbedder)

    with pytest.raises(TypeError, match="PIL.Image.Image"):
        embedder.encode_pil("not an image")


def test_biomedclip_initializes_with_stub_open_clip_model(monkeypatch) -> None:
    """Initialization wires OpenCLIP dependencies without loading real weights."""
    stub_model = StubBioMedCLIPModel()
    preprocess_calls: list[str] = []
    tokenizer_calls: list[str] = []

    def stub_preprocess(image: Image.Image) -> torch.Tensor:
        """Record image mode and return stub preprocessed pixels."""
        preprocess_calls.append(image.mode)
        return torch.tensor([1.0, 2.0], dtype=torch.float32)

    def stub_tokenizer(texts: list[str]) -> torch.Tensor:
        """Record tokenized texts and return stub token IDs."""
        tokenizer_calls.extend(texts)
        return torch.tensor([[1, 2]], dtype=torch.int64)

    monkeypatch.setattr(biomedclip_module, "configure_torch_cpu_threads", lambda: None)
    monkeypatch.setattr(
        biomedclip_module.open_clip,
        "create_model_and_transforms",
        lambda model_name: (stub_model, None, stub_preprocess),
    )
    monkeypatch.setattr(
        biomedclip_module.open_clip,
        "get_tokenizer",
        lambda model_name: stub_tokenizer,
    )

    embedder = BioMedCLIPEmbedder(model_name="stub-model")
    image_vector = embedder.encode_pil(Image.new("L", (2, 2), color=255))
    text_vector = embedder.encode_text("lung opacity")

    assert embedder.dim == 2
    assert embedder._model_name == "stub-model"
    assert stub_model.device == torch.device("cpu")
    assert stub_model.eval_called is True
    assert preprocess_calls == ["RGB"]
    assert tokenizer_calls == ["lung opacity"]
    assert np.allclose(image_vector, np.array([0.6, 0.8], dtype=np.float32))
    assert np.allclose(text_vector, np.array([0.70710677, 0.70710677], dtype=np.float32))


def test_biomedclip_initializes_dimension_from_embed_dim(monkeypatch) -> None:
    """The fallback embed_dim attribute is used when visual.output_dim is absent."""
    stub_model = StubBioMedCLIPModel()
    stub_model.visual = SimpleNamespace()
    stub_model.embed_dim = 3

    monkeypatch.setattr(biomedclip_module, "configure_torch_cpu_threads", lambda: None)
    monkeypatch.setattr(
        biomedclip_module.open_clip,
        "create_model_and_transforms",
        lambda model_name: (
            stub_model,
            None,
            lambda image: torch.tensor([1.0, 2.0, 3.0], dtype=torch.float32),
        ),
    )
    monkeypatch.setattr(
        biomedclip_module.open_clip,
        "get_tokenizer",
        lambda model_name: lambda texts: torch.tensor([[1, 2]], dtype=torch.int64),
    )

    embedder = BioMedCLIPEmbedder(model_name="stub-model")

    assert embedder.dim == 3
