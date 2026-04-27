"""Tests for SMTP email delivery service."""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest

from backend.app.services import email_service
from backend.app.services.email_service import EmailConfigurationError, EmailDeliveryError, EmailService


def set_email_env(monkeypatch: pytest.MonkeyPatch, **overrides: str) -> None:
    """Set a complete SMTP test environment."""
    values = {
        "MEDISCAN_SMTP_HOST": "smtp.example.com",
        "MEDISCAN_SMTP_PORT": "587",
        "MEDISCAN_SMTP_USERNAME": "user",
        "MEDISCAN_SMTP_PASSWORD": "pass",
        "MEDISCAN_CONTACT_FROM_EMAIL": "from@example.com",
        "MEDISCAN_CONTACT_TO_EMAIL": "to@example.com",
        "MEDISCAN_CONTACT_REPLY_TO_EMAIL": "reply@example.com",
        "MEDISCAN_SMTP_USE_TLS": "true",
        "MEDISCAN_SMTP_USE_SSL": "false",
    }
    values.update(overrides)
    for key, value in values.items():
        monkeypatch.setenv(key, value)


@pytest.mark.parametrize(
    ("value", "expected"),
    [(None, True), ("1", True), ("YES", True), ("on", True), ("false", False), ("0", False)],
)
def test_env_flag_parses_bool_values(
    monkeypatch: pytest.MonkeyPatch,
    value: str | None,
    expected: bool,
) -> None:
    """Boolean SMTP flags accept common truthy values."""
    if value is None:
        monkeypatch.delenv("MEDISCAN_FLAG", raising=False)
        assert email_service._env_flag("MEDISCAN_FLAG", default=True) is expected
    else:
        monkeypatch.setenv("MEDISCAN_FLAG", value)
        assert email_service._env_flag("MEDISCAN_FLAG") is expected


def test_email_service_detects_missing_configuration(monkeypatch: pytest.MonkeyPatch) -> None:
    """Incomplete SMTP environment is not considered configured."""
    monkeypatch.delenv("MEDISCAN_SMTP_HOST", raising=False)
    service = EmailService()

    assert service.is_configured() is False
    with pytest.raises(EmailConfigurationError, match="not configured"):
        service.validate()


def test_email_service_rejects_tls_and_ssl_together(monkeypatch: pytest.MonkeyPatch) -> None:
    """TLS and SSL are mutually exclusive SMTP modes."""
    set_email_env(monkeypatch, MEDISCAN_SMTP_USE_TLS="true", MEDISCAN_SMTP_USE_SSL="true")
    service = EmailService()

    with pytest.raises(EmailConfigurationError, match="cannot both be enabled"):
        service.validate()


def test_send_contact_email_uses_starttls(monkeypatch: pytest.MonkeyPatch) -> None:
    """STARTTLS SMTP flow logs in and sends the message."""
    set_email_env(monkeypatch)
    server = MagicMock()
    smtp_class = MagicMock(return_value=server)
    server.__enter__.return_value = server
    monkeypatch.setattr(email_service.smtplib, "SMTP", smtp_class)
    monkeypatch.setattr(email_service.ssl, "create_default_context", MagicMock(return_value="context"))

    EmailService().send_contact_email(
        name="Alice",
        email="alice@example.com",
        subject="Hello",
        message="Body",
    )

    smtp_class.assert_called_once_with("smtp.example.com", 587, timeout=20)
    server.starttls.assert_called_once_with(context="context")
    server.login.assert_called_once_with("user", "pass")
    sent_message = server.send_message.call_args.args[0]
    assert sent_message["Subject"] == "[MEDISCAN Contact] Hello"
    assert sent_message["Reply-To"] == "alice@example.com, reply@example.com"


def test_send_contact_email_uses_ssl(monkeypatch: pytest.MonkeyPatch) -> None:
    """Direct SSL SMTP flow is supported."""
    set_email_env(monkeypatch, MEDISCAN_SMTP_PORT="465", MEDISCAN_SMTP_USE_TLS="false", MEDISCAN_SMTP_USE_SSL="true")
    server = MagicMock()
    smtp_ssl_class = MagicMock(return_value=server)
    server.__enter__.return_value = server
    monkeypatch.setattr(email_service.smtplib, "SMTP_SSL", smtp_ssl_class)
    monkeypatch.setattr(email_service.ssl, "create_default_context", MagicMock(return_value="context"))

    EmailService().send_contact_email(
        name="Alice",
        email="alice@example.com",
        subject="Hello",
        message="Body",
    )

    smtp_ssl_class.assert_called_once_with("smtp.example.com", 465, context="context", timeout=20)
    server.login.assert_called_once_with("user", "pass")
    server.send_message.assert_called_once()


def test_send_contact_email_wraps_smtp_errors(monkeypatch: pytest.MonkeyPatch) -> None:
    """SMTP/network failures are reported as delivery errors."""
    set_email_env(monkeypatch)
    monkeypatch.setattr(email_service.smtplib, "SMTP", MagicMock(side_effect=OSError("down")))

    with pytest.raises(EmailDeliveryError, match="Unable to send"):
        EmailService().send_contact_email(
            name="Alice",
            email="alice@example.com",
            subject="Hello",
            message="Body",
        )
