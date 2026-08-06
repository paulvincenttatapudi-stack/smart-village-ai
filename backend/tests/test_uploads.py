import pytest


class TestUploadImage:
    @pytest.mark.asyncio
    async def test_upload_image(self, async_client, auth_headers):
        response = await async_client.post(
            "/api/upload/image",
            files={"file": ("test.png", b"\x89PNG\r\n\x1a\n" + b"fake-png-content", "image/png")},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert "url" in data

    @pytest.mark.asyncio
    async def test_upload_invalid_extension(self, async_client, auth_headers):
        response = await async_client.post(
            "/api/upload/image",
            files={"file": ("test.txt", b"fake-content", "text/plain")},
            headers=auth_headers,
        )
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_upload_file_too_large(self, async_client, auth_headers):
        from app.config import get_settings

        settings = get_settings()
        original = settings.MAX_UPLOAD_SIZE_MB
        settings.MAX_UPLOAD_SIZE_MB = 0
        try:
            response = await async_client.post(
                "/api/upload/image",
                files={"file": ("test.png", b"\x89PNG\r\n\x1a\n" + b"fake-png-content", "image/png")},
                headers=auth_headers,
            )
            assert response.status_code == 413
        finally:
            settings.MAX_UPLOAD_SIZE_MB = original
