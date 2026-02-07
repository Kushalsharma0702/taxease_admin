"""
Client model
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Integer, Float, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Client(Base):
    """Client model for tax filing"""
    __tablename__ = "clients"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False, index=True)
    email = Column(String(255), nullable=False, index=True)
    phone = Column(String(20), nullable=True)
    
    filing_year = Column(Integer, nullable=False, index=True)
    status = Column(String(50), nullable=False, default="documents_pending", index=True)
    # Status options: documents_pending, under_review, cost_estimate_sent, 
    # awaiting_payment, in_preparation, awaiting_approval, filed, completed
    
    payment_status = Column(String(20), nullable=False, default="pending", index=True)
    # Payment status: pending, partial, paid, overdue
    
    assigned_admin_id = Column(UUID(as_uuid=True), ForeignKey("admin_users.id"), nullable=True, index=True)
    
    total_amount = Column(Float, nullable=False, default=0.0)
    paid_amount = Column(Float, nullable=False, default=0.0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    assigned_admin = relationship("AdminUser", back_populates="assigned_clients", foreign_keys=[assigned_admin_id])
    documents = relationship("Document", back_populates="client", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="client", cascade="all, delete-orphan")
    notes = relationship("Note", back_populates="client", cascade="all, delete-orphan")
    cost_estimates = relationship("CostEstimate", back_populates="client", cascade="all, delete-orphan")


