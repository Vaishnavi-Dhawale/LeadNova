from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.email import EmailTemplate, EmailHistory
from app.models.customer import Customer
from app.models.enquiry import Enquiry
from app.models.user import User
from app.models.activity_log import ActivityAction
from app.schemas.email import (
    EmailTemplateCreate, EmailTemplateUpdate, EmailTemplateResponse,
    SendEmailRequest, EmailHistoryResponse
)
from app.utils.deps import require_any_authenticated, require_sales_or_admin, require_admin
from app.utils.pagination import PaginatedResponse, paginate
from app.services.activity_service import log_activity
from app.services.email_sender_service import send_email_message

router = APIRouter(prefix="/emails", tags=["Emails"])


# --- TEMPLATES ---

@router.get("/templates", response_model=List[EmailTemplateResponse])
def get_templates(
    category: Optional[str] = Query(None),
    current_user: User = Depends(require_any_authenticated),
    db: Session = Depends(get_db)
):
    query = db.query(EmailTemplate)
    if category:
        query = query.filter(EmailTemplate.category == category)
    return query.order_by(EmailTemplate.name.asc()).all()


@router.post("/templates", response_model=EmailTemplateResponse, status_code=status.HTTP_201_CREATED)
def create_template(
    t_in: EmailTemplateCreate,
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    existing = db.query(EmailTemplate).filter(EmailTemplate.name == t_in.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Template with this name already exists")

    template = EmailTemplate(
        name=t_in.name,
        subject=t_in.subject,
        body=t_in.body,
        category=t_in.category or "General"
    )
    db.add(template)
    db.commit()
    db.refresh(template)

    client_ip = request.client.host if request.client else None
    log_activity(
        db=db,
        action=ActivityAction.CREATE,
        description=f"Created email template '{template.name}'",
        entity_type="EMAIL_TEMPLATE",
        user_id=current_user.id,
        entity_id=template.id,
        ip_address=client_ip
    )

    return template


@router.get("/templates/{template_id}", response_model=EmailTemplateResponse)
def get_template(
    template_id: int,
    current_user: User = Depends(require_any_authenticated),
    db: Session = Depends(get_db)
):
    t = db.query(EmailTemplate).filter(EmailTemplate.id == template_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Email template not found")
    return t


@router.put("/templates/{template_id}", response_model=EmailTemplateResponse)
def update_template(
    template_id: int,
    t_in: EmailTemplateUpdate,
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    template = db.query(EmailTemplate).filter(EmailTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Email template not found")

    if t_in.name and t_in.name != template.name:
        conflict = db.query(EmailTemplate).filter(EmailTemplate.name == t_in.name).first()
        if conflict:
            raise HTTPException(status_code=400, detail="Template name already in use")
        template.name = t_in.name

    if t_in.subject is not None:
        template.subject = t_in.subject
    if t_in.body is not None:
        template.body = t_in.body
    if t_in.category is not None:
        template.category = t_in.category

    db.commit()
    db.refresh(template)

    client_ip = request.client.host if request.client else None
    log_activity(
        db=db,
        action=ActivityAction.UPDATE,
        description=f"Updated email template '{template.name}'",
        entity_type="EMAIL_TEMPLATE",
        user_id=current_user.id,
        entity_id=template.id,
        ip_address=client_ip
    )

    return template


@router.delete("/templates/{template_id}")
def delete_template(
    template_id: int,
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    template = db.query(EmailTemplate).filter(EmailTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Email template not found")

    name = template.name
    db.delete(template)
    db.commit()

    client_ip = request.client.host if request.client else None
    log_activity(
        db=db,
        action=ActivityAction.DELETE,
        description=f"Deleted email template '{name}'",
        entity_type="EMAIL_TEMPLATE",
        user_id=current_user.id,
        entity_id=template_id,
        ip_address=client_ip
    )

    return {"message": "Email template deleted successfully"}


# --- COMPOSE & SEND EMAIL ---

@router.post("/send", response_model=EmailHistoryResponse)
def compose_and_send_email(
    mail_in: SendEmailRequest,
    request: Request,
    current_user: User = Depends(require_sales_or_admin),
    db: Session = Depends(get_db)
):
    history = send_email_message(
        db=db,
        recipient=mail_in.recipient,
        subject=mail_in.subject,
        body=mail_in.body,
        customer_id=mail_in.customer_id,
        enquiry_id=mail_in.enquiry_id
    )

    client_ip = request.client.host if request.client else None
    log_activity(
        db=db,
        action=ActivityAction.EMAIL_SENT,
        description=f"Sent email '{mail_in.subject}' to {mail_in.recipient} (Status: {history.status})",
        entity_type="EMAIL",
        user_id=current_user.id,
        entity_id=history.id,
        ip_address=client_ip
    )

    cust_name = history.customer.customer_name if history.customer else None
    enq_title = history.enquiry.title if history.enquiry else None

    return EmailHistoryResponse(
        id=history.id,
        sender=history.sender,
        recipient=history.recipient,
        subject=history.subject,
        body=history.body,
        customer_id=history.customer_id,
        customer_name=cust_name,
        enquiry_id=history.enquiry_id,
        enquiry_title=enq_title,
        status=history.status,
        sent_at=history.sent_at
    )


# --- EMAIL HISTORY ---

@router.get("/history", response_model=PaginatedResponse[EmailHistoryResponse])
def get_email_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    customer_id: Optional[int] = Query(None),
    enquiry_id: Optional[int] = Query(None),
    current_user: User = Depends(require_any_authenticated),
    db: Session = Depends(get_db)
):
    query = db.query(EmailHistory)

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            (EmailHistory.recipient.ilike(s)) |
            (EmailHistory.subject.ilike(s)) |
            (EmailHistory.body.ilike(s))
        )

    if customer_id:
        query = query.filter(EmailHistory.customer_id == customer_id)
    if enquiry_id:
        query = query.filter(EmailHistory.enquiry_id == enquiry_id)

    query = query.order_by(EmailHistory.sent_at.desc())
    items, total, total_pages = paginate(query, page, page_size)

    results = []
    for h in items:
        results.append(EmailHistoryResponse(
            id=h.id,
            sender=h.sender,
            recipient=h.recipient,
            subject=h.subject,
            body=h.body,
            customer_id=h.customer_id,
            customer_name=h.customer.customer_name if h.customer else None,
            enquiry_id=h.enquiry_id,
            enquiry_title=h.enquiry.title if h.enquiry else None,
            status=h.status,
            sent_at=h.sent_at
        ))

    return PaginatedResponse(
        items=results,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )
