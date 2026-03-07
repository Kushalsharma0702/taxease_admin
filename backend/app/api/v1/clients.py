"""
Client routes — reads from production users + filings tables.
"""
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text, and_, or_, update
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.dependencies import get_current_admin, require_permission
from app.core.utils import create_audit_log, calculate_pagination
from app.core.permissions import PERMISSIONS
from app.models.client import Client
from app.models.admin_user import AdminUser
from app.schemas.client import (
    ClientCreate, ClientUpdate, ClientResponse, ClientListResponse
)

router = APIRouter()

# ---------------------------------------------------------------------------
# Helper — build a ClientResponse dict from a production users+filings row
# ---------------------------------------------------------------------------

def _row_to_client(row) -> dict:
    paid = float(row.paid_amount or 0)
    total = float(row.total_amount or 0)
    if paid <= 0:
        pay_status = "pending"
    elif paid >= total and total > 0:
        pay_status = "paid"
    else:
        pay_status = "partial"

    return {
        "id": row.id,
        "name": row.name,
        "email": row.email,
        "phone": row.phone,
        "filing_year": row.filing_year,
        "status": row.status or "documents_pending",
        "payment_status": pay_status,
        "assigned_admin_id": None,
        "assigned_admin_name": None,
        "total_amount": total,
        "paid_amount": paid,
        "created_at": row.created_at,
        "updated_at": row.updated_at,
    }


# ---------------------------------------------------------------------------
# Base SQL — joins users LEFT JOIN filings so every user appears
# ---------------------------------------------------------------------------
_BASE_SQL = """
    SELECT
        COALESCE(f.id,  u.id)                        AS id,
        u.first_name || ' ' || u.last_name           AS name,
        u.email,
        u.phone,
        COALESCE(f.filing_year, EXTRACT(YEAR FROM NOW())::int) AS filing_year,
        COALESCE(f.status, 'documents_pending')      AS status,
        COALESCE(f.total_fee, 0)                     AS total_amount,
        COALESCE((
            SELECT SUM(p.amount) FROM payments p WHERE p.filing_id = f.id
        ), 0)                                        AS paid_amount,
        COALESCE(f.created_at, u.created_at)         AS created_at,
        COALESCE(f.updated_at, u.updated_at)         AS updated_at
    FROM users u
    LEFT JOIN filings f ON f.user_id = u.id
"""


@router.get("", response_model=ClientListResponse)
async def get_clients(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = Query(None, alias="status"),
    year_filter: Optional[int] = Query(None, alias="year"),
    search: Optional[str] = None,
    email: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Get all clients — reads from production users + filings tables."""
    where_clauses = []
    params: dict = {}

    if status_filter:
        where_clauses.append("COALESCE(f.status, 'documents_pending') = :status_filter")
        params["status_filter"] = status_filter
    if year_filter:
        where_clauses.append("COALESCE(f.filing_year, EXTRACT(YEAR FROM NOW())::int) = :year_filter")
        params["year_filter"] = year_filter
    if email:
        where_clauses.append("u.email = :email")
        params["email"] = email
    elif search:
        where_clauses.append(
            "(u.first_name || ' ' || u.last_name ILIKE :search OR u.email ILIKE :search)"
        )
        params["search"] = f"%{search}%"

    where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

    # Total count
    count_sql = f"SELECT COUNT(*) FROM users u LEFT JOIN filings f ON f.user_id = u.id {where_sql}"
    count_result = await db.execute(text(count_sql), params)
    total = count_result.scalar() or 0

    # Paginated rows
    offset = (page - 1) * page_size
    data_sql = f"""
        {_BASE_SQL}
        {where_sql}
        ORDER BY created_at DESC
        LIMIT :limit OFFSET :offset
    """
    params["limit"] = page_size
    params["offset"] = offset
    result = await db.execute(text(data_sql), params)
    rows = result.fetchall()

    clients = [ClientResponse(**_row_to_client(r)) for r in rows]
    pagination = calculate_pagination(page, page_size, total)

    return ClientListResponse(clients=clients, **pagination)


@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(
    client_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Get a specific client by filing ID or user ID."""
    sql = f"""
        {_BASE_SQL}
        WHERE f.id = :id OR u.id = :id
        LIMIT 1
    """
    result = await db.execute(text(sql), {"id": str(client_id)})
    row = result.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Client not found")

    return ClientResponse(**_row_to_client(row))


@router.post("", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
async def create_client(
    client_data: ClientCreate,
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(require_permission(PERMISSIONS["ADD_EDIT_CLIENT"]))
):
    """Create a new client"""
    # Check if email already exists for the same year
    existing = await db.execute(
        select(Client).where(
            and_(Client.email == client_data.email, Client.filing_year == client_data.filing_year)
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Client with this email already exists for this year")
    
    client = Client(**client_data.model_dump())
    db.add(client)
    await db.commit()
    await db.refresh(client)
    
    # Create audit log
    await create_audit_log(
        db, "Client Created", "client", str(client.id), current_admin.id,
        new_value=f"Client: {client.name}"
    )
    
    return ClientResponse.model_validate(client)


@router.patch("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: UUID,
    client_data: ClientUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(require_permission(PERMISSIONS["ADD_EDIT_CLIENT"]))
):
    """Update a client — writes to filings table (production schema)."""
    updates = client_data.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    # Map client fields to filings table columns
    filing_updates = {}
    if "status" in updates:
        filing_updates["status"] = updates["status"]
    if "total_amount" in updates:
        filing_updates["total_fee"] = updates["total_amount"]

    if filing_updates:
        set_clause = ", ".join(f"{k} = :{k}" for k in filing_updates)
        filing_updates["fid"] = str(client_id)
        await db.execute(
            text(f"UPDATE filings SET {set_clause}, updated_at = NOW() WHERE id = :fid"),
            filing_updates
        )
        await db.commit()

    # Audit log
    await create_audit_log(
        db, "Client Updated", "client", str(client_id), current_admin.id,
        new_value=str(updates)
    )

    return await get_client(client_id, db, current_admin)


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_client(
    client_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(require_permission(PERMISSIONS["ADD_EDIT_CLIENT"]))
):
    """Delete a client"""
    query = select(Client).where(Client.id == client_id)
    result = await db.execute(query)
    client = result.scalar_one_or_none()
    
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    client_name = client.name
    await db.delete(client)
    await db.commit()
    
    # Create audit log
    await create_audit_log(
        db, "Client Deleted", "client", str(client_id), current_admin.id,
        old_value=f"Client: {client_name}"
    )



