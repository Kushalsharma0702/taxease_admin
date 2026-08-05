"""
Payment routes — reads from production payments table (keyed by filing_id).
The frontend passes client_id which may be a filing.id or user.id;
we resolve to all matching payments.
"""
from typing import Optional
from uuid import UUID, uuid4
from fastapi import APIRouter, Depends, HTTPException, Query, status, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.core.database import get_db
from app.core.dependencies import get_current_admin, require_permission
from app.core.permissions import PERMISSIONS
from app.core.utils import create_audit_log

router = APIRouter()


@router.get("")
async def get_payments(
    client_id: Optional[str] = Query(None),
    filing_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_admin=Depends(get_current_admin)
):
    """
    Get payments from the production payments table.
    
    The production schema uses filing_id (not client_id).
    client_id param is treated as user_id OR filing_id for backwards compat.
    """
    where_clauses = []
    params: dict = {}

    if filing_id:
        where_clauses.append("p.filing_id = :filing_id")
        params["filing_id"] = filing_id
    elif client_id:
        where_clauses.append(
            "(p.filing_id = :cid::uuid OR p.filing_id IN (SELECT id FROM filings WHERE user_id = :cid::uuid))"
        )
        params["cid"] = client_id

    where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

    sql = text(f"""
        SELECT
            p.id, p.filing_id, p.amount, p.method, p.note,
            p.created_at,
            u.first_name || ' ' || u.last_name AS client_name,
            a.name AS created_by_name
        FROM payments p
        JOIN filings f ON f.id = p.filing_id
        JOIN users u ON u.id = f.user_id
        LEFT JOIN admins a ON a.id = p.created_by_id
        {where_sql}
        ORDER BY p.created_at DESC
    """)

    result = await db.execute(sql, params)
    rows = result.fetchall()

    payments = []
    total_revenue = 0.0
    for r in rows:
        amount = float(r.amount or 0)
        total_revenue += amount
        payments.append({
            "id": str(r.id),
            "filing_id": str(r.filing_id),
            "amount": amount,
            "method": r.method,
            "note": r.note,
            "status": "paid",
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "client_name": r.client_name,
            "created_by_name": r.created_by_name,
        })

    return {
        "payments": payments,
        "total": len(payments),
        "total_revenue": total_revenue,
        "avg_payment": total_revenue / len(payments) if payments else 0,
    }


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_payment(
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_admin=Depends(require_permission(PERMISSIONS["ADD_EDIT_PAYMENT"]))
):
    """Create a new payment for a filing."""
    filing_id = data.get("filing_id") or data.get("client_id")
    amount = data.get("amount")
    method = data.get("method", "other")
    note = data.get("note")

    if not filing_id or not amount:
        raise HTTPException(status_code=400, detail="filing_id and amount are required")

    # Verify filing exists
    check = await db.execute(
        text("SELECT id FROM filings WHERE id = :fid"),
        {"fid": filing_id}
    )
    if not check.fetchone():
        # Maybe client_id is user_id — find their latest filing
        filing_result = await db.execute(
            text("SELECT id FROM filings WHERE user_id = :uid ORDER BY created_at DESC LIMIT 1"),
            {"uid": filing_id}
        )
        row = filing_result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Filing not found")
        filing_id = str(row.id)

    payment_id = str(uuid4())
    await db.execute(
        text("""
            INSERT INTO payments (id, filing_id, created_by_id, amount, method, note, created_at)
            VALUES (:id, :filing_id, :admin_id, :amount, :method, :note, NOW())
        """),
        {
            "id": payment_id,
            "filing_id": filing_id,
            "admin_id": str(current_admin.id),
            "amount": float(amount),
            "method": method,
            "note": note,
        }
    )
    await db.commit()

    await create_audit_log(
        db, "Payment Added", "payment", payment_id, current_admin.id,
        new_value=f"${amount} via {method}"
    )

    return {"id": payment_id, "message": "Payment created", "amount": float(amount)}


@router.delete("/{payment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_payment(
    payment_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_admin=Depends(require_permission(PERMISSIONS["ADD_EDIT_PAYMENT"]))
):
    """Delete a payment"""
    result = await db.execute(
        text("SELECT id, amount, method FROM payments WHERE id = :id"),
        {"id": str(payment_id)}
    )
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Payment not found")

    await create_audit_log(
        db, "Payment Deleted", "payment", str(payment_id), current_admin.id,
        old_value=f"${row.amount} via {row.method}"
    )

    await db.execute(text("DELETE FROM payments WHERE id = :id"), {"id": str(payment_id)})
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
