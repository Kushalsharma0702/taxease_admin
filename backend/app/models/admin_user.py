"""
Admin User model
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, Text, ARRAY
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class AdminUser(Base):
    """Admin user account model"""
    __tablename__ = "admin_users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="admin")  # superadmin, admin
    permissions = Column(ARRAY(String), nullable=False, default=[])
    avatar = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    assigned_clients = relationship("Client", back_populates="assigned_admin", foreign_keys="Client.assigned_admin_id")
    created_audit_logs = relationship("AuditLog", foreign_keys="AuditLog.performed_by_id")
    created_payments = relationship("Payment", back_populates="created_by_admin", foreign_keys="Payment.created_by_id")
    created_notes = relationship("Note", back_populates="author_admin", foreign_keys="Note.author_id")

