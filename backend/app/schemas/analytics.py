"""
Analytics schemas
"""
from typing import List
from pydantic import BaseModel


class MonthlyRevenue(BaseModel):
    """Monthly revenue data"""
    month: str
    revenue: float


class ClientStatusCount(BaseModel):
    """Client status count"""
    status: str
    count: int


class AdminWorkload(BaseModel):
    """Admin workload data"""
    name: str
    clients: int


class AnalyticsResponse(BaseModel):
    """Analytics response"""
    total_clients: int
    total_admins: int
    pending_documents: int
    pending_payments: int
    completed_filings: int
    total_revenue: float
    monthly_revenue: List[MonthlyRevenue]
    clients_by_status: List[ClientStatusCount]
    admin_workload: List[AdminWorkload]


