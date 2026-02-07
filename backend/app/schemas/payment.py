"""
Payment schemas
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from uuid import UUID


class PaymentBase(BaseModel):
    """Base payment schema"""
    amount: float = Field(..., gt=0)
    method: str
    note: Optional[str] = None


class PaymentCreate(PaymentBase):
    """Create payment schema"""
    client_id: UUID


class PaymentUpdate(BaseModel):
    """Update payment schema"""
    amount: Optional[float] = Field(None, gt=0)
    method: Optional[str] = None
    note: Optional[str] = None


class PaymentResponse(PaymentBase):
    """Payment response schema"""
    id: UUID
    client_id: UUID
    client_name: Optional[str] = None
    created_by_id: UUID
    created_by_name: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class PaymentListResponse(BaseModel):
    """Payment list response"""
    payments: list[PaymentResponse]
    total: int
    total_revenue: float
    avg_payment: float


