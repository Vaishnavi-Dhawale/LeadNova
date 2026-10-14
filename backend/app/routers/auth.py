from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.activity_log import ActivityAction
from app.schemas.auth import LoginRequest, TokenResponse, UserProfileResponse
from app.utils.security import verify_password, create_access_token
from app.utils.deps import get_current_user
from app.services.activity_service import log_activity

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
def login(login_data: LoginRequest, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact an administrator."
        )

    access_token = create_access_token(subject=user.id)

    client_ip = request.client.host if request.client else None
    log_activity(
        db=db,
        action=ActivityAction.LOGIN,
        description=f"User {user.email} logged in successfully",
        entity_type="USER",
        user_id=user.id,
        entity_id=user.id,
        ip_address=client_ip
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user_id=user.id,
        name=user.name,
        email=user.email,
        role=user.role
    )


@router.get("/me", response_model=UserProfileResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/logout")
def logout(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    client_ip = request.client.host if request.client else None
    log_activity(
        db=db,
        action=ActivityAction.LOGOUT,
        description=f"User {current_user.email} logged out",
        entity_type="USER",
        user_id=current_user.id,
        entity_id=current_user.id,
        ip_address=client_ip
    )
    return {"message": "Logged out successfully"}
