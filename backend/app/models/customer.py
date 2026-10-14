from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    customer_name = Column(String(150), nullable=False, index=True)
    company_name = Column(String(150), nullable=False, index=True)
    email = Column(String(255), nullable=False, index=True)
    phone = Column(String(30), nullable=False)
    alternate_phone = Column(String(30), nullable=True)
    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    country = Column(String(100), nullable=True, default="India")
    pincode = Column(String(20), nullable=True)
    industry = Column(String(100), nullable=True)
    source = Column(String(50), nullable=True, default="WEBSITE")
    notes = Column(Text, nullable=True)
    territory_id = Column(Integer, ForeignKey("territories.id", ondelete="SET NULL"), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    territory = relationship("Territory", back_populates="customers")
    creator = relationship("User", back_populates="created_customers", foreign_keys=[created_by])
    enquiries = relationship("Enquiry", back_populates="customer", cascade="all, delete-orphan")
    follow_ups = relationship("FollowUp", back_populates="customer", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="customer", cascade="all, delete-orphan")
    email_leads = relationship("EmailLead", back_populates="customer")
    email_histories = relationship("EmailHistory", back_populates="customer")
