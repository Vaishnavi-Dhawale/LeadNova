from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.customer import Customer
from app.models.enquiry import Enquiry
from app.models.follow_up import FollowUp
from app.models.document import Document
from app.models.email import EmailHistory
from app.models.activity_log import ActivityLog, ActivityAction
from app.models.user import User, UserRole
from app.schemas.customer import (
    CustomerCreate, CustomerUpdate, CustomerResponse, CustomerDetailResponse
)
from app.utils.deps import require_any_authenticated, require_sales_or_admin, require_admin
from app.utils.pagination import PaginatedResponse, paginate
from app.services.activity_service import log_activity

router = APIRouter(prefix="/customers", tags=["Customers"])


def to_customer_response(c: Customer, enquiries_count: int = 0) -> CustomerResponse:
    creator_name = c.creator.name if c.creator else None
    territory_name = c.territory.name if c.territory else None
    return CustomerResponse(
        id=c.id,
        customer_name=c.customer_name,
        company_name=c.company_name,
        email=c.email,
        phone=c.phone,
        alternate_phone=c.alternate_phone,
        address=c.address,
        city=c.city,
        state=c.state,
        country=c.country,
        pincode=c.pincode,
        industry=c.industry,
        source=c.source,
        notes=c.notes,
        territory_id=c.territory_id,
        created_by=c.created_by,
        creator_name=creator_name,
        territory_name=territory_name,
        enquiries_count=enquiries_count,
        created_at=c.created_at,
        updated_at=c.updated_at
    )


@router.get("", response_model=PaginatedResponse[CustomerResponse])
def get_customers(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    territory_id: Optional[int] = Query(None),
    industry: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    sort_by: str = Query("id"),
    sort_order: str = Query("desc"),
    current_user: User = Depends(require_any_authenticated),
    db: Session = Depends(get_db)
):
    query = db.query(Customer)

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            (Customer.customer_name.ilike(s)) |
            (Customer.company_name.ilike(s)) |
            (Customer.email.ilike(s)) |
            (Customer.phone.ilike(s)) |
            (Customer.city.ilike(s))
        )

    if territory_id:
        query = query.filter(Customer.territory_id == territory_id)
    if industry:
        query = query.filter(Customer.industry == industry)
    if source:
        query = query.filter(Customer.source == source)

    # Sorting
    if hasattr(Customer, sort_by):
        col = getattr(Customer, sort_by)
        query = query.order_by(col.desc() if sort_order.lower() == "desc" else col.asc())
    else:
        query = query.order_by(Customer.id.desc())

    items, total, total_pages = paginate(query, page, page_size)

    # Calculate enquiry counts for these items
    customer_ids = [c.id for c in items]
    enq_counts = {}
    if customer_ids:
        counts = db.query(
            Enquiry.customer_id, func.count(Enquiry.id)
        ).filter(Enquiry.customer_id.in_(customer_ids)).group_by(Enquiry.customer_id).all()
        enq_counts = {cid: cnt for cid, cnt in counts}

    return PaginatedResponse(
        items=[to_customer_response(c, enq_counts.get(c.id, 0)) for c in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("/all", response_model=List[CustomerResponse])
def get_all_customers_compact(
    current_user: User = Depends(require_any_authenticated),
    db: Session = Depends(get_db)
):
    items = db.query(Customer).order_by(Customer.customer_name.asc()).all()
    return [to_customer_response(c, len(c.enquiries)) for c in items]


@router.post("", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
def create_customer(
    c_in: CustomerCreate,
    request: Request,
    current_user: User = Depends(require_sales_or_admin),
    db: Session = Depends(get_db)
):
    customer = Customer(
        customer_name=c_in.customer_name,
        company_name=c_in.company_name,
        email=c_in.email,
        phone=c_in.phone,
        alternate_phone=c_in.alternate_phone,
        address=c_in.address,
        city=c_in.city,
        state=c_in.state,
        country=c_in.country or "India",
        pincode=c_in.pincode,
        industry=c_in.industry,
        source=c_in.source,
        notes=c_in.notes,
        territory_id=c_in.territory_id,
        created_by=current_user.id
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)

    client_ip = request.client.host if request.client else None
    log_activity(
        db=db,
        action=ActivityAction.CREATE,
        description=f"Created customer {customer.customer_name} ({customer.company_name})",
        entity_type="CUSTOMER",
        user_id=current_user.id,
        entity_id=customer.id,
        ip_address=client_ip
    )

    return to_customer_response(customer, 0)


@router.get("/{customer_id}", response_model=CustomerDetailResponse)
def get_customer_detail(
    customer_id: int,
    current_user: User = Depends(require_any_authenticated),
    db: Session = Depends(get_db)
):
    c = db.query(Customer).filter(Customer.id == customer_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")

    base = to_customer_response(c, len(c.enquiries))

    enquiries_data = [
        {
            "id": e.id,
            "title": e.title,
            "category_name": e.category.name if e.category else None,
            "status": e.status,
            "priority": e.priority,
            "estimated_value": e.estimated_value,
            "assigned_to_name": e.assignee.name if e.assignee else None,
            "created_at": e.created_at
        }
        for e in c.enquiries
    ]

    follow_ups_data = [
        {
            "id": f.id,
            "follow_up_date": f.follow_up_date,
            "follow_up_type": f.follow_up_type,
            "notes": f.notes,
            "status": f.status,
            "assigned_to_name": f.assignee.name if f.assignee else None,
            "enquiry_id": f.enquiry_id
        }
        for f in c.follow_ups
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
        for d in c.documents
    ]

    email_history_data = [
        {
            "id": eh.id,
            "recipient": eh.recipient,
            "subject": eh.subject,
            "body": eh.body,
            "status": eh.status,
            "sent_at": eh.sent_at
        }
        for eh in c.email_histories
    ]

    activity_data = [
        {
            "id": a.id,
            "action": a.action,
            "description": a.description,
            "user_name": a.user.name if a.user else "System",
            "timestamp": a.timestamp
        }
        for a in db.query(ActivityLog).filter(
            ActivityLog.entity_type == "CUSTOMER",
            ActivityLog.entity_id == customer_id
        ).order_by(ActivityLog.timestamp.desc()).limit(15).all()
    ]

    return CustomerDetailResponse(
        **base.model_dump(),
        enquiries=enquiries_data,
        follow_ups=follow_ups_data,
        documents=documents_data,
        email_history=email_history_data,
        activity=activity_data
    )


@router.put("/{customer_id}", response_model=CustomerResponse)
def update_customer(
    customer_id: int,
    c_in: CustomerUpdate,
    request: Request,
    current_user: User = Depends(require_sales_or_admin),
    db: Session = Depends(get_db)
):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    update_data = c_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(customer, field, val)

    db.commit()
    db.refresh(customer)

    client_ip = request.client.host if request.client else None
    log_activity(
        db=db,
        action=ActivityAction.UPDATE,
        description=f"Updated customer {customer.customer_name} ({customer.company_name})",
        entity_type="CUSTOMER",
        user_id=current_user.id,
        entity_id=customer.id,
        ip_address=client_ip
    )

    return to_customer_response(customer, len(customer.enquiries))


@router.delete("/{customer_id}")
def delete_customer(
    customer_id: int,
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    name = customer.customer_name
    db.delete(customer)
    db.commit()

    client_ip = request.client.host if request.client else None
    log_activity(
        db=db,
        action=ActivityAction.DELETE,
        description=f"Admin {current_user.email} deleted customer {name}",
        entity_type="CUSTOMER",
        user_id=current_user.id,
        entity_id=customer_id,
        ip_address=client_ip
    )
    return {"message": "Customer deleted successfully"}
