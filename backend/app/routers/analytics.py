from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case, extract
from app.database import get_db
from app.models.enquiry import Enquiry, EnquiryStatus, EnquiryPriority
from app.models.customer import Customer
from app.models.follow_up import FollowUp, FollowUpStatus
from app.models.email_lead import EmailLead, EmailLeadStatus
from app.models.category import Category
from app.models.territory import Territory
from app.models.user import User, UserRole
from app.schemas.analytics import DashboardStatsResponse, AnalyticsMetricsResponse
from app.utils.deps import require_any_authenticated

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/dashboard", response_model=DashboardStatsResponse)
def get_dashboard_metrics(
    current_user: User = Depends(require_any_authenticated),
    db: Session = Depends(get_db)
):
    now = datetime.utcnow()

    # Stat cards queries
    total_enquiries = db.query(func.count(Enquiry.id)).scalar() or 0
    new_leads = db.query(func.count(Enquiry.id)).filter(Enquiry.status == EnquiryStatus.NEW).scalar() or 0
    in_progress = db.query(func.count(Enquiry.id)).filter(Enquiry.status == EnquiryStatus.IN_PROGRESS).scalar() or 0
    converted = db.query(func.count(Enquiry.id)).filter(Enquiry.status == EnquiryStatus.CONVERTED).scalar() or 0
    lost = db.query(func.count(Enquiry.id)).filter(Enquiry.status == EnquiryStatus.LOST).scalar() or 0

    pending_follow_ups = db.query(func.count(FollowUp.id)).filter(
        FollowUp.status == FollowUpStatus.PENDING
    ).scalar() or 0

    overdue_follow_ups = db.query(func.count(FollowUp.id)).filter(
        FollowUp.status == FollowUpStatus.PENDING,
        FollowUp.follow_up_date < now
    ).scalar() or 0

    active_customers = db.query(func.count(Customer.id)).scalar() or 0
    email_leads = db.query(func.count(EmailLead.id)).scalar() or 0
    new_email_leads = db.query(func.count(EmailLead.id)).filter(
        EmailLead.status == EmailLeadStatus.NEW
    ).scalar() or 0
    high_priority_enquiries = db.query(func.count(Enquiry.id)).filter(
        Enquiry.priority.in_([EnquiryPriority.HIGH, EnquiryPriority.URGENT]),
        Enquiry.status.notin_([EnquiryStatus.CONVERTED, EnquiryStatus.LOST, EnquiryStatus.CLOSED])
    ).scalar() or 0
    active_sales_users = db.query(func.count(User.id)).filter(
        User.role == UserRole.SALES_USER,
        User.is_active == True
    ).scalar() or 0

    # 1. Enquiry Status Distribution
    status_counts = db.query(
        Enquiry.status,
        func.count(Enquiry.id).label("count")
    ).group_by(Enquiry.status).all()
    enquiry_status_distribution = [
        {"status": s, "count": cnt} for s, cnt in status_counts
    ]

    # 2. Category Distribution
    category_counts = db.query(
        Category.name.label("category"),
        func.count(Enquiry.id).label("count")
    ).join(Enquiry, Enquiry.category_id == Category.id, isouter=True)\
     .group_by(Category.name).all()
    category_distribution = [
        {"category": cat or "Uncategorized", "count": cnt} for cat, cnt in category_counts
    ]

    # 3. Monthly Enquiry Trend (Past 6 months)
    # Using SQL extract of year and month
    monthly_rows = db.query(
        extract("year", Enquiry.created_at).label("yr"),
        extract("month", Enquiry.created_at).label("mo"),
        func.count(Enquiry.id).label("count"),
        func.coalesce(func.sum(Enquiry.estimated_value), 0.0).label("value")
    ).group_by("yr", "mo").order_by("yr", "mo").all()

    month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    monthly_trend = []
    for yr, mo, cnt, val in monthly_rows:
        m_idx = int(mo) - 1
        label = f"{month_names[m_idx]} {int(yr)}"
        monthly_trend.append({
            "month": label,
            "enquiries": cnt,
            "value": float(val)
        })

    # If no monthly data yet, provide empty list or past months with 0
    if not monthly_trend:
        for i in range(5, -1, -1):
            d = now - timedelta(days=i * 30)
            monthly_trend.append({
                "month": f"{month_names[d.month - 1]} {d.year}",
                "enquiries": 0,
                "value": 0.0
            })

    # 4. Lead Sources
    source_counts = db.query(
        Enquiry.source,
        func.count(Enquiry.id).label("count")
    ).group_by(Enquiry.source).all()
    lead_sources = [
        {"source": src or "OTHER", "count": cnt} for src, cnt in source_counts
    ]

    # 5. Sales User Performance
    sales_users = db.query(User).filter(User.role.in_([UserRole.SALES_USER, UserRole.MANAGER])).all()
    sales_perf = []
    for u in sales_users:
        u_enquiries = db.query(func.count(Enquiry.id)).filter(Enquiry.assigned_to == u.id).scalar() or 0
        u_converted = db.query(func.count(Enquiry.id)).filter(
            Enquiry.assigned_to == u.id,
            Enquiry.status == EnquiryStatus.CONVERTED
        ).scalar() or 0
        u_value = db.query(func.coalesce(func.sum(Enquiry.estimated_value), 0.0)).filter(
            Enquiry.assigned_to == u.id,
            Enquiry.status == EnquiryStatus.CONVERTED
        ).scalar() or 0.0
        sales_perf.append({
            "user_id": u.id,
            "name": u.name,
            "enquiries": u_enquiries,
            "converted": u_converted,
            "revenue": float(u_value)
        })

    # 6. Territory Performance
    territories = db.query(Territory).all()
    territory_perf = []
    for t in territories:
        t_enquiries = db.query(func.count(Enquiry.id)).filter(Enquiry.territory_id == t.id).scalar() or 0
        t_value = db.query(func.coalesce(func.sum(Enquiry.estimated_value), 0.0)).filter(
            Enquiry.territory_id == t.id
        ).scalar() or 0.0
        territory_perf.append({
            "territory_id": t.id,
            "name": t.name,
            "enquiries": t_enquiries,
            "total_value": float(t_value)
        })

    return DashboardStatsResponse(
        total_enquiries=total_enquiries,
        new_leads=new_leads,
        in_progress=in_progress,
        converted=converted,
        lost=lost,
        pending_follow_ups=pending_follow_ups,
        overdue_follow_ups=overdue_follow_ups,
        active_customers=active_customers,
        email_leads=email_leads,
        active_sales_users=active_sales_users,
        new_email_leads=new_email_leads,
        high_priority_enquiries=high_priority_enquiries,
        enquiry_status_distribution=enquiry_status_distribution,
        category_distribution=category_distribution,
        monthly_enquiry_trend=monthly_trend,
        lead_sources=lead_sources,
        sales_user_performance=sales_perf,
        territory_performance=territory_perf
    )


@router.get("/report", response_model=AnalyticsMetricsResponse)
def get_analytics_report(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    sales_user_id: Optional[int] = Query(None),
    territory_id: Optional[int] = Query(None),
    category_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    current_user: User = Depends(require_any_authenticated),
    db: Session = Depends(get_db)
):
    query = db.query(Enquiry)

    if start_date:
        query = query.filter(Enquiry.created_at >= start_date)
    if end_date:
        query = query.filter(Enquiry.created_at <= end_date)
    if sales_user_id:
        query = query.filter(Enquiry.assigned_to == sales_user_id)
    if territory_id:
        query = query.filter(Enquiry.territory_id == territory_id)
    if category_id:
        query = query.filter(Enquiry.category_id == category_id)
    if status:
        query = query.filter(Enquiry.status == status)
    if source:
        query = query.filter(Enquiry.source == source)

    total_enquiries = query.count()

    converted = query.filter(Enquiry.status == EnquiryStatus.CONVERTED).count()
    lost = query.filter(Enquiry.status == EnquiryStatus.LOST).count()
    pending = total_enquiries - converted - lost

    conversion_rate = round((converted / total_enquiries * 100), 2) if total_enquiries > 0 else 0.0

    total_val = db.query(func.coalesce(func.sum(Enquiry.estimated_value), 0.0)).filter(
        Enquiry.id.in_(query.with_entities(Enquiry.id))
    ).scalar() or 0.0

    conv_val = db.query(func.coalesce(func.sum(Enquiry.estimated_value), 0.0)).filter(
        Enquiry.id.in_(query.with_entities(Enquiry.id)),
        Enquiry.status == EnquiryStatus.CONVERTED
    ).scalar() or 0.0

    # Category-wise
    cat_rows = db.query(
        Category.name.label("name"),
        func.count(Enquiry.id).label("count"),
        func.coalesce(func.sum(Enquiry.estimated_value), 0.0).label("value")
    ).join(Category, Enquiry.category_id == Category.id)\
     .filter(Enquiry.id.in_(query.with_entities(Enquiry.id)))\
     .group_by(Category.name).all()
    category_wise = [{"name": r.name, "count": r.count, "value": float(r.value)} for r in cat_rows]

    # Source-wise
    src_rows = db.query(
        Enquiry.source.label("name"),
        func.count(Enquiry.id).label("count"),
        func.coalesce(func.sum(Enquiry.estimated_value), 0.0).label("value")
    ).filter(Enquiry.id.in_(query.with_entities(Enquiry.id)))\
     .group_by(Enquiry.source).all()
    source_wise = [{"name": r.name, "count": r.count, "value": float(r.value)} for r in src_rows]

    # Territory-wise
    terr_rows = db.query(
        Territory.name.label("name"),
        func.count(Enquiry.id).label("count"),
        func.coalesce(func.sum(Enquiry.estimated_value), 0.0).label("value")
    ).join(Territory, Enquiry.territory_id == Territory.id)\
     .filter(Enquiry.id.in_(query.with_entities(Enquiry.id)))\
     .group_by(Territory.name).all()
    territory_wise = [{"name": r.name, "count": r.count, "value": float(r.value)} for r in terr_rows]

    # Sales-user-wise
    user_rows = db.query(
        User.name.label("name"),
        func.count(Enquiry.id).label("count"),
        func.coalesce(func.sum(Enquiry.estimated_value), 0.0).label("value")
    ).join(User, Enquiry.assigned_to == User.id)\
     .filter(Enquiry.id.in_(query.with_entities(Enquiry.id)))\
     .group_by(User.name).all()
    sales_user_wise = [{"name": r.name, "count": r.count, "value": float(r.value)} for r in user_rows]

    # Monthly trends
    monthly_rows = db.query(
        extract("year", Enquiry.created_at).label("yr"),
        extract("month", Enquiry.created_at).label("mo"),
        func.count(Enquiry.id).label("count"),
        func.coalesce(func.sum(Enquiry.estimated_value), 0.0).label("value")
    ).filter(Enquiry.id.in_(query.with_entities(Enquiry.id)))\
     .group_by("yr", "mo").order_by("yr", "mo").all()

    month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    monthly_trends = [
        {
            "month": f"{month_names[int(mo) - 1]} {int(yr)}",
            "count": cnt,
            "value": float(val)
        }
        for yr, mo, cnt, val in monthly_rows
    ]

    # Status-wise
    status_rows = db.query(
        Enquiry.status.label("name"),
        func.count(Enquiry.id).label("count")
    ).filter(Enquiry.id.in_(query.with_entities(Enquiry.id)))\
     .group_by(Enquiry.status).all()
    status_wise = [{"name": r.name, "count": r.count} for r in status_rows]

    return AnalyticsMetricsResponse(
        total_enquiries=total_enquiries,
        converted=converted,
        lost=lost,
        pending=pending,
        conversion_rate=conversion_rate,
        total_pipeline_value=float(total_val),
        converted_pipeline_value=float(conv_val),
        category_wise=category_wise,
        source_wise=source_wise,
        territory_wise=territory_wise,
        sales_user_wise=sales_user_wise,
        monthly_trends=monthly_trends,
        status_wise=status_wise
    )
