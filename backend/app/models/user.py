from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from app.database import Base


class UserRole:
    ADMIN = "ADMIN"
    SALES_USER = "SALES_USER"
    MANAGER = "MANAGER"

    ALL_ROLES = [ADMIN, SALES_USER, MANAGER]


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(30), nullable=False, default=UserRole.SALES_USER)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    assigned_territories = relationship("Territory", back_populates="assigned_user", foreign_keys="Territory.assigned_sales_user")
    created_customers = relationship("Customer", back_populates="creator", foreign_keys="Customer.created_by")
    assigned_enquiries = relationship("Enquiry", back_populates="assignee", foreign_keys="Enquiry.assigned_to")
    assigned_follow_ups = relationship("FollowUp", back_populates="assignee", foreign_keys="FollowUp.assigned_to")
    assigned_email_leads = relationship("EmailLead", back_populates="assignee", foreign_keys="EmailLead.assigned_to")
    created_campaigns = relationship("Campaign", back_populates="creator", foreign_keys="Campaign.created_by")
    uploaded_documents = relationship("Document", back_populates="uploader", foreign_keys="Document.uploaded_by")
    activity_logs = relationship("ActivityLog", back_populates="user", cascade="all, delete-orphan")
