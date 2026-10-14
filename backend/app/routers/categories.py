from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.category import Category
from app.models.user import User
from app.models.activity_log import ActivityAction
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse
from app.utils.deps import require_admin, require_any_authenticated
from app.utils.pagination import PaginatedResponse, paginate
from app.services.activity_service import log_activity

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get("", response_model=PaginatedResponse[CategoryResponse])
def get_categories(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    current_user: User = Depends(require_any_authenticated),
    db: Session = Depends(get_db)
):
    query = db.query(Category)
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(Category.name.ilike(s))
    if is_active is not None:
        query = query.filter(Category.is_active == is_active)

    query = query.order_by(Category.id.desc())
    items, total, total_pages = paginate(query, page, page_size)

    return PaginatedResponse(
        items=[CategoryResponse.model_validate(c) for c in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("/all", response_model=List[CategoryResponse])
def get_all_categories(
    current_user: User = Depends(require_any_authenticated),
    db: Session = Depends(get_db)
):
    items = db.query(Category).filter(Category.is_active == True).order_by(Category.name.asc()).all()
    return [CategoryResponse.model_validate(c) for c in items]


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    c_in: CategoryCreate,
    request: Request,
    current_user: User = Depends(require_any_authenticated),
    db: Session = Depends(get_db)
):
    existing = db.query(Category).filter(Category.name == c_in.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Category with this name already exists")

    cat = Category(
        name=c_in.name,
        description=c_in.description,
        is_active=c_in.is_active
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)

    client_ip = request.client.host if request.client else None
    log_activity(
        db=db,
        action=ActivityAction.CREATE,
        description=f"Created category {cat.name}",
        entity_type="CATEGORY",
        user_id=current_user.id,
        entity_id=cat.id,
        ip_address=client_ip
    )
    return cat


@router.get("/{category_id}", response_model=CategoryResponse)
def get_category(
    category_id: int,
    current_user: User = Depends(require_any_authenticated),
    db: Session = Depends(get_db)
):
    cat = db.query(Category).filter(Category.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    return cat


@router.put("/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: int,
    c_in: CategoryUpdate,
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    cat = db.query(Category).filter(Category.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")

    if c_in.name and c_in.name != cat.name:
        conflict = db.query(Category).filter(Category.name == c_in.name).first()
        if conflict:
            raise HTTPException(status_code=400, detail="Category name already exists")
        cat.name = c_in.name

    if c_in.description is not None:
        cat.description = c_in.description
    if c_in.is_active is not None:
        cat.is_active = c_in.is_active

    db.commit()
    db.refresh(cat)

    client_ip = request.client.host if request.client else None
    log_activity(
        db=db,
        action=ActivityAction.UPDATE,
        description=f"Updated category {cat.name}",
        entity_type="CATEGORY",
        user_id=current_user.id,
        entity_id=cat.id,
        ip_address=client_ip
    )
    return cat


@router.delete("/{category_id}")
def delete_category(
    category_id: int,
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    cat = db.query(Category).filter(Category.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")

    name = cat.name
    db.delete(cat)
    db.commit()

    client_ip = request.client.host if request.client else None
    log_activity(
        db=db,
        action=ActivityAction.DELETE,
        description=f"Deleted category {name}",
        entity_type="CATEGORY",
        user_id=current_user.id,
        entity_id=category_id,
        ip_address=client_ip
    )
    return {"message": "Category deleted successfully"}
