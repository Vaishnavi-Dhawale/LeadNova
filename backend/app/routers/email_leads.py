from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.email_lead import EmailLead, EmailLeadStatus
from app.models.customer import Customer
from app.models.enquiry import Enquiry, EnquiryStatus
from app.models.user import User
from app.models.activity_log import ActivityAction
from app.schemas.email_lead import (
    EmailLeadCreate, EmailLeadUpdate, EmailLeadConvert, EmailLeadResponse
)
from app.utils.deps import require_any_authenticated, require_sales_or_admin
from app.utils.pagination import PaginatedResponse, paginate
from app.services.activity_service import log_activity
from app.services.email_reader_service import fetch_new_emails, get_imap_status

router = APIRouter(prefix="/email-leads", tags=["Email Leads"])


def to_email_lead_response(el: EmailLead) -> EmailLeadResponse:
    assigned_name = el.assignee.name if el.assignee else None
    customer_name = el.customer.customer_name if el.customer else None
    cat_id = el.category_id or (el.enquiry.category_id if el.enquiry else None)
    cat_name = None
    if el.category:
        cat_name = el.category.name
    elif el.enquiry and el.enquiry.category:
        cat_name = el.enquiry.category.name

    from datetime import timezone
    recv_at = el.received_at
    if recv_at and recv_at.tzinfo is None:
        recv_at = recv_at.replace(tzinfo=timezone.utc)
    cr_at = el.created_at
    if cr_at and cr_at.tzinfo is None:
        cr_at = cr_at.replace(tzinfo=timezone.utc)

    return EmailLeadResponse(
        id=el.id,
        sender_name=el.sender_name,
        sender_email=el.sender_email,
        recipient=el.recipient,
        subject=el.subject,
        body=el.body,
        body_html=el.body_html,
        attachments_info=el.attachments_info,
        company=el.company,
        status=el.status,
        category_id=cat_id,
        category_name=cat_name,
        assigned_to=el.assigned_to,
        customer_id=el.customer_id,
        enquiry_id=el.enquiry_id,
        received_at=recv_at,
        customer_name=customer_name,
        assigned_to_name=assigned_name,
        created_at=cr_at
    )


@router.get("/status/integration")
def get_email_integration_status(current_user: User = Depends(require_any_authenticated)):
    return get_imap_status()


@router.post("/fetch-now")
def trigger_fetch_now(
    current_user: User = Depends(require_sales_or_admin),
    db: Session = Depends(get_db)
):
    new_leads = fetch_new_emails(db)
    return {
        "message": f"Email check completed. {len(new_leads)} new leads extracted.",
        "count": len(new_leads)
    }


@router.get("", response_model=PaginatedResponse[EmailLeadResponse])
def get_email_leads(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    category_id: Optional[int] = Query(None),
    category: Optional[str] = Query(None),
    assigned_to: Optional[int] = Query(None),
    current_user: User = Depends(require_any_authenticated),
    db: Session = Depends(get_db)
):
    query = db.query(EmailLead)

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            (EmailLead.sender_name.ilike(s)) |
            (EmailLead.sender_email.ilike(s)) |
            (EmailLead.subject.ilike(s)) |
            (EmailLead.company.ilike(s))
        )

    if status:
        query = query.filter(EmailLead.status == status)

    if category_id:
        query = query.outerjoin(Enquiry, EmailLead.enquiry_id == Enquiry.id).filter(
            (EmailLead.category_id == category_id) | (Enquiry.category_id == category_id)
        )
    elif category:
        from app.models.category import Category
        s_cat = f"%{category.strip()}%"
        query = query.outerjoin(Category, EmailLead.category_id == Category.id)\
                     .outerjoin(Enquiry, EmailLead.enquiry_id == Enquiry.id)\
                     .outerjoin(Category, Enquiry.category_id == Category.id)\
                     .filter(Category.name.ilike(s_cat))

    if assigned_to:
        query = query.filter(EmailLead.assigned_to == assigned_to)

    query = query.order_by(EmailLead.received_at.desc().nullslast(), EmailLead.id.desc())
    items, total, total_pages = paginate(query, page, page_size)

    return PaginatedResponse(
        items=[to_email_lead_response(el) for el in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.post("", response_model=EmailLeadResponse, status_code=status.HTTP_201_CREATED)
def create_email_lead(
    el_in: EmailLeadCreate,
    request: Request,
    current_user: User = Depends(require_sales_or_admin),
    db: Session = Depends(get_db)
):
    lead = EmailLead(
        sender_name=el_in.sender_name,
        sender_email=el_in.sender_email,
        recipient=el_in.recipient,
        subject=el_in.subject,
        body=el_in.body,
        body_html=el_in.body_html,
        attachments_info=el_in.attachments_info,
        company=el_in.company,
        status=el_in.status or EmailLeadStatus.NEW,
        category_id=el_in.category_id,
        assigned_to=el_in.assigned_to or current_user.id,
        received_at=el_in.received_at or datetime.utcnow()
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)

    client_ip = request.client.host if request.client else None
    log_activity(
        db=db,
        action=ActivityAction.CREATE,
        description=f"Created email lead from {lead.sender_name} ({lead.sender_email})",
        entity_type="EMAIL_LEAD",
        user_id=current_user.id,
        entity_id=lead.id,
        ip_address=client_ip
    )

    return to_email_lead_response(lead)


@router.get("/{lead_id}", response_model=EmailLeadResponse)
def get_email_lead(
    lead_id: int,
    current_user: User = Depends(require_any_authenticated),
    db: Session = Depends(get_db)
):
    el = db.query(EmailLead).filter(EmailLead.id == lead_id).first()
    if not el:
        raise HTTPException(status_code=404, detail="Email lead not found")
    return to_email_lead_response(el)


@router.put("/{lead_id}", response_model=EmailLeadResponse)
def update_email_lead(
    lead_id: int,
    el_in: EmailLeadUpdate,
    request: Request,
    current_user: User = Depends(require_sales_or_admin),
    db: Session = Depends(get_db)
):
    lead = db.query(EmailLead).filter(EmailLead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Email lead not found")

    old_status = lead.status
    update_data = el_in.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(lead, k, v)

    db.commit()
    db.refresh(lead)

    client_ip = request.client.host if request.client else None
    action_type = ActivityAction.STATUS_CHANGE if (el_in.status and el_in.status != old_status) else ActivityAction.UPDATE
    log_activity(
        db=db,
        action=action_type,
        description=f"Updated email lead #{lead.id} ({lead.status})",
        entity_type="EMAIL_LEAD",
        user_id=current_user.id,
        entity_id=lead.id,
        ip_address=client_ip
    )

    return to_email_lead_response(lead)


@router.post("/{lead_id}/convert", response_model=EmailLeadResponse)
def convert_email_lead_to_enquiry(
    lead_id: int,
    convert_in: EmailLeadConvert,
    request: Request,
    current_user: User = Depends(require_sales_or_admin),
    db: Session = Depends(get_db)
):
    lead = db.query(EmailLead).filter(EmailLead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Email lead not found")

    # 1. Find or create Customer using existing identifiers (email, contact phone, or company)
    cust_name = (convert_in.customer_name or "").strip() or lead.sender_name
    clean_phone = (convert_in.phone or "").strip()
    company_val = (lead.company or "").strip() or f"{cust_name}'s Enterprise"

    customer = None
    if lead.sender_email:
        customer = db.query(Customer).filter(Customer.email == lead.sender_email.strip()).first()
    if not customer and clean_phone:
        customer = db.query(Customer).filter(Customer.phone == clean_phone).first()
    if not customer and lead.company and lead.company.strip():
        customer = db.query(Customer).filter(Customer.company_name == lead.company.strip()).first()

    if not customer:
        customer = Customer(
            customer_name=cust_name,
            company_name=company_val,
            email=lead.sender_email,
            phone=clean_phone or "+91 99999 99999",
            source="EMAIL",
            notes=convert_in.notes or f"Converted from Email Lead #{lead.id}",
            territory_id=convert_in.territory_id,
            created_by=current_user.id
        )
        db.add(customer)
        db.commit()
        db.refresh(customer)
    else:
        # Avoid duplicate customer, update fields if provided
        if cust_name and customer.customer_name != cust_name:
            customer.customer_name = cust_name
        if clean_phone and (not customer.phone or customer.phone in ("N/A", "", "+91 99999 99999")):
            customer.phone = clean_phone
        if convert_in.territory_id and not customer.territory_id:
            customer.territory_id = convert_in.territory_id
        db.commit()
        db.refresh(customer)

    # 2. Create Enquiry
    assigned_user = convert_in.assigned_to or lead.assigned_to or current_user.id
    title_val = (lead.subject or "Machinery Sales Enquiry").strip()
    desc_val = lead.body
    prod_interest = (convert_in.product_interested or "").strip() if convert_in.product_interested else None
    if prod_interest:
        lower_title = title_val.lower()
        if prod_interest.lower() not in lower_title and not lower_title.startswith(("requirement", "interested", "price enquiry", "quote", "inquiry")):
            title_val = f"{prod_interest} - {title_val}"[:200]
        desc_val = f"Product Interested: {prod_interest}\n\n{lead.body}"

    enquiry = Enquiry(
        customer_id=customer.id,
        title=title_val,
        description=desc_val,
        category_id=convert_in.category_id,
        territory_id=convert_in.territory_id or customer.territory_id,
        assigned_to=assigned_user,
        product_interested=prod_interest,
        source="EMAIL",
        status=EnquiryStatus.NEW,
        estimated_value=convert_in.estimated_value or 0.0
    )
    db.add(enquiry)
    db.commit()
    db.refresh(enquiry)

    # 3. Update Email Lead status, category, and references
    lead.status = EmailLeadStatus.CONVERTED
    lead.category_id = convert_in.category_id
    lead.customer_id = customer.id
    lead.enquiry_id = enquiry.id
    db.commit()
    db.refresh(lead)

    client_ip = request.client.host if request.client else None
    log_activity(
        db=db,
        action=ActivityAction.STATUS_CHANGE,
        description=f"Converted Email Lead #{lead.id} into Customer '{customer.customer_name}' and Enquiry #{enquiry.id}",
        entity_type="EMAIL_LEAD",
        user_id=current_user.id,
        entity_id=lead.id,
        ip_address=client_ip
    )

    return to_email_lead_response(lead)


@router.delete("/{lead_id}")
def delete_email_lead(
    lead_id: int,
    request: Request,
    current_user: User = Depends(require_sales_or_admin),
    db: Session = Depends(get_db)
):
    lead = db.query(EmailLead).filter(EmailLead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Email lead not found")

    db.delete(lead)
    db.commit()

    client_ip = request.client.host if request.client else None
    log_activity(
        db=db,
        action=ActivityAction.DELETE,
        description=f"Deleted email lead #{lead_id}",
        entity_type="EMAIL_LEAD",
        user_id=current_user.id,
        entity_id=lead_id,
        ip_address=client_ip
    )

    return {"message": "Email lead deleted successfully"}
