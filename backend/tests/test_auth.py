import pytest
from app.models.user import User, UserRole
from app.utils.security import get_password_hash


def test_valid_login(client):
    response = client.post("/api/v1/auth/login", json={
        "email": "admin@leadnova.com",
        "password": "Admin@12345"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["role"] == UserRole.ADMIN
    assert data["email"] == "admin@leadnova.com"


def test_invalid_login(client):
    response = client.post("/api/v1/auth/login", json={
        "email": "admin@leadnova.com",
        "password": "WrongPassword!999"
    })
    assert response.status_code == 401
    assert "Invalid email or password" in response.json()["detail"]


def test_inactive_user(client, db_session):
    # Create an inactive user for test
    inactive_email = "inactive_test_user@leadnova.com"
    existing = db_session.query(User).filter(User.email == inactive_email).first()
    if not existing:
        user = User(
            name="Inactive User",
            email=inactive_email,
            password_hash=get_password_hash("Test@12345"),
            role=UserRole.SALES_USER,
            is_active=False
        )
        db_session.add(user)
        db_session.commit()

    response = client.post("/api/v1/auth/login", json={
        "email": inactive_email,
        "password": "Test@12345"
    })
    assert response.status_code == 403
    assert "deactivated" in response.json()["detail"]


def test_protected_endpoint_without_token(client):
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401


def test_invalid_token(client):
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer invalid.fake.token"}
    )
    assert response.status_code == 401
