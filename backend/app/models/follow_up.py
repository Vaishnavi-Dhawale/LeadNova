from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class FollowUpType:
    CALL = "CALL"
    EMAIL = "EMAIL"
    MEETING = "MEETING"
    VISIT = "VISIT"
    OTHER = "OTHER"

    ALL_TYPES = [CALL, EMAIL, MEETING, VISIT, OTHER]


class FollowUpStatus:
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    MISSED = "MISSED"
    CANCELLED = "CANCELLED"

    ALL_STATUSES = [PENDING, COMPLETED, MISSED, CANCELLED]


class FollowUp(Base):
    __tablename__ = "follow_ups"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True)
    enquiry_id = Column(Integer, ForeignKey("enquiries.id", ondelete="CASCADE"), nullable=True, index=True)
    assigned_to = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    follow_up_date = Column(DateTime, nullable=False, index=True)
    follow_up_type = Column(String(30), nullable=False, default=FollowUpType.CALL)
    notes = Column(Text, nullable=True)
    status = Column(String(30), nullable=False, default=FollowUpStatus.PENDING, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    customer = relationship("Customer", back_populates="follow_ups")
    enquiry = relationship("Enquiry", back_populates="follow_ups")
    assignee = relationship("User", back_populates="assigned_follow_ups", foreign_keys=[assigned_to])
