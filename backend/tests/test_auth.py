import pytest
from app.services.auth_service import AuthService


class TestRegister:
    @pytest.mark.asyncio
    async def test_register_success(self, async_client):
        payload = {
            "email": "newuser@example.com",
            "username": "newuser",
            "password": "StrongPass1",
            "full_name": "New User",
            "phone": "1234567890",
            "ward_number": 3,
            "village": "TestVillage",
            "district": "TestDistrict",
            "state": "TestState",
        }
        response = await async_client.post("/api/auth/register", json=payload)
        assert response.status_code == 201
        data = response.json()
        assert data["user"]["email"] == "newuser@example.com"
        assert data["user"]["username"] == "newuser"
        assert data["user"]["role"] == "citizen"
        assert "access_token" in data["tokens"]
        assert "refresh_token" in data["tokens"]

    @pytest.mark.asyncio
    async def test_register_duplicate_email(self, async_client, test_user):
        payload = {
            "email": "citizen@example.com",
            "username": "anotheruser",
            "password": "StrongPass1",
            "full_name": "Another User",
            "village": "TestVillage",
            "district": "TestDistrict",
            "state": "TestState",
        }
        response = await async_client.post("/api/auth/register", json=payload)
        assert response.status_code == 409

    @pytest.mark.asyncio
    async def test_register_duplicate_username(self, async_client, test_user):
        payload = {
            "email": "another@example.com",
            "username": "testcitizen",
            "password": "StrongPass1",
            "full_name": "Another User",
            "village": "TestVillage",
            "district": "TestDistrict",
            "state": "TestState",
        }
        response = await async_client.post("/api/auth/register", json=payload)
        assert response.status_code == 409

    @pytest.mark.asyncio
    async def test_register_weak_password(self, async_client):
        payload = {
            "email": "weak@example.com",
            "username": "weakuser",
            "password": "short",
            "full_name": "Weak User",
            "village": "TestVillage",
            "district": "TestDistrict",
            "state": "TestState",
        }
        response = await async_client.post("/api/auth/register", json=payload)
        assert response.status_code == 422


class TestLogin:
    @pytest.mark.asyncio
    async def test_login_success(self, async_client, test_user):
        response = await async_client.post(
            "/api/auth/login",
            json={"username": "testcitizen", "password": "TestPass123"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    @pytest.mark.asyncio
    async def test_login_wrong_password(self, async_client, test_user):
        response = await async_client.post(
            "/api/auth/login",
            json={"username": "testcitizen", "password": "WrongPass123"},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_login_nonexistent_user(self, async_client):
        response = await async_client.post(
            "/api/auth/login",
            json={"username": "nobody", "password": "SomePass123"},
        )
        assert response.status_code == 401


class TestRefresh:
    @pytest.mark.asyncio
    async def test_refresh_token_success(self, async_client, test_user):
        login_resp = await async_client.post(
            "/api/auth/login",
            json={"username": "testcitizen", "password": "TestPass123"},
        )
        refresh_token = login_resp.json()["refresh_token"]
        response = await async_client.post(
            "/api/auth/refresh", json={"refresh_token": refresh_token}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data

    @pytest.mark.asyncio
    async def test_refresh_token_expired(self, async_client):
        expired = AuthService.create_access_token(
            data={"sub": 1}, expires_delta=__import__("datetime").timedelta(days=-1)
        )
        response = await async_client.post(
            "/api/auth/refresh", json={"refresh_token": expired}
        )
        assert response.status_code == 401


class TestMe:
    @pytest.mark.asyncio
    async def test_get_me_authenticated(self, async_client, auth_headers):
        response = await async_client.get("/api/auth/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "citizen@example.com"
        assert data["username"] == "testcitizen"

    @pytest.mark.asyncio
    async def test_get_me_unauthenticated(self, async_client):
        response = await async_client.get("/api/auth/me")
        assert response.status_code == 401


class TestChangePassword:
    @pytest.mark.asyncio
    async def test_change_password_success(self, async_client, auth_headers):
        response = await async_client.put(
            "/api/auth/change-password",
            json={"current_password": "TestPass123", "new_password": "NewStr0ngPass"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert response.json()["message"] == "Password changed successfully"
