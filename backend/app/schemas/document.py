from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class DocumentResponse(BaseModel):
    id: int
    filename: str
    original_filename: str
    file_path: str
    file_size: int
    content_type: str
    customer_id: Optional[int]
    customer_name: Optional[str] = None
    enquiry_id: Optional[int]
    enquiry_title: Optional[str] = None
    uploaded_by: Optional[int]
    uploader_name: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
