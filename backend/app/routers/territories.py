from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.territory import Territory
from app.models.user import User
from app.models.activity_log import ActivityAction
from app.schemas.territory import TerritoryCreate, TerritoryUpdate, TerritoryResponse
from app.utils.deps import require_admin, require_any_authenticated
from app.utils.pagination import PaginatedResponse, paginate
from app.services.activity_service import log_activity

router = APIRouter(prefix="/territories", tags=["Territories"])


def to_territory_response(t: Territory) -> TerritoryResponse:
    assigned_name = t.assigned_user.name if t.assigned_user else None
    return TerritoryResponse(
        id=t.id,
        name=t.name,
        description=t.description,
        state_region=t.state_region,
        assigned_sales_user=t.assigned_sales_user,
        assigned_user_name=assigned_name,
        is_active=t.is_active,
        created_at=t.created_at,
        updated_at=t.updated_at
    )


@router.get("", response_model=PaginatedResponse[TerritoryResponse])
def get_territories(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    current_user: User = Depends(require_any_authenticated),
    db: Session = Depends(get_db)
):
    query = db.query(Territory)
    if search:
        s = f"%{search.strip()}%"
        query = query.filter((Territory.name.ilike(s)) | (Territory.state_region.ilike(s)))
    if is_active is not None:
        query = query.filter(Territory.is_active == is_active)

    query = query.order_by(Territory.id.desc())
    items, total, total_pages = paginate(query, page, page_size)

    return PaginatedResponse(
        items=[to_territory_response(t) for t in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("/all", response_model=List[TerritoryResponse])
def get_all_territories(
    current_user: User = Depends(require_any_authenticated),
    db: Session = Depends(get_db)
):
    items = db.query(Territory).filter(Territory.is_active == True).order_by(Territory.name.asc()).all()
    return [to_territory_response(t) for t in items]


@router.post("", response_model=TerritoryResponse, status_code=status.HTTP_201_CREATED)
def create_territory(
    t_in: TerritoryCreate,
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    existing = db.query(Territory).filter(Territory.name == t_in.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Territory with this name already exists")

    territory = Territory(
        name=t_in.name,
        description=t_in.description,
        state_region=t_in.state_region,
        assigned_sales_user=t_in.assigned_sales_user,
        is_active=t_in.is_active
    )
    db.add(territory)
    db.commit()
    db.refresh(territory)

    client_ip = request.client.host if request.client else None
    log_activity(
        db=db,
        action=ActivityAction.CREATE,
        description=f"Created territory {territory.name}",
        entity_type="TERRITORY",
        user_id=current_user.id,
        entity_id=territory.id,
        ip_address=client_ip
    )
    return to_territory_response(territory)


@router.get("/{territory_id}", response_model=TerritoryResponse)
def get_territory(
    territory_id: int,
    current_user: User = Depends(require_any_authenticated),
    db: Session = Depends(get_db)
):
    t = db.query(Territory).filter(Territory.id == territory_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Territory not found")
    return to_territory_response(t)


@router.put("/{territory_id}", response_model=TerritoryResponse)
def update_territory(
    territory_id: int,
    t_in: TerritoryUpdate,
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    t = db.query(Territory).filter(Territory.id == territory_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Territory not found")

    if t_in.name and t_in.name != t.name:
        conflict = db.query(Territory).filter(Territory.name == t_in.name).first()
        if conflict:
            raise HTTPException(status_code=400, detail="Territory name already taken")
        t.name = t_in.name

    if t_in.description is not None:
        t.description = t_in.description
    if t_in.state_region is not None:
        t.state_region = t_in.state_region
    if t_in.assigned_sales_user is not None:
        t.assigned_sales_user = t_in.assigned_sales_user
    if t_in.is_active is not None:
        t.is_active = t_in.is_active

    db.commit()
    db.refresh(t)

    client_ip = request.client.host if request.client else None
    log_activity(
        db=db,
        action=ActivityAction.UPDATE,
        description=f"Updated territory {t.name}",
        entity_type="TERRITORY",
        user_id=current_user.id,
        entity_id=t.id,
        ip_address=client_ip
    )
    return to_territory_response(t)


@router.delete("/{territory_id}")
def delete_territory(
    territory_id: int,
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    t = db.query(Territory).filter(Territory.id == territory_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Territory not found")

    name = t.name
    db.delete(t)
    db.commit()

    client_ip = request.client.host if request.client else None
    log_activity(
        db=db,
        action=ActivityAction.DELETE,
        description=f"Deleted territory {name}",
        entity_type="TERRITORY",
        user_id=current_user.id,
        entity_id=territory_id,
        ip_address=client_ip
    )
    return {"message": "Territory deleted successfully"}
