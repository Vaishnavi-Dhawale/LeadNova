from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, Field, ConfigDict
from app.models.enquiry import EnquiryStatus, EnquiryPriority, EnquirySource


class EnquiryBase(BaseModel):
    customer_id: int
    title: str = Field(..., min_length=2, max_length=200)
    description: Optional[str] = None
    category_id: int
    territory_id: Optional[int] = None
    assigned_to: Optional[int] = None
    source: str = Field(default=EnquirySource.WEBSITE)
    priority: str = Field(default=EnquiryPriority.MEDIUM)
    status: str = Field(default=EnquiryStatus.NEW)
    product_interested: Optional[str] = None
    estimated_value: float = Field(default=0.0, ge=0.0)


class EnquiryCreate(EnquiryBase):
    follow_up_date: Optional[datetime] = None


class EnquiryUpdate(BaseModel):
    customer_id: Optional[int] = None
    title: Optional[str] = Field(None, min_length=2, max_length=200)
    description: Optional[str] = None
    category_id: Optional[int] = None
    territory_id: Optional[int] = None
    assigned_to: Optional[int] = None
    product_interested: Optional[str] = None
    source: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    estimated_value: Optional[float] = Field(None, ge=0.0)
    follow_up_date: Optional[datetime] = None


class EnquiryStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None


class EnquiryResponse(EnquiryBase):
    id: int
    customer_name: Optional[str] = None
    company_name: Optional[str] = None
    category_name: Optional[str] = None
    territory_name: Optional[str] = None
    assigned_to_name: Optional[str] = None
    next_follow_up_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EnquiryDetailResponse(EnquiryResponse):
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    follow_ups: List[Any] = []
    documents: List[Any] = []
    email_history: List[Any] = []
