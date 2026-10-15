from collections import defaultdict
import time
from typing import Tuple
from fastapi import HTTPException, status

class RateLimiter:
    """
    Sliding window in-memory rate limiter for login attempts.
    """
    def __init__(self, max_requests: int = 5, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.history = defaultdict(list)

    def check(self, key: str) -> Tuple[bool, int]:
        now = time.time()
        # Clean older requests outside the window
        timestamps = [ts for ts in self.history[key] if now - ts < self.window_seconds]
        self.history[key] = timestamps

        if len(timestamps) >= self.max_requests:
            retry_after = int(self.window_seconds - (now - timestamps[0]))
            return False, max(retry_after, 1)

        self.history[key].append(now)
        return True, 0

    def enforce(self, key: str):
        allowed, retry_after = self.check(key)
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many failed login attempts. Please try again in {retry_after} seconds.",
                headers={"Retry-After": str(retry_after)}
            )

login_rate_limiter = RateLimiter(max_requests=5, window_seconds=60)
