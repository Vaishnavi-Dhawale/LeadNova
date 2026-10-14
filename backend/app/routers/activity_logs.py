from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.activity_log import ActivityLog, ActivityAction
from app.models.user import User
from app.schemas.activity_log import ActivityLogResponse
from app.utils.deps import require_admin
from app.utils.pagination import PaginatedResponse, paginate

router = APIRouter(prefix="/activity-logs", tags=["Activity Logs"])


def to_activity_response(a: ActivityLog) -> ActivityLogResponse:
    user_name = a.user.name if a.user else "System"
    return ActivityLogResponse(
        id=a.id,
        user_id=a.user_id,
        user_name=user_name,
        action=a.action,
        description=a.description,
        entity_type=a.entity_type,
        entity_id=a.entity_id,
        ip_address=a.ip_address,
        timestamp=a.timestamp
    )


@router.get("", response_model=PaginatedResponse[ActivityLogResponse])
def get_activity_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
    search: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    entity_type: Optional[str] = Query(None),
    user_id: Optional[int] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    query = db.query(ActivityLog)

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            (ActivityLog.description.ilike(s)) |
            (ActivityLog.action.ilike(s)) |
            (ActivityLog.entity_type.ilike(s))
        )

    if action:
        act_upper = action.strip().upper()
        mapping = {
            "CREATED": ActivityAction.CREATE,
            "CREATE": ActivityAction.CREATE,
            "UPDATED": ActivityAction.UPDATE,
            "UPDATE": ActivityAction.UPDATE,
            "DELETED": ActivityAction.DELETE,
            "DELETE": ActivityAction.DELETE,
            "CONVERTED": ActivityAction.STATUS_CHANGE,
            "STATUS_CHANGE": ActivityAction.STATUS_CHANGE,
            "SENT": ActivityAction.EMAIL_SENT,
            "EMAIL_SENT": ActivityAction.EMAIL_SENT,
            "LOGIN": ActivityAction.LOGIN,
            "LOGOUT": ActivityAction.LOGOUT,
            "USER_ACTIVATED": ActivityAction.USER_ACTIVATED,
            "USER_DEACTIVATED": ActivityAction.USER_DEACTIVATED,
        }
        resolved = mapping.get(act_upper, act_upper)
        query = query.filter((ActivityLog.action == resolved) | (ActivityLog.action.ilike(f"%{act_upper}%")))
    if entity_type:
        query = query.filter(ActivityLog.entity_type == entity_type)
    if user_id:
        query = query.filter(ActivityLog.user_id == user_id)
    if start_date:
        query = query.filter(ActivityLog.timestamp >= start_date)
    if end_date:
        query = query.filter(ActivityLog.timestamp <= end_date)

    query = query.order_by(ActivityLog.timestamp.desc())
    items, total, total_pages = paginate(query, page, page_size)

    return PaginatedResponse(
        items=[to_activity_response(a) for a in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )
