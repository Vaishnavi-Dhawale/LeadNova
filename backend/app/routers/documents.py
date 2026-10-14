import os
import uuid
import shutil
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.config import settings
from app.models.document import Document
from app.models.customer import Customer
from app.models.enquiry import Enquiry
from app.models.user import User
from app.models.activity_log import ActivityAction
from app.schemas.document import DocumentResponse
from app.utils.deps import require_any_authenticated, require_sales_or_admin
from app.services.activity_service import log_activity

router = APIRouter(prefix="/documents", tags=["Documents"])

ALLOWED_EXTENSIONS = {
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".png", ".jpg", ".jpeg", ".csv", ".txt", ".zip"
}


def to_document_response(d: Document) -> DocumentResponse:
    customer_name = d.customer.customer_name if d.customer else None
    enquiry_title = d.enquiry.title if d.enquiry else None
    uploader_name = d.uploader.name if d.uploader else None

    return DocumentResponse(
        id=d.id,
        filename=d.filename,
        original_filename=d.original_filename,
        file_path=f"/api/v1/documents/{d.id}/download",
        file_size=d.file_size,
        content_type=d.content_type,
        customer_id=d.customer_id,
        customer_name=customer_name,
        enquiry_id=d.enquiry_id,
        enquiry_title=enquiry_title,
        uploaded_by=d.uploaded_by,
        uploader_name=uploader_name,
        created_at=d.created_at
    )


@router.get("", response_model=List[DocumentResponse])
def get_documents(
    customer_id: Optional[int] = None,
    enquiry_id: Optional[int] = None,
    current_user: User = Depends(require_any_authenticated),
    db: Session = Depends(get_db)
):
    query = db.query(Document)
    if customer_id:
        query = query.filter(Document.customer_id == customer_id)
    if enquiry_id:
        query = query.filter(Document.enquiry_id == enquiry_id)

    docs = query.order_by(Document.id.desc()).all()
    return [to_document_response(d) for d in docs]


@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    customer_id: Optional[int] = Form(None),
    enquiry_id: Optional[int] = Form(None),
    request: Request = None,
    current_user: User = Depends(require_sales_or_admin),
    db: Session = Depends(get_db)
):
    # Validate customer / enquiry if provided
    if customer_id:
        c = db.query(Customer).filter(Customer.id == customer_id).first()
        if not c:
            raise HTTPException(status_code=404, detail="Customer not found")
    if enquiry_id:
        e = db.query(Enquiry).filter(Enquiry.id == enquiry_id).first()
        if not e:
            raise HTTPException(status_code=404, detail="Enquiry not found")

    # Extension validation
    original_name = file.filename or "unknown"
    _, ext = os.path.splitext(original_name)
    ext = ext.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File extension '{ext}' is not permitted. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )

    # Prepare upload directory
    upload_dir = os.path.abspath(settings.UPLOAD_DIR)
    os.makedirs(upload_dir, exist_ok=True)

    # Generate secure random stored filename
    stored_filename = f"{uuid.uuid4().hex}{ext}"
    dest_path = os.path.join(upload_dir, stored_filename)

    # Save and calculate file size
    file_size = 0
    try:
        with open(dest_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        file_size = os.path.getsize(dest_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save uploaded file: {str(e)}")

    # Check max file size (e.g. 10MB)
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if file_size > max_bytes:
        if os.path.exists(dest_path):
            os.remove(dest_path)
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB}MB"
        )

    doc = Document(
        filename=stored_filename,
        original_filename=original_name,
        file_path=dest_path,
        file_size=file_size,
        content_type=file.content_type or "application/octet-stream",
        customer_id=customer_id,
        enquiry_id=enquiry_id,
        uploaded_by=current_user.id
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    client_ip = request.client.host if request and request.client else None
    log_activity(
        db=db,
        action=ActivityAction.DOCUMENT_UPLOAD,
        description=f"Uploaded document '{original_name}' ({file_size // 1024} KB)",
        entity_type="DOCUMENT",
        user_id=current_user.id,
        entity_id=doc.id,
        ip_address=client_ip
    )

    return to_document_response(doc)


@router.get("/{document_id}/download")
def download_document(
    document_id: int,
    current_user: User = Depends(require_any_authenticated),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="Physical file missing on server storage")

    return FileResponse(
        path=doc.file_path,
        filename=doc.original_filename,
        media_type=doc.content_type
    )


@router.delete("/{document_id}")
def delete_document(
    document_id: int,
    request: Request,
    current_user: User = Depends(require_sales_or_admin),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    original_name = doc.original_filename
    # Delete physical file
    if os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except Exception:
            pass

    db.delete(doc)
    db.commit()

    client_ip = request.client.host if request.client else None
    log_activity(
        db=db,
        action=ActivityAction.DELETE,
        description=f"Deleted document '{original_name}'",
        entity_type="DOCUMENT",
        user_id=current_user.id,
        entity_id=document_id,
        ip_address=client_ip
    )

    return {"message": "Document deleted successfully"}
