import pytest


def test_create_classify_and_convert_email_lead(client, sales_token):
    lead_payload = {
        "sender_name": "Nilesh Shah",
        "sender_email": "nilesh.shah@apexpackaging.example.com",
        "subject": "Requirement for Paper Bag Making Machine",
        "body": "Please provide an official proforma invoice for automatic paper bag making machine.",
        "company": "Apex Packaging Works",
        "status": "NEW"
    }

    create_res = client.post(
        "/api/v1/email-leads",
        json=lead_payload,
        headers={"Authorization": f"Bearer {sales_token}"}
    )
    assert create_res.status_code == 201
    lead = create_res.json()
    assert lead["sender_email"] == lead_payload["sender_email"]

    # Classify
    update_res = client.put(
        f"/api/v1/email-leads/{lead['id']}",
        json={"status": "QUALIFIED"},
        headers={"Authorization": f"Bearer {sales_token}"}
    )
    assert update_res.status_code == 200
    assert update_res.json()["status"] == "QUALIFIED"

    # Convert with machinery CRM fields
    cat_res = client.get("/api/v1/categories/all", headers={"Authorization": f"Bearer {sales_token}"})
    cat_id = cat_res.json()[0]["id"]

    convert_res = client.post(
        f"/api/v1/email-leads/{lead['id']}/convert",
        json={
            "customer_name": "Nilesh Shah",
            "phone": "+91 98331 44556",
            "category_id": cat_id,
            "product_interested": "Paper Bag Making Machine",
            "estimated_value": 1400000.0,
            "notes": "Converted via test run"
        },
        headers={"Authorization": f"Bearer {sales_token}"}
    )
    assert convert_res.status_code == 200
    converted_lead = convert_res.json()
    assert converted_lead["status"] == "CONVERTED"
    assert converted_lead["customer_id"] is not None
    assert converted_lead["enquiry_id"] is not None
    assert converted_lead["category_id"] == cat_id

    # Verify category filtering on email leads
    filter_res = client.get(
        f"/api/v1/email-leads?category_id={cat_id}",
        headers={"Authorization": f"Bearer {sales_token}"}
    )
    assert filter_res.status_code == 200
    filtered_data = filter_res.json()
    assert filtered_data["total"] >= 1
    assert any(item["id"] == lead["id"] for item in filtered_data["items"])


def test_email_lead_timezone_and_ordering(client, sales_token):
    res = client.get("/api/v1/email-leads?page=1&page_size=10", headers={"Authorization": f"Bearer {sales_token}"})
    assert res.status_code == 200
    items = res.json()["items"]
    assert len(items) >= 2
    # Verify UTC 'Z' timezone representation
    for item in items:
        assert item["received_at"].endswith("Z") or "+00:00" in item["received_at"]
    # Verify descending chronological order
    for i in range(len(items) - 1):
        assert items[i]["received_at"] >= items[i + 1]["received_at"]

