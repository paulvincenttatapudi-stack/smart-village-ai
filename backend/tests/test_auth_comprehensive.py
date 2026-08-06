"""
Comprehensive Authentication System E2E Tests
Covers: Registration, Login, Session, JWT, Refresh Tokens, Security Edge Cases
"""
import pytest
import asyncio
from datetime import datetime, timedelta, timezone

from app.services.auth_service import AuthService
from app.models.user import User
from app.models.audit import RefreshToken
from tests.conftest import test_async_session_factory


# ============================================================
# 1. REGISTRATION TESTS
# ============================================================

class TestRegistrationValid:
    """Valid registration scenarios."""

    @pytest.mark.asyncio
    async def test_register_minimal_fields(self, async_client):
        payload = {
            "email": "minimal@example.com",
            "username": "minimaluser",
            "password": "Minimal1Pass",
            "full_name": "Minimal User",
        }
        resp = await async_client.post("/api/auth/register", json=payload)
        assert resp.status_code == 201
        data = resp.json()
        assert data["user"]["email"] == "minimal@example.com"
        assert data["user"]["username"] == "minimaluser"
        assert data["user"]["role"] == "citizen"
        assert data["user"]["is_active"] is True
        assert data["user"]["is_verified"] is False
        assert "id" in data["user"]
        assert "access_token" in data["tokens"]
        assert "refresh_token" in data["tokens"]
        assert data["tokens"]["token_type"] == "bearer"

    @pytest.mark.asyncio
    async def test_register_all_fields(self, async_client):
        payload = {
            "email": "full@example.com",
            "username": "fulluser",
            "password": "FullUser1Pass",
            "full_name": "Full User",
            "phone": "+919876543210",
            "ward_number": 7,
            "village": "Rampur",
            "district": "Jaipur",
            "state": "Rajasthan",
        }
        resp = await async_client.post("/api/auth/register", json=payload)
        assert resp.status_code == 201
        data = resp.json()
        assert data["user"]["phone"] == "+919876543210"
        assert data["user"]["ward_number"] == 7
        assert data["user"]["village"] == "Rampur"
        assert data["user"]["district"] == "Jaipur"
        assert data["user"]["state"] == "Rajasthan"

    @pytest.mark.asyncio
    async def test_register_returns_valid_jwt(self, async_client):
        payload = {
            "email": "jwt@example.com",
            "username": "jwtuser",
            "password": "JwtTest1Pass",
            "full_name": "JWT User",
        }
        resp = await async_client.post("/api/auth/register", json=payload)
        assert resp.status_code == 201
        token = resp.json()["tokens"]["access_token"]
        payload_decoded = AuthService.decode_token(token)
        assert "sub" in payload_decoded
        assert "exp" in payload_decoded
        assert int(payload_decoded["sub"]) > 0

    @pytest.mark.asyncio
    async def test_register_user_id_matches_me_endpoint(self, async_client):
        payload = {
            "email": "matchid@example.com",
            "username": "matchiduser",
            "password": "MatchId1Pass",
            "full_name": "Match ID User",
        }
        resp = await async_client.post("/api/auth/register", json=payload)
        assert resp.status_code == 201
        token = resp.json()["tokens"]["access_token"]
        user_id = resp.json()["user"]["id"]
        me_resp = await async_client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me_resp.status_code == 200
        assert me_resp.json()["id"] == user_id


class TestRegistrationDuplicate:
    """Duplicate email/username rejection."""

    @pytest.mark.asyncio
    async def test_duplicate_email_rejected(self, async_client, test_user):
        payload = {
            "email": "citizen@example.com",
            "username": "uniqueuser1",
            "password": "Unique1Pass",
            "full_name": "Unique User",
        }
        resp = await async_client.post("/api/auth/register", json=payload)
        assert resp.status_code == 409
        assert "already registered" in resp.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_duplicate_username_rejected(self, async_client, test_user):
        payload = {
            "email": "newunique@example.com",
            "username": "testcitizen",
            "password": "Unique1Pass",
            "full_name": "Unique User",
        }
        resp = await async_client.post("/api/auth/register", json=payload)
        assert resp.status_code == 409
        assert "already registered" in resp.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_same_email_different_username_rejected(self, async_client, test_user):
        payload = {
            "email": "citizen@example.com",
            "username": "differentusername",
            "password": "Unique1Pass",
            "full_name": "Different Username",
        }
        resp = await async_client.post("/api/auth/register", json=payload)
        assert resp.status_code == 409

    @pytest.mark.asyncio
    async def test_same_username_different_email_rejected(self, async_client, test_user):
        payload = {
            "email": "totallydifferent@example.com",
            "username": "testcitizen",
            "password": "Unique1Pass",
            "full_name": "Different Email",
        }
        resp = await async_client.post("/api/auth/register", json=payload)
        assert resp.status_code == 409


class TestRegistrationPasswordValidation:
    """Password strength validation."""

    @pytest.mark.asyncio
    async def test_password_too_short(self, async_client):
        payload = {
            "email": "short@example.com",
            "username": "shortpass",
            "password": "Ab1",
            "full_name": "Short Pass",
        }
        resp = await async_client.post("/api/auth/register", json=payload)
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_password_no_uppercase(self, async_client):
        payload = {
            "email": "noupper@example.com",
            "username": "noupper",
            "password": "nouppercase1",
            "full_name": "No Upper",
        }
        resp = await async_client.post("/api/auth/register", json=payload)
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_password_no_digit(self, async_client):
        payload = {
            "email": "nodigit@example.com",
            "username": "nodigit",
            "password": "NoDigitHere",
            "full_name": "No Digit",
        }
        resp = await async_client.post("/api/auth/register", json=payload)
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_password_exactly_8_chars_valid(self, async_client):
        payload = {
            "email": "exact8@example.com",
            "username": "exact8char",
            "password": "Exact1Pa",
            "full_name": "Exact 8",
        }
        resp = await async_client.post("/api/auth/register", json=payload)
        assert resp.status_code == 201

    @pytest.mark.asyncio
    async def test_password_7_chars_rejected(self, async_client):
        payload = {
            "email": "seven@example.com",
            "username": "sevenchar",
            "password": "Seven1P",
            "full_name": "Seven Chars",
        }
        resp = await async_client.post("/api/auth/register", json=payload)
        assert resp.status_code == 422


class TestRegistrationInvalidEmail:
    """Invalid email validation."""

    @pytest.mark.asyncio
    async def test_invalid_email_no_at(self, async_client):
        payload = {
            "email": "noatsign.com",
            "username": "noatuser",
            "password": "Valid1Pass",
            "full_name": "No At",
        }
        resp = await async_client.post("/api/auth/register", json=payload)
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_invalid_email_no_domain(self, async_client):
        payload = {
            "email": "user@",
            "username": "nodomain",
            "password": "Valid1Pass",
            "full_name": "No Domain",
        }
        resp = await async_client.post("/api/auth/register", json=payload)
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_invalid_email_empty(self, async_client):
        payload = {
            "email": "",
            "username": "emptyemail",
            "password": "Valid1Pass",
            "full_name": "Empty Email",
        }
        resp = await async_client.post("/api/auth/register", json=payload)
        assert resp.status_code == 422


class TestRegistrationMissingFields:
    """Missing required fields."""

    @pytest.mark.asyncio
    async def test_missing_email(self, async_client):
        payload = {
            "username": "noemail",
            "password": "Valid1Pass",
            "full_name": "No Email",
        }
        resp = await async_client.post("/api/auth/register", json=payload)
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_missing_username(self, async_client):
        payload = {
            "email": "nousername@example.com",
            "password": "Valid1Pass",
            "full_name": "No Username",
        }
        resp = await async_client.post("/api/auth/register", json=payload)
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_missing_password(self, async_client):
        payload = {
            "email": "nopassword@example.com",
            "username": "nopassword",
            "full_name": "No Password",
        }
        resp = await async_client.post("/api/auth/register", json=payload)
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_missing_full_name(self, async_client):
        payload = {
            "email": "noname@example.com",
            "username": "noname",
            "password": "Valid1Pass",
        }
        resp = await async_client.post("/api/auth/register", json=payload)
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_empty_body(self, async_client):
        resp = await async_client.post("/api/auth/register", json={})
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_username_too_short(self, async_client):
        payload = {
            "email": "shortuname@example.com",
            "username": "ab",
            "password": "Valid1Pass",
            "full_name": "Short Username",
        }
        resp = await async_client.post("/api/auth/register", json=payload)
        assert resp.status_code == 422


# ============================================================
# 2. LOGIN TESTS
# ============================================================

class TestAdminLogin:
    """Admin login flow."""

    @pytest.mark.asyncio
    async def test_admin_login_with_username(self, async_client, test_admin):
        resp = await async_client.post(
            "/api/auth/login",
            json={"username": "testadmin", "password": "AdminPass123"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    @pytest.mark.asyncio
    async def test_admin_login_with_email(self, async_client, test_admin):
        resp = await async_client.post(
            "/api/auth/login",
            json={"username": "admin@example.com", "password": "AdminPass123"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data

    @pytest.mark.asyncio
    async def test_admin_me_returns_admin_role(self, async_client, test_admin):
        login_resp = await async_client.post(
            "/api/auth/login",
            json={"username": "testadmin", "password": "AdminPass123"},
        )
        token = login_resp.json()["access_token"]
        me_resp = await async_client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me_resp.status_code == 200
        assert me_resp.json()["role"] == "admin"


class TestCitizenLogin:
    """Citizen login flow."""

    @pytest.mark.asyncio
    async def test_citizen_login_with_username(self, async_client, test_user):
        resp = await async_client.post(
            "/api/auth/login",
            json={"username": "testcitizen", "password": "TestPass123"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert "refresh_token" in data

    @pytest.mark.asyncio
    async def test_citizen_login_with_email(self, async_client, test_user):
        resp = await async_client.post(
            "/api/auth/login",
            json={"username": "citizen@example.com", "password": "TestPass123"},
        )
        assert resp.status_code == 200
        assert "access_token" in resp.json()

    @pytest.mark.asyncio
    async def test_citizen_me_returns_citizen_role(self, async_client, test_user):
        login_resp = await async_client.post(
            "/api/auth/login",
            json={"username": "testcitizen", "password": "TestPass123"},
        )
        token = login_resp.json()["access_token"]
        me_resp = await async_client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me_resp.status_code == 200
        assert me_resp.json()["role"] == "citizen"


class TestLoginInvalidCredentials:
    """Invalid credentials."""

    @pytest.mark.asyncio
    async def test_wrong_password(self, async_client, test_user):
        resp = await async_client.post(
            "/api/auth/login",
            json={"username": "testcitizen", "password": "WrongPassword1"},
        )
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_nonexistent_username(self, async_client):
        resp = await async_client.post(
            "/api/auth/login",
            json={"username": "doesnotexist", "password": "SomePass1"},
        )
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_empty_username(self, async_client, test_user):
        resp = await async_client.post(
            "/api/auth/login",
            json={"username": "", "password": "TestPass123"},
        )
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_empty_password(self, async_client, test_user):
        resp = await async_client.post(
            "/api/auth/login",
            json={"username": "testcitizen", "password": ""},
        )
        assert resp.status_code == 422


class TestJWTGeneration:
    """JWT token properties."""

    @pytest.mark.asyncio
    async def test_access_token_has_sub(self, async_client, test_user):
        resp = await async_client.post(
            "/api/auth/login",
            json={"username": "testcitizen", "password": "TestPass123"},
        )
        token = resp.json()["access_token"]
        decoded = AuthService.decode_token(token)
        assert "sub" in decoded
        assert str(test_user.id) == decoded["sub"]

    @pytest.mark.asyncio
    async def test_refresh_token_has_jti(self, async_client, test_user):
        resp = await async_client.post(
            "/api/auth/login",
            json={"username": "testcitizen", "password": "TestPass123"},
        )
        token = resp.json()["refresh_token"]
        decoded = AuthService.decode_token(token)
        assert "jti" in decoded

    @pytest.mark.asyncio
    async def test_access_token_expires(self, async_client, test_user):
        resp = await async_client.post(
            "/api/auth/login",
            json={"username": "testcitizen", "password": "TestPass123"},
        )
        token = resp.json()["access_token"]
        decoded = AuthService.decode_token(token)
        exp = datetime.fromtimestamp(decoded["exp"], tz=timezone.utc)
        now = datetime.now(timezone.utc)
        assert exp > now
        assert exp < now + timedelta(hours=2)

    @pytest.mark.asyncio
    async def test_refresh_token_longer_expiry(self, async_client, test_user):
        resp = await async_client.post(
            "/api/auth/login",
            json={"username": "testcitizen", "password": "TestPass123"},
        )
        access = AuthService.decode_token(resp.json()["access_token"])
        refresh = AuthService.decode_token(resp.json()["refresh_token"])
        assert refresh["exp"] > access["exp"]

    @pytest.mark.asyncio
    async def test_different_tokens_different_jti(self, async_client, test_user):
        resp1 = await async_client.post(
            "/api/auth/login",
            json={"username": "testcitizen", "password": "TestPass123"},
        )
        resp2 = await async_client.post(
            "/api/auth/login",
            json={"username": "testcitizen", "password": "TestPass123"},
        )
        jti1 = AuthService.decode_token(resp1.json()["refresh_token"])["jti"]
        jti2 = AuthService.decode_token(resp2.json()["refresh_token"])["jti"]
        assert jti1 != jti2

    @pytest.mark.asyncio
    async def test_tampered_token_rejected(self, async_client, test_user):
        resp = await async_client.post(
            "/api/auth/login",
            json={"username": "testcitizen", "password": "TestPass123"},
        )
        token = resp.json()["access_token"]
        tampered = token[:-5] + "XXXXX"
        me_resp = await async_client.get("/api/auth/me", headers={"Authorization": f"Bearer {tampered}"})
        assert me_resp.status_code == 401


class TestRefreshToken:
    """Refresh token flow."""

    @pytest.mark.asyncio
    async def test_refresh_returns_new_tokens(self, async_client, test_user):
        login_resp = await async_client.post(
            "/api/auth/login",
            json={"username": "testcitizen", "password": "TestPass123"},
        )
        refresh = login_resp.json()["refresh_token"]
        resp = await async_client.post("/api/auth/refresh", json={"refresh_token": refresh})
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert "refresh_token" in data

    @pytest.mark.asyncio
    async def test_refresh_token_is_rotated(self, async_client, test_user):
        login_resp = await async_client.post(
            "/api/auth/login",
            json={"username": "testcitizen", "password": "TestPass123"},
        )
        old_refresh = login_resp.json()["refresh_token"]
        resp = await async_client.post("/api/auth/refresh", json={"refresh_token": old_refresh})
        new_refresh = resp.json()["refresh_token"]
        assert old_refresh != new_refresh

    @pytest.mark.asyncio
    async def test_old_refresh_token_invalid_after_rotation(self, async_client, test_user):
        login_resp = await async_client.post(
            "/api/auth/login",
            json={"username": "testcitizen", "password": "TestPass123"},
        )
        old_refresh = login_resp.json()["refresh_token"]
        await async_client.post("/api/auth/refresh", json={"refresh_token": old_refresh})
        resp = await async_client.post("/api/auth/refresh", json={"refresh_token": old_refresh})
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_refresh_with_invalid_token(self, async_client):
        resp = await async_client.post(
            "/api/auth/refresh", json={"refresh_token": "completely.invalid.token"}
        )
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_refresh_with_access_token_fails(self, async_client, test_user):
        login_resp = await async_client.post(
            "/api/auth/login",
            json={"username": "testcitizen", "password": "TestPass123"},
        )
        access = login_resp.json()["access_token"]
        resp = await async_client.post("/api/auth/refresh", json={"refresh_token": access})
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_new_access_token_works(self, async_client, test_user):
        login_resp = await async_client.post(
            "/api/auth/login",
            json={"username": "testcitizen", "password": "TestPass123"},
        )
        refresh = login_resp.json()["refresh_token"]
        refresh_resp = await async_client.post("/api/auth/refresh", json={"refresh_token": refresh})
        new_token = refresh_resp.json()["access_token"]
        me_resp = await async_client.get("/api/auth/me", headers={"Authorization": f"Bearer {new_token}"})
        assert me_resp.status_code == 200
        assert me_resp.json()["id"] == test_user.id


class TestLogout:
    """Logout behavior."""

    @pytest.mark.asyncio
    async def test_logout_revokes_refresh_token(self, async_client, test_user, auth_headers):
        login_resp = await async_client.post(
            "/api/auth/login",
            json={"username": "testcitizen", "password": "TestPass123"},
        )
        refresh_token = login_resp.json()["refresh_token"]
        resp = await async_client.post("/api/auth/logout", json={"refresh_token": refresh_token}, headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["message"] == "Logged out successfully"
        refresh_resp = await async_client.post("/api/auth/refresh", json={"refresh_token": refresh_token})
        assert refresh_resp.status_code == 401

    @pytest.mark.asyncio
    async def test_logout_without_body_returns_401(self, async_client):
        resp = await async_client.post("/api/auth/logout")
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_access_token_still_valid_after_frontend_logout(self, async_client, auth_headers):
        """After 'logout' (frontend clears localStorage), the access token is still valid server-side.
        Only the refresh token is revoked."""
        resp = await async_client.get("/api/auth/me", headers=auth_headers)
        assert resp.status_code == 200


# ============================================================
# 3. SESSION TESTS
# ============================================================

class TestProtectedRoutes:
    """Protected route access control."""

    @pytest.mark.asyncio
    async def test_me_requires_auth(self, async_client):
        resp = await async_client.get("/api/auth/me")
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_admin_users_requires_admin(self, async_client, auth_headers):
        resp = await async_client.get("/api/admin/users", headers=auth_headers)
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_admin_complaints_requires_admin(self, async_client, auth_headers):
        resp = await async_client.get("/api/admin/complaints", headers=auth_headers)
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_admin_stats_requires_admin(self, async_client, auth_headers):
        resp = await async_client.get("/api/admin/stats", headers=auth_headers)
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_admin_accessible_by_admin(self, async_client, admin_headers):
        resp = await async_client.get("/api/admin/users", headers=admin_headers)
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_change_password_requires_auth(self, async_client):
        resp = await async_client.put(
            "/api/auth/change-password",
            json={"current_password": "Old1Pass", "new_password": "New1PassWord"},
        )
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_complaints_list_requires_auth(self, async_client):
        resp = await async_client.get("/api/complaints")
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_notifications_requires_auth(self, async_client):
        resp = await async_client.get("/api/notifications")
        assert resp.status_code == 401


class TestTokenExpiration:
    """Token expiration handling."""

    @pytest.mark.asyncio
    async def test_expired_access_token_rejected(self, async_client, test_user):
        expired = AuthService.create_access_token(
            data={"sub": test_user.id}, expires_delta=timedelta(days=-1)
        )
        resp = await async_client.get("/api/auth/me", headers={"Authorization": f"Bearer {expired}"})
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_expired_refresh_token_rejected(self, async_client, test_user):
        expired = AuthService.create_refresh_token(
            data={"sub": test_user.id}, expires_delta=timedelta(days=-1)
        )
        resp = await async_client.post("/api/auth/refresh", json={"refresh_token": expired})
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_garbage_token_rejected(self, async_client):
        resp = await async_client.get("/api/auth/me", headers={"Authorization": "Bearer garbage"})
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_empty_bearer_token_rejected(self, async_client):
        resp = await async_client.get("/api/auth/me", headers={"Authorization": "Bearer "})
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_no_bearer_prefix_rejected(self, async_client, test_user):
        resp = await async_client.get("/api/auth/me", headers={"Authorization": "Token stuff"})
        assert resp.status_code in (401, 403)


class TestUnauthorizedAccess:
    """Various unauthorized access patterns."""

    @pytest.mark.asyncio
    async def test_bogus_header_rejected(self, async_client):
        resp = await async_client.get("/api/auth/me", headers={"Authorization": "Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI5OTk5In0.invalid"})
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_admin_endpoint_with_citizen_token(self, async_client, auth_headers):
        resp = await async_client.get("/api/admin/users", headers=auth_headers)
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_anonymous_complaint_creation_rejected(self, async_client):
        resp = await async_client.post(
            "/api/complaints",
            data={
                "title": "Anonymous complaint test",
                "description": "This should fail without auth",
                "address": "123 Test St",
                "ward_number": "1",
                "village": "TestVillage",
                "district": "TestDistrict",
            },
        )
        assert resp.status_code == 401


# ============================================================
# 4. PASSWORD CHANGE TESTS
# ============================================================

class TestChangePassword:
    """Password change scenarios."""

    @pytest.mark.asyncio
    async def test_change_password_success(self, async_client, test_user):
        resp = await async_client.put(
            "/api/auth/change-password",
            json={"current_password": "TestPass123", "new_password": "NewStr0ngPass"},
            headers=await _get_headers(async_client, "testcitizen", "TestPass123"),
        )
        assert resp.status_code == 200
        assert resp.json()["message"] == "Password changed successfully"

    @pytest.mark.asyncio
    async def test_change_password_then_login_with_new(self, async_client, test_user):
        headers = await _get_headers(async_client, "testcitizen", "TestPass123")
        await async_client.put(
            "/api/auth/change-password",
            json={"current_password": "TestPass123", "new_password": "NewStr0ngPass"},
            headers=headers,
        )
        resp = await async_client.post(
            "/api/auth/login",
            json={"username": "testcitizen", "password": "NewStr0ngPass"},
        )
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_change_password_old_password_fails(self, async_client, test_user):
        resp = await async_client.put(
            "/api/auth/change-password",
            json={"current_password": "WrongPass123", "new_password": "NewStr0ngPass"},
            headers=await _get_headers(async_client, "testcitizen", "TestPass123"),
        )
        assert resp.status_code == 400

    @pytest.mark.asyncio
    async def test_login_with_old_password_after_change_fails(self, async_client, test_user):
        headers = await _get_headers(async_client, "testcitizen", "TestPass123")
        await async_client.put(
            "/api/auth/change-password",
            json={"current_password": "TestPass123", "new_password": "NewStr0ngPass"},
            headers=headers,
        )
        resp = await async_client.post(
            "/api/auth/login",
            json={"username": "testcitizen", "password": "TestPass123"},
        )
        assert resp.status_code == 401


# ============================================================
# 5. DATABASE PERSISTENCE TESTS
# ============================================================

class TestDatabasePersistence:
    """Verify data is persisted in the database."""

    @pytest.mark.asyncio
    async def test_user_persisted_in_db(self, async_client):
        payload = {
            "email": "persist@example.com",
            "username": "persistuser",
            "password": "Persist1Pass",
            "full_name": "Persist User",
        }
        resp = await async_client.post("/api/auth/register", json=payload)
        assert resp.status_code == 201
        async with test_async_session_factory() as db:
            from sqlalchemy import select
            result = await db.execute(select(User).where(User.email == "persist@example.com"))
            user = result.scalar_one_or_none()
            assert user is not None
            assert user.username == "persistuser"
            assert user.role == "citizen"
            assert user.is_active is True

    @pytest.mark.asyncio
    async def test_refresh_token_persisted_in_db(self, async_client, test_user):
        resp = await async_client.post(
            "/api/auth/login",
            json={"username": "testcitizen", "password": "TestPass123"},
        )
        token = resp.json()["refresh_token"]
        async with test_async_session_factory() as db:
            from sqlalchemy import select
            result = await db.execute(select(RefreshToken).where(RefreshToken.token == token))
            stored = result.scalar_one_or_none()
            assert stored is not None
            assert stored.user_id == test_user.id

    @pytest.mark.asyncio
    async def test_refresh_token_rotation_updates_db(self, async_client, test_user):
        login_resp = await async_client.post(
            "/api/auth/login",
            json={"username": "testcitizen", "password": "TestPass123"},
        )
        old_token = login_resp.json()["refresh_token"]
        refresh_resp = await async_client.post("/api/auth/refresh", json={"refresh_token": old_token})
        new_token = refresh_resp.json()["refresh_token"]
        async with test_async_session_factory() as db:
            from sqlalchemy import select
            old_result = await db.execute(select(RefreshToken).where(RefreshToken.token == old_token))
            old_record = old_result.scalar_one_or_none()
            assert old_record is not None
            assert old_record.is_revoked is True
            new_result = await db.execute(select(RefreshToken).where(RefreshToken.token == new_token))
            new_record = new_result.scalar_one_or_none()
            assert new_record is not None
            assert new_record.is_revoked is False

    @pytest.mark.asyncio
    async def test_multiple_users_coexist(self, async_client):
        for i in range(3):
            resp = await async_client.post(
                "/api/auth/register",
                json={
                    "email": f"multi{i}@example.com",
                    "username": f"multiuser{i}",
                    "password": "Multi1Pass",
                    "full_name": f"Multi User {i}",
                },
            )
            assert resp.status_code == 201
        async with test_async_session_factory() as db:
            from sqlalchemy import select, func
            count = await db.scalar(select(func.count(User.id)))
            assert count >= 3


# ============================================================
# HELPER
# ============================================================

async def _get_headers(client, username: str, password: str) -> dict:
    resp = await client.post(
        "/api/auth/login",
        json={"username": username, "password": password},
    )
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}
