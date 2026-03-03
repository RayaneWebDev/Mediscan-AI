"""ResNet50 RadImageNet embedder implementation (CPU-only)."""

from __future__ import annotations

import os
from collections import OrderedDict
from collections.abc import Mapping
from pathlib import Path

import numpy as np
import torch
from PIL import Image as PILImage
from torch import nn
from torchvision import models, transforms

from .base import Embedder


class ResNet50RadImageNetEmbedder(Embedder):
    """ResNet50 feature extractor returning 2048-D normalized embeddings."""

    name = "resnet50_radimagenet"
    dim = 2048

    _MAX_MISMATCH_KEYS = 20
    _MAX_MISMATCH_RATIO = 0.10

    def __init__(self, weights_path: str | Path = "weights/resnet50_radimagenet.pt") -> None:
        # Conservative CPU threading defaults to reduce runtime instability on some hosts.
        thread_count = self._safe_int(os.getenv("MEDISCAN_TORCH_THREADS"), default=1)
        torch.set_num_threads(max(1, thread_count))
        try:
            torch.set_num_interop_threads(1)
        except RuntimeError:
            # set_num_interop_threads can only be called once per process.
            pass

        self._weights_path = Path(weights_path)
        self._device = torch.device("cpu")

        self._model = models.resnet50(weights=None)
        self._model.fc = nn.Identity()
        self._model.to(self._device)
        self._model.eval()

        self._preprocess = transforms.Compose(
            [
                transforms.Resize((224, 224)),
                transforms.ToTensor(),
                transforms.Normalize(
                    mean=[0.485, 0.456, 0.406],
                    std=[0.229, 0.224, 0.225],
                ),
            ]
        )

        self._load_weights()

    def _load_weights(self) -> None:
        if not self._weights_path.exists():
            raise FileNotFoundError(f"Weights file not found: {self._weights_path}")

        checkpoint = torch.load(self._weights_path, map_location="cpu")
        state_dict = self._extract_state_dict(checkpoint)

        adapted_state = OrderedDict()
        for key, value in state_dict.items():
            if not isinstance(key, str):
                continue
            adapted_state[self._adapt_key(key)] = value

        load_result = self._model.load_state_dict(adapted_state, strict=False)
        missing = list(load_result.missing_keys)
        unexpected = list(load_result.unexpected_keys)

        self._validate_loading(missing=missing, unexpected=unexpected)

    def _extract_state_dict(self, checkpoint: object) -> Mapping[str, torch.Tensor]:
        if isinstance(checkpoint, Mapping):
            if all(isinstance(k, str) for k in checkpoint.keys()):
                first_value = next(iter(checkpoint.values()), None)
                if isinstance(first_value, torch.Tensor):
                    return checkpoint  # type: ignore[return-value]

            raw_state = checkpoint.get("state_dict")
            if isinstance(raw_state, Mapping):
                return raw_state  # type: ignore[return-value]

        raise TypeError(
            "Unsupported checkpoint format. Expected an OrderedDict[str, Tensor] "
            "or a mapping containing a 'state_dict' key."
        )

    @staticmethod
    def _adapt_key(key: str) -> str:
        normalized = key
        if normalized.startswith("module."):
            normalized = normalized.removeprefix("module.")

        if not normalized.startswith("backbone."):
            return normalized

        suffix = normalized.removeprefix("backbone.")
        parts = suffix.split(".", maxsplit=1)
        block = parts[0]
        tail = parts[1] if len(parts) > 1 else ""

        mapping = {
            "0": "conv1",
            "1": "bn1",
            "4": "layer1",
            "5": "layer2",
            "6": "layer3",
            "7": "layer4",
        }

        mapped = mapping.get(block)
        if mapped is None:
            return suffix

        return f"{mapped}.{tail}" if tail else mapped

    def _validate_loading(self, missing: list[str], unexpected: list[str]) -> None:
        total_model_keys = len(self._model.state_dict())
        mismatch = len(missing) + len(unexpected)
        mismatch_ratio = mismatch / max(total_model_keys, 1)

        if mismatch == 0:
            return

        summary = (
            "Weight loading mismatch for ResNet50 RadImageNet: "
            f"missing={len(missing)}, unexpected={len(unexpected)}, "
            f"total_model_keys={total_model_keys}, mismatch_ratio={mismatch_ratio:.2%}."
        )

        if mismatch > self._MAX_MISMATCH_KEYS and mismatch_ratio > self._MAX_MISMATCH_RATIO:
            missing_preview = ", ".join(missing[:5]) if missing else "none"
            unexpected_preview = ", ".join(unexpected[:5]) if unexpected else "none"
            raise RuntimeError(
                f"{summary} Too many incompatible keys. "
                f"missing_preview=[{missing_preview}] "
                f"unexpected_preview=[{unexpected_preview}]"
            )

        print(f"[WARN] {summary}")

    @staticmethod
    def _safe_int(value: str | None, default: int) -> int:
        if value is None:
            return default
        try:
            return int(value)
        except ValueError:
            return default

    def encode_pil(self, image: PILImage.Image) -> np.ndarray:
        if not isinstance(image, PILImage.Image):
            raise TypeError("encode_pil expects a PIL.Image.Image instance")

        rgb_image = image.convert("RGB")
        input_tensor = self._preprocess(rgb_image).unsqueeze(0).to(self._device)

        with torch.no_grad():
            embedding = self._model(input_tensor)

        vector = embedding.squeeze(0).cpu().numpy().astype(np.float32, copy=False)

        if vector.shape != (self.dim,):
            raise RuntimeError(
                f"Unexpected embedding shape: got {vector.shape}, expected ({self.dim},)"
            )

        norm = float(np.linalg.norm(vector))
        if not np.isfinite(norm) or norm <= 0.0:
            raise RuntimeError("Embedding norm is invalid; cannot apply L2 normalization")

        vector /= norm
        return vector


__all__ = ["ResNet50RadImageNetEmbedder"]
