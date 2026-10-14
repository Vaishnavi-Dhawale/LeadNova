from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.campaign import Campaign, CampaignStatus
from app.models.customer import Customer
from app.models.enquiry import Enquiry, EnquiryStatus, EnquiryPriority
from app.models.follow_up import FollowUp, FollowUpStatus
from app.models.user import User
from app.models.activity_log import ActivityAction
from app.schemas.campaign import CampaignCreate, CampaignUpdate, CampaignResponse
from app.utils.deps import require_any_authenticated, require_sales_or_admin, require_admin
from app.utils.pagination import PaginatedResponse, paginate
from app.services.activity_service import log_activity
from app.services.email_sender_service import send_email_message

router = APIRouter(prefix="/campaigns", tags=["Campaigns"])


def to_campaign_response(c: Campaign) -> CampaignResponse:
    creator_name = c.creator.name if c.creator else None
    sender_name = c.sender.name if c.sender else None
    return CampaignResponse(
        id=c.id,
        name=c.name,
        description=c.description,
        status=c.status,
        target_segment=c.target_segment,
        email_subject=c.email_subject,
        email_body=c.email_body,
        sent_at=c.sent_at,
        sent_by=c.sent_by,
        sent_by_name=sender_name,
        scheduled_at=c.scheduled_at,
        recipient_count=c.recipient_count or 0,
        start_date=c.start_date,
        end_date=c.end_date,
        created_by=c.created_by,
        creator_name=creator_name,
        created_at=c.created_at,
        updated_at=c.updated_at
    )


def resolve_target_recipients(db: Session, segment: Optional[str]) -> List[Dict[str, Any]]:
    query = db.query(Customer).filter(Customer.email.isnot(None), Customer.email != "")
    seg = (segment or "All Customers").strip().lower()

    if "interested" in seg:
        cust_ids = db.query(Enquiry.customer_id).filter(
            (Enquiry.status.in_([EnquiryStatus.NEW, EnquiryStatus.IN_PROGRESS, EnquiryStatus.FOLLOW_UP])) |
            (Enquiry.priority.in_([EnquiryPriority.HIGH, EnquiryPriority.URGENT]))
        ).distinct().all()
        target_ids = [c[0] for c in cust_ids]
        query = query.filter(Customer.id.in_(target_ids))
    elif "new" in seg:
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        query = query.filter(Customer.created_at >= thirty_days_ago)
    elif "converted" in seg or "existing" in seg:
        cust_ids = db.query(Enquiry.customer_id).filter(
            Enquiry.status == EnquiryStatus.CONVERTED
        ).distinct().all()
        target_ids = [c[0] for c in cust_ids]
        query = query.filter(Customer.id.in_(target_ids))
    elif "open" in seg:
        cust_ids = db.query(Enquiry.customer_id).filter(
            Enquiry.status.in_([EnquiryStatus.NEW, EnquiryStatus.IN_PROGRESS, EnquiryStatus.FOLLOW_UP])
        ).distinct().all()
        target_ids = [c[0] for c in cust_ids]
        query = query.filter(Customer.id.in_(target_ids))
    elif "pending" in seg or "follow" in seg:
        cust_ids = db.query(FollowUp.customer_id).filter(
            FollowUp.status == FollowUpStatus.PENDING
        ).distinct().all()
        target_ids = [c[0] for c in cust_ids]
        query = query.filter(Customer.id.in_(target_ids))

    customers = query.order_by(Customer.customer_name.asc()).all()
    seen_emails = set()
    recipients = []
    for c in customers:
        clean_email = c.email.strip().lower()
        if clean_email and "@" in clean_email and clean_email not in seen_emails:
            seen_emails.add(clean_email)
            recipients.append({
                "customer_id": c.id,
                "customer_name": c.customer_name,
                "company_name": c.company_name,
                "email": c.email
            })
    return recipients


@router.get("/preview-recipients")
def preview_campaign_recipients(
    target_segment: Optional[str] = Query("All Customers"),
    current_user: User = Depends(require_any_authenticated),
    db: Session = Depends(get_db)
):
    recipients = resolve_target_recipients(db, target_segment)
    return {
        "target_segment": target_segment or "All Customers",
        "count": len(recipients),
        "recipients": recipients[:100]
    }


@router.get("", response_model=PaginatedResponse[CampaignResponse])
def get_campaigns(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user: User = Depends(require_any_authenticated),
    db: Session = Depends(get_db)
):
    query = db.query(Campaign)

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            (Campaign.name.ilike(s)) |
            (Campaign.description.ilike(s)) |
            (Campaign.email_subject.ilike(s)) |
            (Campaign.target_segment.ilike(s))
        )

    if status:
        query = query.filter(Campaign.status == status)

    query = query.order_by(Campaign.id.desc())
    items, total, total_pages = paginate(query, page, page_size)

    return PaginatedResponse(
        items=[to_campaign_response(c) for c in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.post("", response_model=CampaignResponse, status_code=status.HTTP_201_CREATED)
def create_campaign(
    c_in: CampaignCreate,
    request: Request,
    current_user: User = Depends(require_sales_or_admin),
    db: Session = Depends(get_db)
):
    campaign = Campaign(
        name=c_in.name,
        description=c_in.description,
        status=c_in.status or CampaignStatus.DRAFT,
        target_segment=c_in.target_segment or "All Customers",
        email_subject=c_in.email_subject,
        email_body=c_in.email_body,
        start_date=c_in.start_date,
        end_date=c_in.end_date,
        scheduled_at=c_in.scheduled_at,
        created_by=current_user.id
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)

    client_ip = request.client.host if request.client else None
    log_activity(
        db=db,
        action=ActivityAction.CREATE,
        description=f"Created campaign '{campaign.name}' ({campaign.status})",
        entity_type="CAMPAIGN",
        user_id=current_user.id,
        entity_id=campaign.id,
        ip_address=client_ip
    )

    return to_campaign_response(campaign)


@router.get("/{campaign_id}", response_model=CampaignResponse)
def get_campaign(
    campaign_id: int,
    current_user: User = Depends(require_any_authenticated),
    db: Session = Depends(get_db)
):
    c = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return to_campaign_response(c)


@router.put("/{campaign_id}", response_model=CampaignResponse)
def update_campaign(
    campaign_id: int,
    c_in: CampaignUpdate,
    request: Request,
    current_user: User = Depends(require_sales_or_admin),
    db: Session = Depends(get_db)
):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    old_status = campaign.status
    update_data = c_in.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(campaign, k, v)

    db.commit()
    db.refresh(campaign)

    client_ip = request.client.host if request.client else None
    action_type = ActivityAction.STATUS_CHANGE if (c_in.status and c_in.status != old_status) else ActivityAction.UPDATE
    log_activity(
        db=db,
        action=action_type,
        description=f"Updated campaign '{campaign.name}' ({campaign.status})",
        entity_type="CAMPAIGN",
        user_id=current_user.id,
        entity_id=campaign.id,
        ip_address=client_ip
    )

    return to_campaign_response(campaign)


@router.post("/{campaign_id}/send")
def send_campaign(
    campaign_id: int,
    request: Request,
    current_user: User = Depends(require_sales_or_admin),
    db: Session = Depends(get_db)
):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    if campaign.status == CampaignStatus.SENT:
        raise HTTPException(status_code=400, detail="This campaign has already been sent.")

    if not campaign.name or not campaign.email_subject or not campaign.email_body:
        raise HTTPException(
            status_code=400,
            detail="Campaign Name, Email Subject, and Email Body are required to send."
        )

    recipients = resolve_target_recipients(db, campaign.target_segment)
    if not recipients:
        raise HTTPException(
            status_code=400,
            detail=f"No customer recipients with valid emails found for target segment '{campaign.target_segment}'."
        )

    success_count = 0
    failed_count = 0
    for r in recipients:
        try:
            res = send_email_message(
                db=db,
                recipient=r["email"],
                subject=campaign.email_subject,
                body=campaign.email_body,
                customer_id=r["customer_id"]
            )
            if "FAILED" in (res.status or ""):
                failed_count += 1
            else:
                success_count += 1
        except Exception:
            failed_count += 1

    campaign.status = CampaignStatus.SENT
    campaign.sent_at = datetime.utcnow()
    campaign.sent_by = current_user.id
    campaign.recipient_count = len(recipients)
    db.commit()
    db.refresh(campaign)

    client_ip = request.client.host if request.client else None
    log_activity(
        db=db,
        action=ActivityAction.EMAIL_SENT,
        description=f"Sent campaign '{campaign.name}' to {success_count} recipients (Failed: {failed_count})",
        entity_type="CAMPAIGN",
        user_id=current_user.id,
        entity_id=campaign.id,
        ip_address=client_ip
    )

    return {
        "message": f"Campaign sent successfully to {success_count} recipients.",
        "success_count": success_count,
        "failed_count": failed_count,
        "recipient_count": len(recipients),
        "campaign": to_campaign_response(campaign)
    }


@router.post("/{campaign_id}/cancel", response_model=CampaignResponse)
def cancel_campaign(
    campaign_id: int,
    request: Request,
    current_user: User = Depends(require_sales_or_admin),
    db: Session = Depends(get_db)
):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    if campaign.status == CampaignStatus.SENT:
        raise HTTPException(status_code=400, detail="Cannot cancel a campaign that has already been sent.")

    campaign.status = CampaignStatus.CANCELLED
    db.commit()
    db.refresh(campaign)

    client_ip = request.client.host if request.client else None
    log_activity(
        db=db,
        action=ActivityAction.STATUS_CHANGE,
        description=f"Cancelled campaign '{campaign.name}'",
        entity_type="CAMPAIGN",
        user_id=current_user.id,
        entity_id=campaign.id,
        ip_address=client_ip
    )

    return to_campaign_response(campaign)


@router.delete("/{campaign_id}")
def delete_campaign(
    campaign_id: int,
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    name = campaign.name
    db.delete(campaign)
    db.commit()

    client_ip = request.client.host if request.client else None
    log_activity(
        db=db,
        action=ActivityAction.DELETE,
        description=f"Admin {current_user.email} deleted campaign '{name}'",
        entity_type="CAMPAIGN",
        user_id=current_user.id,
        entity_id=campaign_id,
        ip_address=client_ip
    )

    return {"message": "Campaign deleted successfully"}
