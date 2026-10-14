import pytest


def test_create_and_filter_enquiry(client, sales_token, db_session):
    # Get a customer and category
    cust_res = client.get("/api/v1/customers?page=1&page_size=1", headers={"Authorization": f"Bearer {sales_token}"})
    customer_id = cust_res.json()["items"][0]["id"]

    cat_res = client.get("/api/v1/categories/all", headers={"Authorization": f"Bearer {sales_token}"})
    category_id = cat_res.json()[0]["id"]

    payload = {
        "customer_id": customer_id,
        "title": "Interested in Cake Board Making Machine",
        "product_interested": "Cake Board Making Machine",
        "description": "Custom die set and laminating unit requested for production line.",
        "category_id": category_id,
        "source": "WEBSITE",
        "priority": "HIGH",
        "status": "NEW",
        "estimated_value": 750000.0
    }
    response = client.post(
        "/api/v1/enquiries",
        json=payload,
        headers={"Authorization": f"Bearer {sales_token}"}
    )
    assert response.status_code == 201
    enquiry = response.json()
    assert enquiry["title"] == payload["title"]
    assert enquiry["estimated_value"] == 750000.0

    # Filter test
    filter_res = client.get(
        "/api/v1/enquiries?status=NEW&priority=HIGH",
        headers={"Authorization": f"Bearer {sales_token}"}
    )
    assert filter_res.status_code == 200
    assert filter_res.json()["total"] >= 1


def test_enquiry_status_change(client, sales_token):
    list_res = client.get("/api/v1/enquiries?page=1&page_size=1", headers={"Authorization": f"Bearer {sales_token}"})
    enquiry = list_res.json()["items"][0]

    status_res = client.patch(
        f"/api/v1/enquiries/{enquiry['id']}/status",
        json={"status": "IN_PROGRESS", "notes": "Engaged with client engineer"},
        headers={"Authorization": f"Bearer {sales_token}"}
    )
    assert status_res.status_code == 200
    assert status_res.json()["status"] == "IN_PROGRESS"
