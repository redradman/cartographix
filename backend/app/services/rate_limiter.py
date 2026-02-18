import time
from collections import defaultdict
from typing import Dict, List


class RateLimiter:
    """In-memory rate limiter: 3 requests per email per 24-hour rolling window."""

    def __init__(self, max_requests: int = 3, window_seconds: int = 86400) -> None:
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._requests: Dict[str, List[float]] = defaultdict(list)

    def is_allowed(self, email: str) -> bool:
        now = time.time()
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

    def is_allowed(self, ip: str) -> bool:
        now = time.time()
        cutoff = now - self.window_seconds
        self._requests[ip] = [t for t in self._requests[ip] if t > cutoff]
        if len(self._requests[ip]) >= self.max_requests:
            return False
        self._requests[ip].append(now)
        return True


ip_rate_limiter = IPRateLimiter()
