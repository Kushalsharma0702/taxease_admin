"""
T1 Form schemas
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from uuid import UUID


class T1FormResponse(BaseModel):
    """T1 form response schema"""
    id: str
    user_id: Optional[str] = None
    tax_year: int
    status: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    client_email: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    submitted_at: Optional[str] = None
    
    class Config:
        from_attributes = True


class T1FormListResponse(BaseModel):
    """T1 form list response"""
    forms: list[T1FormResponse]
    total: int
    offset: int
    limit: int
