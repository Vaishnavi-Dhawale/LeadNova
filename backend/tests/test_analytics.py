import pytest


def test_dashboard_metrics_aggregation(client, sales_token):
    res = client.get("/api/v1/analytics/dashboard", headers={"Authorization": f"Bearer {sales_token}"})
    assert res.status_code == 200
    data = res.json()

    assert "total_enquiries" in data
    assert data["total_enquiries"] >= 1
    assert "active_customers" in data
    assert "enquiry_status_distribution" in data
    assert "category_distribution" in data
    assert "monthly_enquiry_trend" in data
    assert "lead_sources" in data
    assert "sales_user_performance" in data
    assert "territory_performance" in data


def test_analytics_report_filtering(client, manager_token):
    res = client.get(
        "/api/v1/analytics/report?status=CONVERTED",
        headers={"Authorization": f"Bearer {manager_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert "total_enquiries" in data
    assert "conversion_rate" in data
    assert "category_wise" in data
    assert "territory_wise" in data
