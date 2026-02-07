"""
Cost Estimate schemas
"""
from datetime import datetime
from pydantic import BaseModel
from uuid import UUID


class CostEstimateBase(BaseModel):
    """Base cost estimate schema"""
    service_cost: float
    discount: float = 0.0
    gst_hst: float
    total: float
    status: str = "draft"


class CostEstimateCreate(CostEstimateBase):
    """Create cost estimate schema"""
    client_id: UUID


class CostEstimateResponse(CostEstimateBase):
    """Cost estimate response schema"""
    id: UUID
    client_id: UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


