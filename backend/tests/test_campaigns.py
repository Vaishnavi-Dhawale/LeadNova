import pytest
from unittest.mock import MagicMock
from app.models.campaign import Campaign, CampaignStatus
from app.models.email import EmailHistory


def test_get_campaigns_list(client, sales_token):
    res = client.get("/api/v1/campaigns", headers={"Authorization": f"Bearer {sales_token}"})
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert "total" in data
    assert isinstance(data["items"], list)
    if data["items"]:
        first = data["items"][0]
        assert "target_segment" in first
        assert "status" in first


def test_preview_recipients_all_customers(client, sales_token):
    res = client.get(
        "/api/v1/campaigns/preview-recipients?target_segment=All+Customers",
        headers={"Authorization": f"Bearer {sales_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["target_segment"] == "All Customers"
    assert "count" in data
    assert "recipients" in data
    assert isinstance(data["recipients"], list)


def test_preview_recipients_filtered(client, sales_token):
    res = client.get(
        "/api/v1/campaigns/preview-recipients?target_segment=Interested+Customers",
        headers={"Authorization": f"Bearer {sales_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert "count" in data
    assert isinstance(data["recipients"], list)


def test_create_update_and_cancel_campaign(client, sales_token, db_session):
    create_payload = {
        "name": "Temporary Test Campaign",
        "description": "Test description for campaign",
        "status": "DRAFT",
        "target_segment": "All Customers",
        "email_subject": "Test Subject",
        "email_body": "Test Body content for campaign",
    }
    create_res = client.post(
        "/api/v1/campaigns",
        json=create_payload,
        headers={"Authorization": f"Bearer {sales_token}"}
    )
    assert create_res.status_code == 201
    camp = create_res.json()
    camp_id = camp["id"]
    assert camp["name"] == create_payload["name"]
    assert camp["status"] == "DRAFT"

    # Update
    update_res = client.put(
        f"/api/v1/campaigns/{camp_id}",
        json={"name": "Temporary Test Campaign Updated"},
        headers={"Authorization": f"Bearer {sales_token}"}
    )
    assert update_res.status_code == 200
    assert update_res.json()["name"] == "Temporary Test Campaign Updated"

    # Cancel
    cancel_res = client.post(
        f"/api/v1/campaigns/{camp_id}/cancel",
        headers={"Authorization": f"Bearer {sales_token}"}
    )
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "CANCELLED"

    # Clean up test campaign
    c = db_session.query(Campaign).filter(Campaign.id == camp_id).first()
    if c:
        db_session.delete(c)
        db_session.commit()


def test_send_campaign_safe_mocked(client, sales_token, monkeypatch, db_session):
    """
    CRITICAL SAFETY TEST:
    Mocks `send_email_message` so that NO actual email, network call, or SMTP connection
    can be made, while verifying that the send endpoint executes properly.
    """
    mock_send = MagicMock()
    # Mock returns a dummy EmailHistory object without connecting to SMTP or Resend
    mock_history = EmailHistory(
        id=999999,
        sender="notifications@leadnova.com",
        recipient="mock@example.com",
        subject="Mock",
        body="Mock",
        status="SENT (MOCKED)"
    )
    mock_send.return_value = mock_history

    # Monkeypatch send_email_message in app.routers.campaigns
    monkeypatch.setattr("app.routers.campaigns.send_email_message", mock_send)

    # Create temporary draft campaign
    test_camp = Campaign(
        name="Mock Send Test Campaign",
        status=CampaignStatus.DRAFT,
        target_segment="All Customers",
        email_subject="Exclusive Safety Test",
        email_body="This is a test email body."
    )
    db_session.add(test_camp)
    db_session.commit()
    db_session.refresh(test_camp)
    camp_id = test_camp.id

    try:
        # Call the send endpoint
        send_res = client.post(
            f"/api/v1/campaigns/{camp_id}/send",
            headers={"Authorization": f"Bearer {sales_token}"}
        )
        assert send_res.status_code == 200
        data = send_res.json()
        assert "Campaign sent successfully" in data["message"]
        assert data["success_count"] > 0
        assert mock_send.call_count == data["recipient_count"]

        # Verify in DB
        db_session.refresh(test_camp)
        assert test_camp.status == CampaignStatus.SENT
        assert test_camp.sent_at is not None
        assert test_camp.recipient_count == data["recipient_count"]
    finally:
        # Clean up test campaign only
        c = db_session.query(Campaign).filter(Campaign.id == camp_id).first()
        if c:
            db_session.delete(c)
            db_session.commit()
