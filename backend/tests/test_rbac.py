import pytest


def test_admin_can_access_users_list(client, admin_token):
    response = client.get(
        "/api/v1/users",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert data["total"] >= 1


def test_sales_user_forbidden_from_users_list(client, sales_token):
    response = client.get(
        "/api/v1/users",
        headers={"Authorization": f"Bearer {sales_token}"}
    )
    assert response.status_code == 403
    assert "Required roles: ADMIN" in response.json()["detail"]


def test_manager_forbidden_from_users_list(client, manager_token):
    response = client.get(
        "/api/v1/users",
        headers={"Authorization": f"Bearer {manager_token}"}
    )
    assert response.status_code == 403


def test_sales_user_can_access_customers(client, sales_token):
    response = client.get(
        "/api/v1/customers",
        headers={"Authorization": f"Bearer {sales_token}"}
    )
    assert response.status_code == 200


def test_manager_can_access_analytics(client, manager_token):
    response = client.get(
        "/api/v1/analytics/dashboard",
        headers={"Authorization": f"Bearer {manager_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "total_enquiries" in data
