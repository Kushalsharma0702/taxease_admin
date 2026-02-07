"""
Audit Log schemas
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from uuid import UUID


class AuditLogResponse(BaseModel):
    """Audit log response schema"""
    id: UUID
    action: str
    entity_type: str
    entity_id: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    performed_by_id: UUID
    performed_by_name: Optional[str] = None
    timestamp: datetime
    
    class Config:
        from_attributes = True


class AuditLogListResponse(BaseModel):
    """Audit log list response"""
    logs: list[AuditLogResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


