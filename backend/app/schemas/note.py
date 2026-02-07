"""
Note schemas
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from uuid import UUID


class NoteBase(BaseModel):
    """Base note schema"""
    content: str
    is_client_facing: bool = False


class NoteCreate(NoteBase):
    """Create note schema"""
    client_id: UUID


class NoteResponse(NoteBase):
    """Note response schema"""
    id: UUID
    client_id: UUID
    author_id: UUID
    author_name: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

