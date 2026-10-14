from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict
from app.models.follow_up import FollowUpType, FollowUpStatus


class FollowUpBase(BaseModel):
    customer_id: int
    enquiry_id: Optional[int] = None
    assigned_to: Optional[int] = None
    follow_up_date: datetime
    follow_up_type: str = Field(default=FollowUpType.CALL)
    notes: Optional[str] = None
    status: str = Field(default=FollowUpStatus.PENDING)


class FollowUpCreate(FollowUpBase):
    pass


class FollowUpUpdate(BaseModel):
    customer_id: Optional[int] = None
    enquiry_id: Optional[int] = None
    assigned_to: Optional[int] = None
    follow_up_date: Optional[datetime] = None
    follow_up_type: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class FollowUpResponse(FollowUpBase):
    id: int
    customer_name: Optional[str] = None
    company_name: Optional[str] = None
    enquiry_title: Optional[str] = None
    assigned_to_name: Optional[str] = None
    is_overdue: Optional[bool] = False
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
