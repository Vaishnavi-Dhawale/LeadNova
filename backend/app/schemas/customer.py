from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class CustomerBase(BaseModel):
    customer_name: str = Field(..., min_length=2, max_length=150)
    company_name: str = Field(..., min_length=2, max_length=150)
    email: EmailStr
    phone: str = Field(..., min_length=5, max_length=30)
    alternate_phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = "India"
    pincode: Optional[str] = None
    industry: Optional[str] = None
    source: Optional[str] = "WEBSITE"
    notes: Optional[str] = None
    territory_id: Optional[int] = None


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    customer_name: Optional[str] = Field(None, min_length=2, max_length=150)
    company_name: Optional[str] = Field(None, min_length=2, max_length=150)
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    alternate_phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    pincode: Optional[str] = None
    industry: Optional[str] = None
    source: Optional[str] = None
    notes: Optional[str] = None
    territory_id: Optional[int] = None


class CustomerResponse(CustomerBase):
    id: int
    created_by: Optional[int] = None
    creator_name: Optional[str] = None
    territory_name: Optional[str] = None
    enquiries_count: Optional[int] = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CustomerDetailResponse(CustomerResponse):
    enquiries: List[Any] = []
    follow_ups: List[Any] = []
    documents: List[Any] = []
    email_history: List[Any] = []
    activity: List[Any] = []
