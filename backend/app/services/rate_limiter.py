import time
from collections import defaultdict
from typing import Dict, List

_CLEANUP_INTERVAL = 600  # purge stale keys every 10 minutes


class RateLimiter:
    """In-memory rate limiter: 3 requests per email per 24-hour rolling window."""

    def __init__(self, max_requests: int = 3, window_seconds: int = 86400) -> None:
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._requests: Dict[str, List[float]] = defaultdict(list)
        self._last_cleanup: float = time.time()

    def _maybe_cleanup(self, now: float) -> None:
        if now - self._last_cleanup < _CLEANUP_INTERVAL:
            return
        self._last_cleanup = now
        cutoff = now - self.window_seconds
        empty_keys = [k for k, v in self._requests.items() if not v or v[-1] <= cutoff]
        for k in empty_keys:
            del self._requests[k]

    def is_allowed(self, email: str) -> bool:
        now = time.time()
        self._maybe_cleanup(now)
        cutoff = now - self.window_seconds
        # Prune old entries
        self._requests[email] = [
            t for t in self._requests[email] if t > cutoff
        ]
        if len(self._requests[email]) >= self.max_requests:
            return False
        self._requests[email].append(now)
        return True

    def remaining(self, email: str) -> int:
        now = time.time()
        cutoff = now - self.window_seconds
        self._requests[email] = [
            t for t in self._requests[email] if t > cutoff
        ]
        return max(0, self.max_requests - len(self._requests[email]))


rate_limiter = RateLimiter()


class IPRateLimiter:
    """In-memory rate limiter: 5 requests per IP per 1-hour rolling window."""

    def __init__(self, max_requests: int = 5, window_seconds: int = 3600) -> None:
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._requests: Dict[str, List[float]] = defaultdict(list)
        self._last_cleanup: float = time.time()

    def _maybe_cleanup(self, now: float) -> None:
        if now - self._last_cleanup < _CLEANUP_INTERVAL:
            return
        self._last_cleanup = now
        cutoff = now - self.window_seconds
        empty_keys = [k for k, v in self._requests.items() if not v or v[-1] <= cutoff]
        for k in empty_keys:
            del self._requests[k]

    def is_allowed(self, ip: str) -> bool:
        now = time.time()
        self._maybe_cleanup(now)
        cutoff = now - self.window_seconds
        self._requests[ip] = [t for t in self._requests[ip] if t > cutoff]
        if len(self._requests[ip]) >= self.max_requests:
            return False
        self._requests[ip].append(now)
        return True


ip_rate_limiter = IPRateLimiter()
