"""Tiny in-memory IP-based rate limiter.

Used as a FastAPI dependency on hot or expensive endpoints. Keys per
client IP (no auth yet) and per endpoint name. Sliding-window: keep a
deque of timestamps per key, drop entries older than the window before
deciding.

Limitations to know:
- In-memory: counters reset on backend restart and don't share across
  workers / replicas. Fine for single-process dev. Move to Redis when
  scaling out.
- IP-based: trivially bypassed by changing IP. Auth-based limits will
  go in once auth lands; for now this just stops abusive single-source
  hammering and the pentest's "150 rapid requests" finding.
"""

from __future__ import annotations

import threading
import time
from collections import defaultdict, deque
from typing import Callable

from fastapi import HTTPException, Request


class _SlidingWindowLimiter:
    def __init__(self) -> None:
        self._calls: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def check(self, key: str, limit: int, window_seconds: float) -> bool:
        """Return True if the call is allowed, False if it would exceed
        the limit. Records the call when allowed."""
        now = time.monotonic()
        cutoff = now - window_seconds
        with self._lock:
            q = self._calls[key]
            while q and q[0] < cutoff:
                q.popleft()
            if len(q) >= limit:
                return False
            q.append(now)
            return True


_limiter = _SlidingWindowLimiter()


def rate_limit(name: str, limit: int, window_seconds: float = 60.0) -> Callable:
    """Build a FastAPI dependency that throttles `limit` calls per
    `window_seconds` per client IP, scoped by `name`. Raises 429 on
    overflow.
    """
    def _dep(request: Request) -> None:
        client_ip = request.client.host if request.client else "unknown"
        key = f"{name}:{client_ip}"
        if not _limiter.check(key, limit, window_seconds):
            raise HTTPException(
                status_code=429,
                detail=f"Too many requests for {name}. Try again shortly.",
                headers={"Retry-After": str(int(window_seconds))},
            )
    return _dep
