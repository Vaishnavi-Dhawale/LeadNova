from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from app.models.email_lead import EmailLeadStatus


class EmailLeadBase(BaseModel):
    sender_name: str = Field(..., min_length=2, max_length=150)
    sender_email: EmailStr
    recipient: Optional[str] = None
    subject: str = Field(..., min_length=2, max_length=255)
    body: str
    body_html: Optional[str] = None
    attachments_info: Optional[str] = None
    company: Optional[str] = None
    status: str = Field(default=EmailLeadStatus.NEW)
    category_id: Optional[int] = None
    assigned_to: Optional[int] = None


class EmailLeadCreate(EmailLeadBase):
    received_at: Optional[datetime] = None


class EmailLeadUpdate(BaseModel):
    sender_name: Optional[str] = None
    sender_email: Optional[EmailStr] = None
    recipient: Optional[str] = None
    subject: Optional[str] = None
    body: Optional[str] = None
    body_html: Optional[str] = None
    attachments_info: Optional[str] = None
    company: Optional[str] = None
    status: Optional[str] = None
    category_id: Optional[int] = None
    assigned_to: Optional[int] = None


class EmailLeadConvert(BaseModel):
    customer_name: Optional[str] = None
    phone: str = Field(..., min_length=5, max_length=30)
    category_id: int
    product_interested: Optional[str] = None
    territory_id: Optional[int] = None
    estimated_value: Optional[float] = Field(default=0.0, ge=0.0)
    assigned_to: Optional[int] = None
    notes: Optional[str] = None


class EmailLeadResponse(EmailLeadBase):
    id: int
    received_at: datetime
    customer_id: Optional[int] = None
    enquiry_id: Optional[int] = None
    customer_name: Optional[str] = None
    assigned_to_name: Optional[str] = None
    category_name: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
