"""
Cost Estimate model
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Float, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class CostEstimate(Base):
    """Cost Estimate model"""
    __tablename__ = "cost_estimates"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False, index=True)
    
    service_cost = Column(Float, nullable=False)
    discount = Column(Float, nullable=False, default=0.0)
    gst_hst = Column(Float, nullable=False)
    total = Column(Float, nullable=False)
    
    status = Column(String(50), nullable=False, default="draft", index=True)
    # Status: draft, sent, awaiting_payment, paid
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    client = relationship("Client", back_populates="cost_estimates")


