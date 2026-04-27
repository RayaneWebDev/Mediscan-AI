"""Tests for backend configuration helpers."""

from __future__ import annotations

import importlib
import builtins

import pytest

import backend.app.config as config


def test_env_int_uses_default_for_missing_or_blank_values(monkeypatch: pytest.MonkeyPatch) -> None:
    """Integer environment values fall back to defaults when unset or blank."""
    monkeypatch.delenv("MEDISCAN_TEST_INT", raising=False)
    assert config._env_int("MEDISCAN_TEST_INT", 42) == 42

    monkeypatch.setenv("MEDISCAN_TEST_INT", "  ")
    assert config._env_int("MEDISCAN_TEST_INT", 42) == 42


def test_env_int_parses_numbers_and_rejects_invalid_values(monkeypatch: pytest.MonkeyPatch) -> None:
    """Integer environment values are parsed strictly."""
    monkeypatch.setenv("MEDISCAN_TEST_INT", "7")
    assert config._env_int("MEDISCAN_TEST_INT", 42) == 7

    monkeypatch.setenv("MEDISCAN_TEST_INT", "many")
    with pytest.raises(ValueError, match="MEDISCAN_TEST_INT must be an integer"):
        config._env_int("MEDISCAN_TEST_INT", 42)


def test_env_csv_uses_default_and_strips_values(monkeypatch: pytest.MonkeyPatch) -> None:
    """CSV environment values are normalized to non-empty entries."""
    monkeypatch.delenv("MEDISCAN_TEST_CSV", raising=False)
    assert config._env_csv("MEDISCAN_TEST_CSV", ("a", "b")) == ["a", "b"]

    monkeypatch.setenv("MEDISCAN_TEST_CSV", " one, ,two ")
    assert config._env_csv("MEDISCAN_TEST_CSV", ("a", "b")) == ["one", "two"]


@pytest.mark.parametrize(
    ("value", "expected"),
    [(None, True), ("1", True), ("YES", True), ("on", True), ("false", False), ("0", False)],
)
def test_env_bool_parses_common_values(
    monkeypatch: pytest.MonkeyPatch,
    value: str | None,
    expected: bool,
) -> None:
    """Boolean environment values accept common truthy strings."""
    if value is None:
        monkeypatch.delenv("MEDISCAN_TEST_BOOL", raising=False)
        assert config._env_bool("MEDISCAN_TEST_BOOL", default=True) is expected
    else:
        monkeypatch.setenv("MEDISCAN_TEST_BOOL", value)
        assert config._env_bool("MEDISCAN_TEST_BOOL") is expected


def test_module_reads_cors_origins_from_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    """Reloading config reflects CORS origins from the environment."""
    monkeypatch.setenv("MEDISCAN_CORS_ORIGINS", "http://one.test, http://two.test")
    reloaded = importlib.reload(config)

    assert reloaded.CORS_ALLOWED_ORIGINS == ["http://one.test", "http://two.test"]

    importlib.reload(config)


def test_config_tolerates_missing_dotenv(monkeypatch: pytest.MonkeyPatch) -> None:
    """The config module still imports when python-dotenv is unavailable."""
    real_import = builtins.__import__

    def fake_import(name: str, *args: object, **kwargs: object):
        """Raise only for python-dotenv to exercise the fallback import path."""
        if name == "dotenv":
            raise ImportError("missing dotenv")
        return real_import(name, *args, **kwargs)

    monkeypatch.setattr(builtins, "__import__", fake_import)
    reloaded = importlib.reload(config)

    assert reloaded.HF_BASE_URL.startswith("https://huggingface.co/")

    monkeypatch.setattr(builtins, "__import__", real_import)
    importlib.reload(config)
