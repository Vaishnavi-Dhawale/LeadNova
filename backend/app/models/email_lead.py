from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class EmailLeadStatus:
    NEW = "NEW"
    REVIEWED = "REVIEWED"
    QUALIFIED = "QUALIFIED"
    CONVERTED = "CONVERTED"
    REJECTED = "REJECTED"

    ALL_STATUSES = [NEW, REVIEWED, QUALIFIED, CONVERTED, REJECTED]


class EmailLead(Base):
    __tablename__ = "email_leads"

    id = Column(Integer, primary_key=True, index=True)
    sender_name = Column(String(150), nullable=False)
    sender_email = Column(String(255), nullable=False, index=True)
    recipient = Column(String(255), nullable=True)
    subject = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)
    body_html = Column(Text, nullable=True)
    attachments_info = Column(Text, nullable=True)
    company = Column(String(150), nullable=True)
    received_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    status = Column(String(30), nullable=False, default=EmailLeadStatus.NEW, index=True)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    assigned_to = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="SET NULL"), nullable=True)
    enquiry_id = Column(Integer, ForeignKey("enquiries.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    assignee = relationship("User", back_populates="assigned_email_leads", foreign_keys=[assigned_to])
    customer = relationship("Customer", back_populates="email_leads")
    enquiry = relationship("Enquiry", back_populates="email_leads")
    category = relationship("Category", foreign_keys=[category_id])
