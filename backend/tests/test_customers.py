import pytest


def test_create_customer_success(client, sales_token):
    payload = {
        "customer_name": "Rajesh Sharma",
        "company_name": "Shree Packaging Solutions Unit 2",
        "email": "rajesh.unit2@shreepackaging.example.com",
        "phone": "+91 9988776655",
        "city": "Mumbai",
        "state": "Maharashtra",
        "industry": "Packaging Machinery",
        "source": "WEBSITE",
        "notes": "Testing customer creation."
    }
    response = client.post(
        "/api/v1/customers",
        json=payload,
        headers={"Authorization": f"Bearer {sales_token}"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["customer_name"] == "Rajesh Sharma"
    assert data["company_name"] == "Shree Packaging Solutions Unit 2"
    assert "id" in data


def test_customer_validation_failure(client, sales_token):
    # Invalid email and missing phone
    payload = {
        "customer_name": "Invalid Customer",
        "company_name": "Invalid Corp",
        "email": "not-an-email",
        "phone": ""
    }
    response = client.post(
        "/api/v1/customers",
        json=payload,
        headers={"Authorization": f"Bearer {sales_token}"}
    )
    assert response.status_code == 422


def test_read_customer_detail(client, sales_token):
    list_res = client.get(
        "/api/v1/customers?page=1&page_size=1",
        headers={"Authorization": f"Bearer {sales_token}"}
    )
    assert list_res.status_code == 200
    first_cust = list_res.json()["items"][0]

    detail_res = client.get(
        f"/api/v1/customers/{first_cust['id']}",
        headers={"Authorization": f"Bearer {sales_token}"}
    )
    assert detail_res.status_code == 200
    data = detail_res.json()
    assert data["id"] == first_cust["id"]
    assert "enquiries" in data
    assert "follow_ups" in data


def test_update_customer(client, sales_token):
    list_res = client.get(
        "/api/v1/customers?page=1&page_size=1",
        headers={"Authorization": f"Bearer {sales_token}"}
    )
    first_cust = list_res.json()["items"][0]

    update_res = client.put(
        f"/api/v1/customers/{first_cust['id']}",
        json={"notes": "Updated notes via automated test"},
        headers={"Authorization": f"Bearer {sales_token}"}
    )
    assert update_res.status_code == 200
    assert update_res.json()["notes"] == "Updated notes via automated test"
