"""
Payment model
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Float, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Payment(Base):
    """Payment model"""
    __tablename__ = "payments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False, index=True)
    
    amount = Column(Float, nullable=False)
    method = Column(String(50), nullable=False)  # E-Transfer, Credit Card, Debit, etc.
    note = Column(Text, nullable=True)
    
    created_by_id = Column(UUID(as_uuid=True), ForeignKey("admin_users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    client = relationship("Client", back_populates="payments")
    created_by_admin = relationship("AdminUser", back_populates="created_payments", foreign_keys=[created_by_id])


