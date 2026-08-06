class SecurityHeadersMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def _send(event):
            if event["type"] == "http.response.start":
                headers = event.get("headers", [])
                security_headers = [
                    (b"X-Content-Type-Options", b"nosniff"),
                    (b"X-Frame-Options", b"DENY"),
                    (b"X-XSS-Protection", b"1; mode=block"),
                    (b"Strict-Transport-Security", b"max-age=31536000; includeSubDomains"),
                    (b"Content-Security-Policy", b"default-src 'self'"),
                    (b"Cache-Control", b"no-store"),
                    (b"Referrer-Policy", b"strict-origin-when-cross-origin"),
                    (b"Permissions-Policy", b"geolocation=(self)"),
                ]
                existing_header_names = {h[0].lower() for h in headers}
                for name, value in security_headers:
                    if name.lower() not in existing_header_names:
                        headers.append((name, value))
                event["headers"] = headers

            await send(event)

        await self.app(scope, receive, _send)
