"""Email delivery service for the MediScan contact form."""

import os
import smtplib
import ssl
from email.message import EmailMessage


class EmailConfigurationError(RuntimeError):
    """Raised when SMTP configuration is incomplete or invalid."""


class EmailDeliveryError(RuntimeError):
    """Raised when an email could not be sent despite valid configuration."""


def _env_flag(name: str, default: bool = False) -> bool:
    """Read a boolean environment variable with a default value."""
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


class EmailService:
    """SMTP service for sending contact form messages."""

    def __init__(self) -> None:
        """
        Initialize the service by reading SMTP environment variables.

        Variables requises : MEDISCAN_SMTP_HOST, MEDISCAN_SMTP_USERNAME,
        MEDISCAN_SMTP_PASSWORD, MEDISCAN_CONTACT_FROM_EMAIL, MEDISCAN_CONTACT_TO_EMAIL.
        """
        self.host = os.getenv("MEDISCAN_SMTP_HOST", "").strip()
        self.port = int(os.getenv("MEDISCAN_SMTP_PORT", "587").strip())
        self.username = os.getenv("MEDISCAN_SMTP_USERNAME", "").strip()
        self.password = os.getenv("MEDISCAN_SMTP_PASSWORD", "").strip()
        self.from_email = os.getenv("MEDISCAN_CONTACT_FROM_EMAIL", "").strip()
        self.to_email = os.getenv("MEDISCAN_CONTACT_TO_EMAIL", "").strip()
        self.reply_to_email = os.getenv("MEDISCAN_CONTACT_REPLY_TO_EMAIL", "").strip() or self.from_email
        self.use_tls = _env_flag("MEDISCAN_SMTP_USE_TLS", default=True)
        self.use_ssl = _env_flag("MEDISCAN_SMTP_USE_SSL", default=False)

    def is_configured(self) -> bool:
        """Check that all required environment variables are defined."""
        required = [
            self.host,
            self.username,
            self.password,
            self.from_email,
            self.to_email,
        ]
        return all(required)

    def validate(self) -> None:
        """Validate SMTP configuration and raise an exception when it is invalid."""
        if not self.is_configured():
            raise EmailConfigurationError(
                "Email service is not configured. Please set the MEDISCAN_SMTP_* and "
                "MEDISCAN_CONTACT_* environment variables."
            )

        if self.use_tls and self.use_ssl:
            raise EmailConfigurationError("SMTP TLS and SMTP SSL cannot both be enabled.")

    def send_contact_email(self, *, name: str, email: str, subject: str, message: str) -> None:
        """Send a formatted contact email through the configured SMTP server."""
        self.validate()
        reply_to_addresses = [email]
        if self.reply_to_email and self.reply_to_email != email:
            reply_to_addresses.append(self.reply_to_email)

        mail = EmailMessage()
        mail["Subject"] = f"[MEDISCAN Contact] {subject}"
        mail["From"] = self.from_email
        mail["To"] = self.to_email
        mail["Reply-To"] = ", ".join(reply_to_addresses)

        content = "\n".join(
            [
                "New contact form submission",
                "",
                f"Name: {name}",
                f"Email: {email}",
                f"Subject: {subject}",
                "",
                "Message:",
                message,
            ]
        )
        mail.set_content(content)

        try:
            if self.use_ssl:
                context = ssl.create_default_context()
                with smtplib.SMTP_SSL(self.host, self.port, context=context, timeout=20) as server:
                    server.login(self.username, self.password)
                    server.send_message(mail)
                return

            with smtplib.SMTP(self.host, self.port, timeout=20) as server:
                server.ehlo()
                if self.use_tls:
                    context = ssl.create_default_context()
                    server.starttls(context=context)
                    server.ehlo()
                server.login(self.username, self.password)
                server.send_message(mail)
        except (OSError, smtplib.SMTPException) as exc:
            raise EmailDeliveryError("Unable to send the contact email.") from exc
