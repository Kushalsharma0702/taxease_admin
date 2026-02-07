"""
Client schemas
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr
from uuid import UUID


class ClientBase(BaseModel):
    """Base client schema"""
    name: str
    email: EmailStr
    phone: Optional[str] = None
    filing_year: int


class ClientCreate(ClientBase):
    """Create client schema"""
    assigned_admin_id: Optional[UUID] = None


class ClientUpdate(BaseModel):
    """Update client schema"""
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    filing_year: Optional[int] = None
    status: Optional[str] = None
    payment_status: Optional[str] = None
    assigned_admin_id: Optional[UUID] = None
    total_amount: Optional[float] = None
    paid_amount: Optional[float] = None


class ClientResponse(ClientBase):
    """Client response schema"""
    id: UUID
    status: str
    payment_status: str
    assigned_admin_id: Optional[UUID] = None
    assigned_admin_name: Optional[str] = None
    total_amount: float
    paid_amount: float
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ClientListResponse(BaseModel):
    """Client list response with pagination"""
    clients: list[ClientResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


