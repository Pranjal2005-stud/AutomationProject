import time
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.logging import get_logger

logger = get_logger("api.access")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        t0 = time.time()
        response = await call_next(request)
        duration = int((time.time() - t0) * 1000)
        logger.info(f"{request.method} {request.url.path} → {response.status_code} ({duration}ms)")
        return response
