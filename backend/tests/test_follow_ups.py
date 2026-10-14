from datetime import datetime, timedelta
import pytest


def test_create_and_complete_follow_up(client, sales_token):
    cust_res = client.get("/api/v1/customers?page=1&page_size=1", headers={"Authorization": f"Bearer {sales_token}"})
    customer_id = cust_res.json()["items"][0]["id"]

    follow_up_time = (datetime.utcnow() + timedelta(days=3)).isoformat()
    payload = {
        "customer_id": customer_id,
        "follow_up_date": follow_up_time,
        "follow_up_type": "CALL",
        "notes": "Follow up on quotation feedback",
        "status": "PENDING"
    }

    create_res = client.post(
        "/api/v1/follow-ups",
        json=payload,
        headers={"Authorization": f"Bearer {sales_token}"}
    )
    assert create_res.status_code == 201
    fu = create_res.json()
    assert fu["status"] == "PENDING"

    # Complete it
    complete_res = client.patch(
        f"/api/v1/follow-ups/{fu['id']}/complete",
        headers={"Authorization": f"Bearer {sales_token}"}
    )
    assert complete_res.status_code == 200
    assert complete_res.json()["status"] == "COMPLETED"


def test_overdue_follow_up_filter(client, sales_token):
    res = client.get(
        "/api/v1/follow-ups?filter_preset=overdue",
        headers={"Authorization": f"Bearer {sales_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
