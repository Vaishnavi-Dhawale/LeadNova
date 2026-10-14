from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class EnquiryStatus:
    NEW = "NEW"
    IN_PROGRESS = "IN_PROGRESS"
    FOLLOW_UP = "FOLLOW_UP"
    CONVERTED = "CONVERTED"
    LOST = "LOST"
    CLOSED = "CLOSED"

    ALL_STATUSES = [NEW, IN_PROGRESS, FOLLOW_UP, CONVERTED, LOST, CLOSED]


class EnquiryPriority:
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    URGENT = "URGENT"

    ALL_PRIORITIES = [LOW, MEDIUM, HIGH, URGENT]


class EnquirySource:
    EMAIL = "EMAIL"
    WEBSITE = "WEBSITE"
    PHONE = "PHONE"
    REFERRAL = "REFERRAL"
    CAMPAIGN = "CAMPAIGN"
    WALK_IN = "WALK_IN"
    OTHER = "OTHER"

    ALL_SOURCES = [EMAIL, WEBSITE, PHONE, REFERRAL, CAMPAIGN, WALK_IN, OTHER]


class Enquiry(Base):
    __tablename__ = "enquiries"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=True)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="RESTRICT"), nullable=False)
    territory_id = Column(Integer, ForeignKey("territories.id", ondelete="SET NULL"), nullable=True)
    assigned_to = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    source = Column(String(50), nullable=False, default=EnquirySource.WEBSITE)
    priority = Column(String(30), nullable=False, default=EnquiryPriority.MEDIUM)
    status = Column(String(30), nullable=False, default=EnquiryStatus.NEW, index=True)
    product_interested = Column(String(150), nullable=True)
    estimated_value = Column(Float, default=0.0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    customer = relationship("Customer", back_populates="enquiries")
    category = relationship("Category", back_populates="enquiries")
    territory = relationship("Territory", back_populates="enquiries")
    assignee = relationship("User", back_populates="assigned_enquiries", foreign_keys=[assigned_to])
    follow_ups = relationship("FollowUp", back_populates="enquiry", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="enquiry", cascade="all, delete-orphan")
    email_leads = relationship("EmailLead", back_populates="enquiry")
    email_histories = relationship("EmailHistory", back_populates="enquiry")
