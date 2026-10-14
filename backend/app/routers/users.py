from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole
from app.models.activity_log import ActivityAction
from app.schemas.user import UserCreate, UserUpdate, UserResponse
from app.utils.security import get_password_hash
from app.utils.deps import require_admin
from app.utils.pagination import PaginatedResponse, paginate
from app.services.activity_service import log_activity

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("", response_model=PaginatedResponse[UserResponse])
def get_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    query = db.query(User)
    if search:
        s = f"%{search.strip()}%"
        query = query.filter((User.name.ilike(s)) | (User.email.ilike(s)))
    if role:
        query = query.filter(User.role == role)
    if is_active is not None:
        query = query.filter(User.is_active == is_active)

    query = query.order_by(User.id.desc())
    items, total, total_pages = paginate(query, page, page_size)

    return PaginatedResponse(
        items=[UserResponse.model_validate(u) for u in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user_in: UserCreate,
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists"
        )
    
    if user_in.role not in UserRole.ALL_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Allowed roles: {UserRole.ALL_ROLES}"
        )

    user = User(
        name=user_in.name,
        email=user_in.email,
        password_hash=get_password_hash(user_in.password),
        role=user_in.role,
        is_active=user_in.is_active
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    client_ip = request.client.host if request.client else None
    log_activity(
        db=db,
        action=ActivityAction.CREATE,
        description=f"Admin {current_user.email} created user {user.email} with role {user.role}",
        entity_type="USER",
        user_id=current_user.id,
        entity_id=user.id,
        ip_address=client_ip
    )

    return user


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_update: UserUpdate,
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user_update.email and user_update.email != user.email:
        conflict = db.query(User).filter(User.email == user_update.email).first()
        if conflict:
            raise HTTPException(status_code=400, detail="Email is already taken by another user")
        user.email = user_update.email

    if user_update.name is not None:
        user.name = user_update.name
    if user_update.role is not None:
        if user_update.role not in UserRole.ALL_ROLES:
            raise HTTPException(status_code=400, detail="Invalid role specified")
        user.role = user_update.role
    if user_update.password:
        user.password_hash = get_password_hash(user_update.password)

    activation_changed = False
    if user_update.is_active is not None and user_update.is_active != user.is_active:
        user.is_active = user_update.is_active
        activation_changed = True

    db.commit()
    db.refresh(user)

    client_ip = request.client.host if request.client else None
    action_type = ActivityAction.UPDATE
    if activation_changed:
        action_type = ActivityAction.USER_ACTIVATED if user.is_active else ActivityAction.USER_DEACTIVATED

    log_activity(
        db=db,
        action=action_type,
        description=f"Admin {current_user.email} updated user {user.email}",
        entity_type="USER",
        user_id=current_user.id,
        entity_id=user.id,
        ip_address=client_ip
    )

    return user


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")

    client_ip = request.client.host if request.client else None
    user_email = user.email
    user_id_val = user.id

    try:
        db.delete(user)
        db.commit()
        log_activity(
            db=db,
            action=ActivityAction.DELETE,
            description=f"Admin {current_user.email} deleted user {user_email}",
            entity_type="USER",
            user_id=current_user.id,
            entity_id=user_id_val,
            ip_address=client_ip
        )
        return {"message": "User deleted successfully"}
    except Exception:
        db.rollback()
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            user.is_active = False
            db.commit()
            log_activity(
                db=db,
                action=ActivityAction.USER_DEACTIVATED,
                description=f"Admin {current_user.email} deactivated user {user_email} (has linked history)",
                entity_type="USER",
                user_id=current_user.id,
                entity_id=user_id_val,
                ip_address=client_ip
            )
        return {"message": "User has linked records and has been deactivated"}

