from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, EmailStr, Field, ConfigDict, model_validator
from app.models.user import UserRole


class UserBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    email: EmailStr
    role: str = Field(default=UserRole.SALES_USER)
    is_active: bool = True

    @model_validator(mode="before")
    @classmethod
    def map_full_name(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "full_name" in data and not data.get("name"):
                data["name"] = data["full_name"]
        return data


class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=100)


class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=120)
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=6, max_length=100)

    @model_validator(mode="before")
    @classmethod
    def map_full_name(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "full_name" in data and not data.get("name"):
                data["name"] = data["full_name"]
        return data


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
