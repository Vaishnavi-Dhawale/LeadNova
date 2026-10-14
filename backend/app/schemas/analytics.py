from datetime import datetime, date
from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class DashboardStatsResponse(BaseModel):
    total_enquiries: int
    new_leads: int
    in_progress: int
    converted: int
    lost: int
    pending_follow_ups: int
    overdue_follow_ups: int
    active_customers: int
    email_leads: int
    active_sales_users: int
    new_email_leads: int = 0
    high_priority_enquiries: int = 0

    # Charts data
    enquiry_status_distribution: List[Dict[str, Any]]
    category_distribution: List[Dict[str, Any]]
    monthly_enquiry_trend: List[Dict[str, Any]]
    lead_sources: List[Dict[str, Any]]
    sales_user_performance: List[Dict[str, Any]]
    territory_performance: List[Dict[str, Any]]


class AnalyticsFilter(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    sales_user_id: Optional[int] = None
    territory_id: Optional[int] = None
    category_id: Optional[int] = None
    status: Optional[str] = None
    source: Optional[str] = None


class AnalyticsMetricsResponse(BaseModel):
    total_enquiries: int
    converted: int
    lost: int
    pending: int
    conversion_rate: float
    total_pipeline_value: float
    converted_pipeline_value: float

    # Breakdowns
    category_wise: List[Dict[str, Any]]
    source_wise: List[Dict[str, Any]]
    territory_wise: List[Dict[str, Any]]
    sales_user_wise: List[Dict[str, Any]]
    monthly_trends: List[Dict[str, Any]]
    status_wise: List[Dict[str, Any]]
