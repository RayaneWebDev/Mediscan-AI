"""Tests for the DINOv2 base embedder contract."""

from __future__ import annotations

from types import SimpleNamespace

import numpy as np
import pytest
import torch
from PIL import Image

from mediscan.embedders import dinov2_base as dinov2_module
from mediscan.embedders.dinov2_base import DINOv2BaseEmbedder


class StubDINOv2Model:
    """Tiny Transformers-like vision model that avoids loading real weights."""

    def __init__(self, *, pooler_output: torch.Tensor | None = None) -> None:
        """Document the __init__ function behavior."""
        self.config = SimpleNamespace(hidden_size=2)
        self.device = None
        self.eval_called = False
        self.pooler_output = pooler_output
        self.pixel_values: list[torch.Tensor] = []

    def to(self, device: torch.device) -> None:
        """Record the device selected by the embedder."""
        self.device = device

    def eval(self) -> None:
        """Record that evaluation mode was requested."""
        self.eval_called = True

    def __call__(self, *, pixel_values: torch.Tensor) -> SimpleNamespace:
        """Return a minimal model output with deterministic hidden states."""
        self.pixel_values.append(pixel_values)
        return SimpleNamespace(
            pooler_output=self.pooler_output,
            last_hidden_state=torch.tensor([[[3.0, 4.0], [0.0, 1.0]]], dtype=torch.float32),
        )


def test_dinov2_base_embedder_metadata_is_stable() -> None:
    """The visual embedder keeps its public name and default dimension."""
    assert DINOv2BaseEmbedder.name == "dinov2_base"
    assert DINOv2BaseEmbedder.dim == 768


def test_dinov2_base_encode_pil_rejects_non_pil_images() -> None:
    """Input validation runs before model-specific work."""
    embedder = object.__new__(DINOv2BaseEmbedder)

    with pytest.raises(TypeError, match="PIL.Image.Image"):
        embedder.encode_pil("not an image")


def test_dinov2_base_initializes_with_stub_transformers_model(monkeypatch) -> None:
    """Initialization wires Transformers dependencies without loading real weights."""
    stub_model = StubDINOv2Model(pooler_output=torch.tensor([[6.0, 8.0]], dtype=torch.float32))
    processor_calls: list[str] = []

    def stub_processor(*, images: Image.Image, return_tensors: str) -> dict[str, torch.Tensor]:
        """Record preprocessing arguments and return stub pixel values."""
        processor_calls.append(f"{images.mode}:{return_tensors}")
        return {"pixel_values": torch.tensor([[[[1.0]]]], dtype=torch.float32)}

    monkeypatch.setattr(dinov2_module, "configure_torch_cpu_threads", lambda: None)
    monkeypatch.setattr(
        dinov2_module.AutoImageProcessor,
        "from_pretrained",
        lambda model_name, use_fast: stub_processor,
    )
    monkeypatch.setattr(
        dinov2_module.AutoModel,
        "from_pretrained",
        lambda model_name: stub_model,
    )

    embedder = DINOv2BaseEmbedder(model_name="stub-dino")
    vector = embedder.encode_pil(Image.new("L", (2, 2), color=255))

    assert embedder.dim == 2
    assert embedder._model_name == "stub-dino"
    assert stub_model.device == torch.device("cpu")
    assert stub_model.eval_called is True
    assert processor_calls == ["RGB:pt"]
    assert np.allclose(vector, np.array([0.6, 0.8], dtype=np.float32))


def test_dinov2_base_encode_pil_falls_back_to_cls_token(monkeypatch) -> None:
    """The CLS token is used when the model has no pooler output."""
    stub_model = StubDINOv2Model(pooler_output=None)

    monkeypatch.setattr(dinov2_module, "configure_torch_cpu_threads", lambda: None)
    monkeypatch.setattr(
        dinov2_module.AutoImageProcessor,
        "from_pretrained",
        lambda model_name, use_fast: (
            lambda *, images, return_tensors: {
                "pixel_values": torch.tensor([[[[1.0]]]], dtype=torch.float32)
            }
        ),
    )
    monkeypatch.setattr(
        dinov2_module.AutoModel,
        "from_pretrained",
        lambda model_name: stub_model,
    )

    embedder = DINOv2BaseEmbedder(model_name="stub-dino")
    vector = embedder.encode_pil(Image.new("RGB", (2, 2), color="white"))

    assert np.allclose(vector, np.array([0.6, 0.8], dtype=np.float32))
