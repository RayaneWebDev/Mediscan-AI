"""Application safeguards for public endpoints."""

from __future__ import annotations

from collections import deque
from collections.abc import Callable, Iterator, Mapping
from contextlib import contextmanager
from dataclasses import dataclass
from math import ceil
from threading import Lock
from time import monotonic

from fastapi import Request


@dataclass(frozen=True)
class RateLimitDecision:
    """Result of a rate-limit check."""

    allowed: bool
    retry_after_seconds: int = 0


class InMemoryRateLimiter:
    """
    Sliding-window rate limiter keyed by bucket and client identifier.

    This lightweight limiter is process-local and designed to protect the demo API
    from accidental bursts. Deployments with multiple workers can replace it with
    a shared backend without changing route-level call sites.
    """

    def __init__(
        self,
        limits: Mapping[str, int],
        window_seconds: int,
        *,
        clock: Callable[[], float] = monotonic,
    ) -> None:
        """Initialize quotas per bucket and the counting window."""
        self._limits = dict(limits)
        self._window_seconds = max(1, int(window_seconds))
        self._clock = clock
        self._hits: dict[tuple[str, str], deque[float]] = {}
        self._lock = Lock()

    def check(self, bucket: str, identifier: str) -> RateLimitDecision:
        """Record one hit for a bucket/client pair or return the retry delay."""
        limit = self._limits.get(bucket)
        if limit is None or limit <= 0:
            return RateLimitDecision(allowed=True)

        now = self._clock()
        key = (bucket, identifier)
        window_start = now - self._window_seconds

        with self._lock:
            hits = self._hits.setdefault(key, deque())
            while hits and hits[0] <= window_start:
                hits.popleft()

            if len(hits) >= limit:
                retry_after = max(1, ceil(self._window_seconds - (now - hits[0])))
                return RateLimitDecision(allowed=False, retry_after_seconds=retry_after)

            hits.append(now)
            return RateLimitDecision(allowed=True)

    def reset(self) -> None:
        """Clear internal state, mainly for tests."""
        with self._lock:
            self._hits.clear()


class TooManyConcurrentRequests(RuntimeError):
    """Raised when a concurrency bucket is saturated."""


class RequestConcurrencyLimiter:
    """
    Immediate-fail concurrency limiter for expensive endpoint categories.

    Unlike the rate limiter, this protects active CPU/model work rather than
    request volume over time.
    """

    def __init__(self, limits: Mapping[str, int]) -> None:
        """Initialize concurrent-processing limits by bucket."""
        self._limits = dict(limits)
        self._active: dict[str, int] = {}
        self._lock = Lock()

    @contextmanager
    def acquire(self, bucket: str) -> Iterator[None]:
        """Reserve a processing slot for the duration of a guarded operation."""
        limit = self._limits.get(bucket)
        if limit is None or limit <= 0:
            yield
            return

        with self._lock:
            active = self._active.get(bucket, 0)
            if active >= limit:
                raise TooManyConcurrentRequests(f"Too many concurrent requests for '{bucket}'.")
            self._active[bucket] = active + 1

        try:
            yield
        finally:
            with self._lock:
                current = self._active.get(bucket, 0)
                if current <= 1:
                    self._active.pop(bucket, None)
                else:
                    self._active[bucket] = current - 1


def client_identifier(request: Request, *, trust_proxy_headers: bool = False) -> str:
    """Return the client identifier used for quotas, honoring proxies only when trusted."""
    if trust_proxy_headers:
        forwarded_for = request.headers.get("x-forwarded-for", "")
        first_forwarded_ip = forwarded_for.split(",", 1)[0].strip()
        if first_forwarded_ip:
            return first_forwarded_ip

    if request.client and request.client.host:
        return request.client.host
    return "unknown-client"
