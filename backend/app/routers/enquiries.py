from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.enquiry import Enquiry, EnquiryStatus, EnquiryPriority, EnquirySource
from app.models.customer import Customer
from app.models.category import Category
from app.models.activity_log import ActivityLog, ActivityAction
from app.models.user import User, UserRole
from app.schemas.enquiry import (
    EnquiryCreate, EnquiryUpdate, EnquiryStatusUpdate, EnquiryResponse, EnquiryDetailResponse
)
from app.utils.deps import require_any_authenticated, require_sales_or_admin, require_admin
from app.utils.pagination import PaginatedResponse, paginate
from app.services.activity_service import log_activity

router = APIRouter(prefix="/enquiries", tags=["Enquiries"])


def to_enquiry_response(e: Enquiry) -> EnquiryResponse:
    customer_name = e.customer.customer_name if e.customer else None
    company_name = e.customer.company_name if e.customer else None
    category_name = e.category.name if e.category else None
    territory_name = e.territory.name if e.territory else None
    assigned_name = e.assignee.name if e.assignee else None

    next_follow_up_date = None
    if getattr(e, "follow_ups", None):
        pending = [f.follow_up_date for f in e.follow_ups if getattr(f, "status", None) == "PENDING" and getattr(f, "follow_up_date", None)]
        if pending:
            next_follow_up_date = min(pending)

    return EnquiryResponse(
        id=e.id,
        customer_id=e.customer_id,
        title=e.title,
        description=e.description,
        category_id=e.category_id,
        territory_id=e.territory_id,
        assigned_to=e.assigned_to,
        source=e.source,
        priority=e.priority,
        status=e.status,
        product_interested=getattr(e, "product_interested", None),
        estimated_value=e.estimated_value,
        customer_name=customer_name,
        company_name=company_name,
        category_name=category_name,
        territory_name=territory_name,
        assigned_to_name=assigned_name,
        next_follow_up_date=next_follow_up_date,
        created_at=e.created_at,
        updated_at=e.updated_at
    )


@router.get("", response_model=PaginatedResponse[EnquiryResponse])
def get_enquiries(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    category_id: Optional[int] = Query(None),
    territory_id: Optional[int] = Query(None),
    assigned_to: Optional[int] = Query(None),
    customer_id: Optional[int] = Query(None),
    sort_by: str = Query("id"),
    sort_order: str = Query("desc"),
    current_user: User = Depends(require_any_authenticated),
    db: Session = Depends(get_db)
):
    query = db.query(Enquiry).join(Enquiry.customer)

    # Role check: If SALES_USER and assigned_to is requested or scoped
    if current_user.role == UserRole.SALES_USER and assigned_to is not None:
        query = query.filter(Enquiry.assigned_to == assigned_to)

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            (Enquiry.title.ilike(s)) |
            (Enquiry.description.ilike(s)) |
            (Customer.customer_name.ilike(s)) |
            (Customer.company_name.ilike(s))
        )

    if status:
        query = query.filter(Enquiry.status == status)
    if priority:
        query = query.filter(Enquiry.priority == priority)
    if source:
        query = query.filter(Enquiry.source == source)
    if category_id:
        query = query.filter(Enquiry.category_id == category_id)
    if territory_id:
        query = query.filter(Enquiry.territory_id == territory_id)
    if assigned_to:
        query = query.filter(Enquiry.assigned_to == assigned_to)
    if customer_id:
        query = query.filter(Enquiry.customer_id == customer_id)

    # Sorting
    if hasattr(Enquiry, sort_by):
        col = getattr(Enquiry, sort_by)
        query = query.order_by(col.desc() if sort_order.lower() == "desc" else col.asc())
    else:
        query = query.order_by(Enquiry.id.desc())

    items, total, total_pages = paginate(query, page, page_size)

    return PaginatedResponse(
        items=[to_enquiry_response(e) for e in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.post("", response_model=EnquiryResponse, status_code=status.HTTP_201_CREATED)
def create_enquiry(
    e_in: EnquiryCreate,
    request: Request,
    current_user: User = Depends(require_sales_or_admin),
    db: Session = Depends(get_db)
):
    # Validate customer
    customer = db.query(Customer).filter(Customer.id == e_in.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    # Validate category
    cat = db.query(Category).filter(Category.id == e_in.category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")

    # Auto assign to current user if sales user and not set
    assigned_to = e_in.assigned_to
    if not assigned_to and current_user.role == UserRole.SALES_USER:
        assigned_to = current_user.id

    # Auto infer territory from customer if not provided
    territory_id = e_in.territory_id or customer.territory_id

    enquiry = Enquiry(
        customer_id=e_in.customer_id,
        title=e_in.title,
        description=e_in.description,
        category_id=e_in.category_id,
        territory_id=territory_id,
        assigned_to=assigned_to,
        source=e_in.source,
        priority=e_in.priority,
        status=e_in.status or EnquiryStatus.NEW,
        product_interested=e_in.product_interested,
        estimated_value=e_in.estimated_value
    )
    db.add(enquiry)
    db.commit()
    db.refresh(enquiry)

    if e_in.follow_up_date:
        from app.models.follow_up import FollowUp, FollowUpStatus, FollowUpType
        fu = FollowUp(
            customer_id=enquiry.customer_id,
            enquiry_id=enquiry.id,
            assigned_to=enquiry.assigned_to or current_user.id,
            follow_up_date=e_in.follow_up_date,
            follow_up_type=FollowUpType.CALL,
            status=FollowUpStatus.PENDING,
            notes=f"Scheduled follow-up for enquiry: {enquiry.title}"
        )
        db.add(fu)
        db.commit()
        db.refresh(enquiry)

    client_ip = request.client.host if request.client else None
    log_activity(
        db=db,
        action=ActivityAction.CREATE,
        description=f"Created enquiry '{enquiry.title}' for {customer.company_name} (₹{enquiry.estimated_value:,.2f})",
        entity_type="ENQUIRY",
        user_id=current_user.id,
        entity_id=enquiry.id,
        ip_address=client_ip
    )

    return to_enquiry_response(enquiry)


@router.get("/{enquiry_id}", response_model=EnquiryDetailResponse)
def get_enquiry_detail(
    enquiry_id: int,
    current_user: User = Depends(require_any_authenticated),
    db: Session = Depends(get_db)
):
    e = db.query(Enquiry).filter(Enquiry.id == enquiry_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Enquiry not found")

    base = to_enquiry_response(e)

    follow_ups_data = [
        {
            "id": f.id,
            "follow_up_date": f.follow_up_date,
            "follow_up_type": f.follow_up_type,
            "notes": f.notes,
            "status": f.status,
            "assigned_to_name": f.assignee.name if f.assignee else None
        }
        for f in e.follow_ups
    ]

    documents_data = [
        {
            "id": d.id,
            "filename": d.filename,
            "original_filename": d.original_filename,
            "file_size": d.file_size,
            "content_type": d.content_type,
            "uploaded_by_name": d.uploader.name if d.uploader else None,
            "created_at": d.created_at
        }
        for d in e.documents
    ]

    emails_data = [
        {
            "id": eh.id,
            "recipient": eh.recipient,
            "subject": eh.subject,
            "body": eh.body,
            "status": eh.status,
            "sent_at": eh.sent_at
        }
        for eh in e.email_histories
    ]

    return EnquiryDetailResponse(
        **base.model_dump(),
        customer_email=e.customer.email if e.customer else None,
        customer_phone=e.customer.phone if e.customer else None,
        follow_ups=follow_ups_data,
        documents=documents_data,
        email_history=emails_data
    )


@router.put("/{enquiry_id}", response_model=EnquiryResponse)
def update_enquiry(
    enquiry_id: int,
    e_in: EnquiryUpdate,
    request: Request,
    current_user: User = Depends(require_sales_or_admin),
    db: Session = Depends(get_db)
):
    enquiry = db.query(Enquiry).filter(Enquiry.id == enquiry_id).first()
    if not enquiry:
        raise HTTPException(status_code=404, detail="Enquiry not found")

    old_status = enquiry.status
    update_data = e_in.model_dump(exclude_unset=True)

    fu_date_provided = "follow_up_date" in update_data
    fu_date = update_data.pop("follow_up_date", None)

    for field, val in update_data.items():
        setattr(enquiry, field, val)

    if fu_date_provided:
        from app.models.follow_up import FollowUp, FollowUpStatus, FollowUpType
        if fu_date:
            existing_fu = db.query(FollowUp).filter(
                FollowUp.enquiry_id == enquiry.id,
                FollowUp.status == FollowUpStatus.PENDING
            ).first()
            if existing_fu:
                existing_fu.follow_up_date = fu_date
                if enquiry.assigned_to:
                    existing_fu.assigned_to = enquiry.assigned_to
            else:
                fu = FollowUp(
                    customer_id=enquiry.customer_id,
                    enquiry_id=enquiry.id,
                    assigned_to=enquiry.assigned_to or current_user.id,
                    follow_up_date=fu_date,
                    follow_up_type=FollowUpType.CALL,
                    status=FollowUpStatus.PENDING,
                    notes=f"Scheduled follow-up for enquiry: {enquiry.title}"
                )
                db.add(fu)

    db.commit()
    db.refresh(enquiry)

    client_ip = request.client.host if request.client else None
    action_type = ActivityAction.STATUS_CHANGE if (e_in.status and e_in.status != old_status) else ActivityAction.UPDATE
    log_activity(
        db=db,
        action=action_type,
        description=f"Updated enquiry '{enquiry.title}' (Status: {enquiry.status}, Priority: {enquiry.priority})",
        entity_type="ENQUIRY",
        user_id=current_user.id,
        entity_id=enquiry.id,
        ip_address=client_ip
    )

    return to_enquiry_response(enquiry)


@router.patch("/{enquiry_id}/status", response_model=EnquiryResponse)
def update_enquiry_status(
    enquiry_id: int,
    status_update: EnquiryStatusUpdate,
    request: Request,
    current_user: User = Depends(require_sales_or_admin),
    db: Session = Depends(get_db)
):
    enquiry = db.query(Enquiry).filter(Enquiry.id == enquiry_id).first()
    if not enquiry:
        raise HTTPException(status_code=404, detail="Enquiry not found")

    if status_update.status not in EnquiryStatus.ALL_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status: {status_update.status}")

    prev_status = enquiry.status
    enquiry.status = status_update.status
    db.commit()
    db.refresh(enquiry)

    desc = f"Changed status from {prev_status} to {enquiry.status}"
    if status_update.notes:
        desc += f" (Note: {status_update.notes})"

    client_ip = request.client.host if request.client else None
    log_activity(
        db=db,
        action=ActivityAction.STATUS_CHANGE,
        description=f"Enquiry #{enquiry.id} '{enquiry.title}': {desc}",
        entity_type="ENQUIRY",
        user_id=current_user.id,
        entity_id=enquiry.id,
        ip_address=client_ip
    )

    return to_enquiry_response(enquiry)


@router.delete("/{enquiry_id}")
def delete_enquiry(
    enquiry_id: int,
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    enquiry = db.query(Enquiry).filter(Enquiry.id == enquiry_id).first()
    if not enquiry:
        raise HTTPException(status_code=404, detail="Enquiry not found")

    title = enquiry.title
    db.delete(enquiry)
    db.commit()

    client_ip = request.client.host if request.client else None
    log_activity(
        db=db,
        action=ActivityAction.DELETE,
        description=f"Admin {current_user.email} deleted enquiry '{title}'",
        entity_type="ENQUIRY",
        user_id=current_user.id,
        entity_id=enquiry_id,
        ip_address=client_ip
    )
    return {"message": "Enquiry deleted successfully"}
