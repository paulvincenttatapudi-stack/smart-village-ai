import time
import traceback

from loguru import logger


class LoggingMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        start_time = time.time()

        async def _send(event):
            if event["type"] == "http.response.start":
                status_code = event["status"]
                processing_time_ms = round((time.time() - start_time) * 1000, 2)
                client_ip = scope.get("client", ("unknown", 0))[0]
                headers = dict(scope.get("headers", []))
                user_agent = headers.get(b"user-agent", b"unknown").decode("utf-8", errors="replace")
                method = scope.get("method", "UNKNOWN")
                path = scope.get("path", "/")

                logger.bind(
                    method=method,
                    path=path,
                    status_code=status_code,
                    processing_time_ms=processing_time_ms,
                    client_ip=client_ip,
                    user_agent=user_agent,
                ).info("HTTP request completed")

            await send(event)

        try:
            await self.app(scope, receive, _send)
        except Exception:
            processing_time_ms = round((time.time() - start_time) * 1000, 2)
            client_ip = scope.get("client", ("unknown", 0))[0]
            method = scope.get("method", "UNKNOWN")
            path = scope.get("path", "/")
            logger.bind(
                method=method,
                path=path,
                status_code=500,
                processing_time_ms=processing_time_ms,
                client_ip=client_ip,
                user_agent="unknown",
            ).error("HTTP request failed")
            logger.error(traceback.format_exc())
            raise
