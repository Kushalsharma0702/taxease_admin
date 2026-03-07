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
    from sqlalchemy import text

    # Total clients = users who have at least one filing (real production data)
    total_clients_result = await db.execute(
        text("SELECT COUNT(DISTINCT u.id) FROM users u LEFT JOIN filings f ON f.user_id = u.id")
    )
    total_clients = total_clients_result.scalar() or 0

    # Total admins
    admins_query = select(func.count()).select_from(AdminUser).where(AdminUser.is_active == True)
    total_admins_result = await db.execute(admins_query)
    total_admins = total_admins_result.scalar() or 0

    # Pending documents (from real documents table)
    pending_docs_result = await db.execute(
        text("SELECT COUNT(*) FROM documents WHERE status IN ('pending', 'missing', 'received')")
    )
    pending_documents = pending_docs_result.scalar() or 0

    # Pending payments — filings where no payment has been made yet
    pending_payments_result = await db.execute(
        text("""
            SELECT COUNT(*) FROM filings f
            WHERE COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.filing_id = f.id), 0) = 0
        """)
    )
    pending_payments = pending_payments_result.scalar() or 0

    # Completed filings
    completed_result = await db.execute(
        text("SELECT COUNT(*) FROM filings WHERE status IN ('completed', 'filed', 'assessed')")
    )
    completed_filings = completed_result.scalar() or 0

    # Total revenue
    revenue_result = await db.execute(text("SELECT COALESCE(SUM(amount), 0) FROM payments"))
    total_revenue = float(revenue_result.scalar() or 0)

    # Monthly revenue (last 6 months)
    monthly_result = await db.execute(text("""
        SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'Mon') AS month,
               SUM(amount) AS revenue
        FROM payments
        WHERE created_at >= NOW() - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY DATE_TRUNC('month', created_at)
    """))
    monthly_revenue = [
        MonthlyRevenue(month=row.month, revenue=float(row.revenue or 0))
        for row in monthly_result.fetchall()
    ]

    # Clients by status (from real filings)
    status_result = await db.execute(text("""
        SELECT COALESCE(status, 'documents_pending') AS status, COUNT(*) AS count
        FROM filings
        GROUP BY status
    """))
    clients_by_status = [
        ClientStatusCount(status=row.status, count=row.count)
        for row in status_result.fetchall()
    ]

    # Admin workload
    workload_query = select(
        AdminUser.id,
        AdminUser.name,
    ).where(AdminUser.is_active == True)
    workload_result = await db.execute(workload_query)
    workload_data = workload_result.all()
    admin_workload = [AdminWorkload(name=row.name, clients=0) for row in workload_data]
    
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




