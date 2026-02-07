"""
Document schemas
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from uuid import UUID


class DocumentBase(BaseModel):
    """Base document schema"""
    name: str
    type: str
    status: str = "pending"


class DocumentCreate(DocumentBase):
    """Create document schema"""
    client_id: UUID
    notes: Optional[str] = None


class DocumentUpdate(BaseModel):
    """Update document schema"""
    name: Optional[str] = None
    type: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    uploaded_at: Optional[datetime] = None


class DocumentResponse(DocumentBase):
    """Document response schema"""
    id: UUID
    client_id: UUID
    client_name: Optional[str] = None
    version: int
    uploaded_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class DocumentListResponse(BaseModel):
    """Document list response"""
    documents: list[DocumentResponse]
    total: int


