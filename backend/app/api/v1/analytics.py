"""
Analytics routes
"""
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.dependencies import get_current_admin
from app.models.client import Client
from app.models.document import Document
from app.models.payment import Payment
from app.models.admin_user import AdminUser
from app.schemas.analytics import AnalyticsResponse, MonthlyRevenue, ClientStatusCount, AdminWorkload

router = APIRouter()


@router.get("", response_model=AnalyticsResponse)
async def get_analytics(
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Get dashboard analytics"""
    # Total clients
    clients_query = select(func.count()).select_from(Client)
    total_clients_result = await db.execute(clients_query)
    total_clients = total_clients_result.scalar() or 0
    
    # Total admins
    admins_query = select(func.count()).select_from(AdminUser).where(AdminUser.is_active == True)
    total_admins_result = await db.execute(admins_query)
    total_admins = total_admins_result.scalar() or 0
    
    # Pending documents
    docs_query = select(func.count()).select_from(Document).where(
        Document.status.in_(["pending", "missing"])
    )
    pending_docs_result = await db.execute(docs_query)
    pending_documents = pending_docs_result.scalar() or 0
    
    # Pending payments
    pending_payments_query = select(func.count()).select_from(Client).where(
        Client.payment_status.in_(["pending", "partial"])
    )
    pending_payments_result = await db.execute(pending_payments_query)
    pending_payments = pending_payments_result.scalar() or 0
    
    # Completed filings
    completed_query = select(func.count()).select_from(Client).where(
        Client.status.in_(["completed", "filed"])
    )
    completed_result = await db.execute(completed_query)
    completed_filings = completed_result.scalar() or 0
    
    # Total revenue
    revenue_query = select(func.sum(Payment.amount)).select_from(Payment)
    revenue_result = await db.execute(revenue_query)
    total_revenue = float(revenue_result.scalar() or 0)
    
    # Monthly revenue (last 6 months)
    six_months_ago = datetime.utcnow() - timedelta(days=180)
    monthly_payments_query = select(
        func.date_trunc('month', Payment.created_at).label('month'),
        func.sum(Payment.amount).label('revenue')
    ).where(
        Payment.created_at >= six_months_ago
    ).group_by('month').order_by('month')
    
    monthly_result = await db.execute(monthly_payments_query)
    monthly_data = monthly_result.all()
    
    monthly_revenue = []
    month_names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    for row in monthly_data:
        if row.month:
            month = datetime.fromtimestamp(row.month.timestamp()) if hasattr(row.month, 'timestamp') else row.month
            monthly_revenue.append(MonthlyRevenue(
                month=month_names[month.month - 1] if isinstance(month, datetime) else month.strftime('%b'),
                revenue=float(row.revenue or 0)
            ))
    
    # Clients by status
    status_query = select(
        Client.status,
        func.count(Client.id).label('count')
    ).group_by(Client.status)
    status_result = await db.execute(status_query)
    status_data = status_result.all()
    
    clients_by_status = [
        ClientStatusCount(status=row.status, count=row.count)
        for row in status_data
    ]
    
    # Admin workload
    workload_query = select(
        AdminUser.id,
        AdminUser.name,
        func.count(Client.id).label('client_count')
    ).outerjoin(Client, AdminUser.id == Client.assigned_admin_id).where(
        AdminUser.is_active == True
    ).group_by(AdminUser.id, AdminUser.name)
    
    workload_result = await db.execute(workload_query)
    workload_data = workload_result.all()
    
    admin_workload = [
        AdminWorkload(name=row.name, clients=row.client_count or 0)
        for row in workload_data
    ]
    
    return AnalyticsResponse(
        total_clients=total_clients,
        total_admins=total_admins,
        pending_documents=pending_documents,
        pending_payments=pending_payments,
        completed_filings=completed_filings,
        total_revenue=total_revenue,
        monthly_revenue=monthly_revenue,
        clients_by_status=clients_by_status,
        admin_workload=admin_workload
    )




