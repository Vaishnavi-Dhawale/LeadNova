from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict
from app.models.campaign import CampaignStatus


class CampaignBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    description: Optional[str] = None
    status: str = Field(default=CampaignStatus.DRAFT)
    target_segment: Optional[str] = Field(default="All Customers")
    email_subject: Optional[str] = None
    email_body: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    scheduled_at: Optional[datetime] = None


class CampaignCreate(CampaignBase):
    pass


class CampaignUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=150)
    description: Optional[str] = None
    status: Optional[str] = None
    target_segment: Optional[str] = None
    email_subject: Optional[str] = None
    email_body: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    scheduled_at: Optional[datetime] = None


class CampaignResponse(CampaignBase):
    id: int
    created_by: Optional[int] = None
    creator_name: Optional[str] = None
    sent_by: Optional[int] = None
    sent_by_name: Optional[str] = None
    sent_at: Optional[datetime] = None
    recipient_count: Optional[int] = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
