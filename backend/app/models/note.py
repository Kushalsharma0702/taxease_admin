"""
Note model
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Note(Base):
    """Note model"""
    __tablename__ = "notes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False, index=True)
    
    content = Column(Text, nullable=False)
    is_client_facing = Column(Boolean, nullable=False, default=False)
    
    author_id = Column(UUID(as_uuid=True), ForeignKey("admin_users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    client = relationship("Client", back_populates="notes")
    author_admin = relationship("AdminUser", back_populates="created_notes", foreign_keys=[author_id])


