from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class EmailTemplateBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    subject: str = Field(..., min_length=2, max_length=255)
    body: str = Field(..., min_length=5)
    category: Optional[str] = "General"


class EmailTemplateCreate(EmailTemplateBase):
    pass


class EmailTemplateUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    subject: Optional[str] = Field(None, min_length=2, max_length=255)
    body: Optional[str] = Field(None, min_length=5)
    category: Optional[str] = None


class EmailTemplateResponse(EmailTemplateBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SendEmailRequest(BaseModel):
    recipient: EmailStr
    subject: str = Field(..., min_length=2, max_length=255)
    body: str = Field(..., min_length=2)
    template_id: Optional[int] = None
    customer_id: Optional[int] = None
    enquiry_id: Optional[int] = None


class EmailHistoryResponse(BaseModel):
    id: int
    sender: str
    recipient: str
    subject: str
    body: str
    customer_id: Optional[int]
    customer_name: Optional[str] = None
    enquiry_id: Optional[int]
    enquiry_title: Optional[str] = None
    status: str
    sent_at: datetime

    model_config = ConfigDict(from_attributes=True)
