from typing import Optional
from sqlalchemy.orm import Session
from app.models.activity_log import ActivityLog


def log_activity(
    db: Session,
    action: str,
    description: str,
    entity_type: str,
    user_id: Optional[int] = None,
    entity_id: Optional[int] = None,
    ip_address: Optional[str] = None
) -> ActivityLog:
    try:
        activity = ActivityLog(
            user_id=user_id,
            action=action,
            description=description,
            entity_type=entity_type,
            entity_id=entity_id,
            ip_address=ip_address
        )
        db.add(activity)
        db.commit()
        db.refresh(activity)
        return activity
    except Exception as e:
        db.rollback()
        # Logging failure should not disrupt the primary CRM operation
        print(f"[ActivityLog Error] Failed to log activity: {e}")
        return None
