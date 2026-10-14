from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class TerritoryBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None
    state_region: str = Field(..., min_length=2, max_length=100)
    assigned_sales_user: Optional[int] = None
    is_active: bool = True


class TerritoryCreate(TerritoryBase):
    pass


class TerritoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = None
    state_region: Optional[str] = Field(None, min_length=2, max_length=100)
    assigned_sales_user: Optional[int] = None
    is_active: Optional[bool] = None


class TerritoryResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    state_region: str
    assigned_sales_user: Optional[int]
    assigned_user_name: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
