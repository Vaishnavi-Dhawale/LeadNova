from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.follow_up import FollowUp, FollowUpStatus, FollowUpType
from app.models.customer import Customer
from app.models.enquiry import Enquiry
from app.models.user import User, UserRole
from app.models.activity_log import ActivityAction
from app.schemas.follow_up import FollowUpCreate, FollowUpUpdate, FollowUpResponse
from app.utils.deps import require_any_authenticated, require_sales_or_admin
from app.utils.pagination import PaginatedResponse, paginate
from app.services.activity_service import log_activity

router = APIRouter(prefix="/follow-ups", tags=["Follow-ups"])


def to_follow_up_response(f: FollowUp) -> FollowUpResponse:
    customer_name = f.customer.customer_name if f.customer else None
    company_name = f.customer.company_name if f.customer else None
    enquiry_title = f.enquiry.title if f.enquiry else None
    assigned_name = f.assignee.name if f.assignee else None
    is_overdue = f.status == FollowUpStatus.PENDING and f.follow_up_date < datetime.utcnow()

    return FollowUpResponse(
        id=f.id,
        customer_id=f.customer_id,
        enquiry_id=f.enquiry_id,
        assigned_to=f.assigned_to,
        follow_up_date=f.follow_up_date,
        follow_up_type=f.follow_up_type,
        notes=f.notes,
        status=f.status,
        customer_name=customer_name,
        company_name=company_name,
        enquiry_title=enquiry_title,
        assigned_to_name=assigned_name,
        is_overdue=is_overdue,
        created_at=f.created_at,
        updated_at=f.updated_at
    )


@router.get("", response_model=PaginatedResponse[FollowUpResponse])
def get_follow_ups(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    follow_up_type: Optional[str] = Query(None),
    assigned_to: Optional[int] = Query(None),
    customer_id: Optional[int] = Query(None),
    enquiry_id: Optional[int] = Query(None),
    filter_preset: Optional[str] = Query(None),  # 'upcoming', 'overdue', 'today'
    current_user: User = Depends(require_any_authenticated),
    db: Session = Depends(get_db)
):
    query = db.query(FollowUp).join(FollowUp.customer)

    now = datetime.utcnow()
    if filter_preset == "overdue":
        query = query.filter(FollowUp.status == FollowUpStatus.PENDING, FollowUp.follow_up_date < now)
    elif filter_preset == "upcoming":
        query = query.filter(FollowUp.status == FollowUpStatus.PENDING, FollowUp.follow_up_date >= now)
    elif filter_preset == "today":
        start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = now.replace(hour=23, minute=59, second=59, microsecond=999999)
        query = query.filter(FollowUp.follow_up_date.between(start_of_day, end_of_day))

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            (FollowUp.notes.ilike(s)) |
            (Customer.customer_name.ilike(s)) |
            (Customer.company_name.ilike(s))
        )

    if status:
        query = query.filter(FollowUp.status == status)
    if follow_up_type:
        query = query.filter(FollowUp.follow_up_type == follow_up_type)
    if assigned_to:
        query = query.filter(FollowUp.assigned_to == assigned_to)
    if customer_id:
        query = query.filter(FollowUp.customer_id == customer_id)
    if enquiry_id:
        query = query.filter(FollowUp.enquiry_id == enquiry_id)

    query = query.order_by(FollowUp.follow_up_date.asc())
    items, total, total_pages = paginate(query, page, page_size)

    return PaginatedResponse(
        items=[to_follow_up_response(f) for f in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.post("", response_model=FollowUpResponse, status_code=status.HTTP_201_CREATED)
def create_follow_up(
    f_in: FollowUpCreate,
    request: Request,
    current_user: User = Depends(require_sales_or_admin),
    db: Session = Depends(get_db)
):
    customer = db.query(Customer).filter(Customer.id == f_in.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    assigned_to = f_in.assigned_to or current_user.id

    follow_up = FollowUp(
        customer_id=f_in.customer_id,
        enquiry_id=f_in.enquiry_id,
        assigned_to=assigned_to,
        follow_up_date=f_in.follow_up_date,
        follow_up_type=f_in.follow_up_type,
        notes=f_in.notes,
        status=f_in.status or FollowUpStatus.PENDING
    )
    db.add(follow_up)
    db.commit()
    db.refresh(follow_up)

    client_ip = request.client.host if request.client else None
    log_activity(
        db=db,
        action=ActivityAction.CREATE,
        description=f"Scheduled {follow_up.follow_up_type} follow-up with {customer.company_name} for {follow_up.follow_up_date.strftime('%Y-%m-%d %H:%M')}",
        entity_type="FOLLOW_UP",
        user_id=current_user.id,
        entity_id=follow_up.id,
        ip_address=client_ip
    )

    return to_follow_up_response(follow_up)


@router.get("/{follow_up_id}", response_model=FollowUpResponse)
def get_follow_up(
    follow_up_id: int,
    current_user: User = Depends(require_any_authenticated),
    db: Session = Depends(get_db)
):
    f = db.query(FollowUp).filter(FollowUp.id == follow_up_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Follow-up not found")
    return to_follow_up_response(f)


@router.put("/{follow_up_id}", response_model=FollowUpResponse)
def update_follow_up(
    follow_up_id: int,
    f_in: FollowUpUpdate,
    request: Request,
    current_user: User = Depends(require_sales_or_admin),
    db: Session = Depends(get_db)
):
    follow_up = db.query(FollowUp).filter(FollowUp.id == follow_up_id).first()
    if not follow_up:
        raise HTTPException(status_code=404, detail="Follow-up not found")

    update_data = f_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(follow_up, field, val)

    db.commit()
    db.refresh(follow_up)

    client_ip = request.client.host if request.client else None
    log_activity(
        db=db,
        action=ActivityAction.UPDATE,
        description=f"Updated follow-up #{follow_up.id} ({follow_up.status})",
        entity_type="FOLLOW_UP",
        user_id=current_user.id,
        entity_id=follow_up.id,
        ip_address=client_ip
    )

    return to_follow_up_response(follow_up)


@router.patch("/{follow_up_id}/complete", response_model=FollowUpResponse)
def complete_follow_up(
    follow_up_id: int,
    request: Request,
    current_user: User = Depends(require_sales_or_admin),
    db: Session = Depends(get_db)
):
    f = db.query(FollowUp).filter(FollowUp.id == follow_up_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Follow-up not found")

    f.status = FollowUpStatus.COMPLETED
    db.commit()
    db.refresh(f)

    client_ip = request.client.host if request.client else None
    log_activity(
        db=db,
        action=ActivityAction.STATUS_CHANGE,
        description=f"Completed follow-up #{f.id} with {f.customer.company_name if f.customer else 'customer'}",
        entity_type="FOLLOW_UP",
        user_id=current_user.id,
        entity_id=f.id,
        ip_address=client_ip
    )

    return to_follow_up_response(f)


@router.patch("/{follow_up_id}/cancel", response_model=FollowUpResponse)
def cancel_follow_up(
    follow_up_id: int,
    request: Request,
    current_user: User = Depends(require_sales_or_admin),
    db: Session = Depends(get_db)
):
    f = db.query(FollowUp).filter(FollowUp.id == follow_up_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Follow-up not found")

    f.status = FollowUpStatus.CANCELLED
    db.commit()
    db.refresh(f)

    client_ip = request.client.host if request.client else None
    log_activity(
        db=db,
        action=ActivityAction.STATUS_CHANGE,
        description=f"Cancelled follow-up #{f.id}",
        entity_type="FOLLOW_UP",
        user_id=current_user.id,
        entity_id=f.id,
        ip_address=client_ip
    )

    return to_follow_up_response(f)


@router.delete("/{follow_up_id}")
def delete_follow_up(
    follow_up_id: int,
    request: Request,
    current_user: User = Depends(require_sales_or_admin),
    db: Session = Depends(get_db)
):
    f = db.query(FollowUp).filter(FollowUp.id == follow_up_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Follow-up not found")

    db.delete(f)
    db.commit()

    client_ip = request.client.host if request.client else None
    log_activity(
        db=db,
        action=ActivityAction.DELETE,
        description=f"Deleted follow-up #{follow_up_id}",
        entity_type="FOLLOW_UP",
        user_id=current_user.id,
        entity_id=follow_up_id,
        ip_address=client_ip
    )

    return {"message": "Follow-up deleted successfully"}
