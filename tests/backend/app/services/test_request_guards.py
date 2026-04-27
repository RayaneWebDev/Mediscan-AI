"""Tests for public endpoint guard helpers."""

from __future__ import annotations

from types import SimpleNamespace

import pytest

from backend.app.services.request_guards import (
    InMemoryRateLimiter,
    RequestConcurrencyLimiter,
    TooManyConcurrentRequests,
    client_identifier,
)


def test_rate_limiter_allows_until_bucket_limit_then_reports_retry_after() -> None:
    """Sliding-window limiter blocks the next request after the bucket is full."""
    now = 100.0
    limiter = InMemoryRateLimiter({"contact": 2}, 60, clock=lambda: now)

    assert limiter.check("contact", "127.0.0.1").allowed is True
    assert limiter.check("contact", "127.0.0.1").allowed is True

    decision = limiter.check("contact", "127.0.0.1")

    assert decision.allowed is False
    assert decision.retry_after_seconds == 60


def test_rate_limiter_expires_old_hits() -> None:
    """Old entries leave the window and free new capacity."""
    current_time = 100.0
    limiter = InMemoryRateLimiter({"search": 1}, 10, clock=lambda: current_time)

    assert limiter.check("search", "client").allowed is True
    current_time = 111.0

    assert limiter.check("search", "client").allowed is True


def test_rate_limiter_reset_clears_tracked_hits() -> None:
    """Reset removes stored hits so a full bucket can accept traffic again."""
    limiter = InMemoryRateLimiter({"search": 1}, 60)

    assert limiter.check("search", "client").allowed is True
    assert limiter.check("search", "client").allowed is False

    limiter.reset()

    assert limiter.check("search", "client").allowed is True


def test_rate_limiter_ignores_missing_or_disabled_buckets() -> None:
    """Unknown and non-positive buckets are intentionally unlimited."""
    limiter = InMemoryRateLimiter({"disabled": 0}, 60)

    assert limiter.check("unknown", "client").allowed is True
    assert limiter.check("disabled", "client").allowed is True


def test_concurrency_limiter_fails_fast_when_bucket_is_full() -> None:
    """Concurrency slots are released after the context exits."""
    limiter = RequestConcurrencyLimiter({"search": 1})

    with limiter.acquire("search"):
        with pytest.raises(TooManyConcurrentRequests):
            with limiter.acquire("search"):
                pass

    with limiter.acquire("search"):
        pass


def test_concurrency_limiter_allows_unlimited_buckets_and_nested_release() -> None:
    """Unlimited buckets bypass accounting, while nested counted slots are released one by one."""
    limiter = RequestConcurrencyLimiter({"search": 2})

    with limiter.acquire("unknown"):
        pass

    with limiter.acquire("search"):
        with limiter.acquire("search"):
            pass
        with limiter.acquire("search"):
            pass


def test_client_identifier_uses_proxy_header_only_when_trusted() -> None:
    """Proxy headers are ignored unless explicitly trusted."""
    request = SimpleNamespace(
        headers={"x-forwarded-for": "203.0.113.5, 10.0.0.1"},
        client=SimpleNamespace(host="127.0.0.1"),
    )

    assert client_identifier(request, trust_proxy_headers=False) == "127.0.0.1"
    assert client_identifier(request, trust_proxy_headers=True) == "203.0.113.5"


def test_client_identifier_falls_back_when_client_is_missing() -> None:
    """Requests without a client host still get a stable limiter identifier."""
    request = SimpleNamespace(headers={}, client=None)

    assert client_identifier(request) == "unknown-client"
