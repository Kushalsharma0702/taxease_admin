"""
Filings admin routes — reads from production filings + users tables.
"""
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.core.database import get_db
from app.core.dependencies import get_current_admin

router = APIRouter()

_BASE = text("""
    SELECT
        f.id, f.filing_year, f.status, f.total_fee,
        f.created_at, f.updated_at,
        u.id          AS user_id,
        u.first_name  AS first_name,
        u.last_name   AS last_name,
        u.email,
        u.phone,
        u.first_name || ' ' || u.last_name AS client_name,
        COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.filing_id = f.id), 0) AS paid_amount,
        (SELECT COUNT(*) FROM documents d WHERE d.filing_id = f.id)  AS document_count,
        tf.id   AS t1_form_id,
        tf.status AS t1_status,
        tf.completion_percentage
    FROM filings f
    JOIN users u ON u.id = f.user_id
    LEFT JOIN t1_forms tf ON tf.filing_id = f.id
""")


def _row_to_dict(r) -> dict:
    return {
        "id":                   str(r.id),
        "filing_year":          r.filing_year,
        "status":               r.status,
        "total_fee":            float(r.total_fee or 0),
        "paid_amount":          float(r.paid_amount or 0),
        "created_at":           r.created_at.isoformat() if r.created_at else None,
        "updated_at":           r.updated_at.isoformat() if r.updated_at else None,
        "user_id":              str(r.user_id),
        "client_name":          r.client_name,
        "email":                r.email,
        "phone":                r.phone,
        "document_count":       int(r.document_count or 0),
        "t1_form_id":           str(r.t1_form_id) if r.t1_form_id else None,
        "t1_status":            r.t1_status,
        "completion_percentage": r.completion_percentage,
    }


@router.get("")
async def list_filings(
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    sql = text("""
        SELECT f.id, f.filing_year, f.status, f.total_fee, f.created_at, f.updated_at,
               u.id AS user_id, u.first_name, u.last_name, u.email, u.phone,
               u.first_name || ' ' || u.last_name AS client_name,
               COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.filing_id = f.id), 0) AS paid_amount,
               (SELECT COUNT(*) FROM documents d WHERE d.filing_id = f.id) AS document_count,
               tf.id AS t1_form_id, tf.status AS t1_status, tf.completion_percentage
        FROM filings f
        JOIN users u ON u.id = f.user_id
        LEFT JOIN t1_forms tf ON tf.filing_id = f.id
        ORDER BY f.created_at DESC
    """)
    result = await db.execute(sql)
    rows = result.fetchall()
    return {
        "filings": [_row_to_dict(r) for r in rows],
        "total": len(rows)
    }


@router.get("/{filing_id}")
async def get_filing(
    filing_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    sql = text("""
        SELECT f.id, f.filing_year, f.status, f.total_fee, f.created_at, f.updated_at,
               u.id AS user_id, u.first_name, u.last_name, u.email, u.phone,
               u.first_name || ' ' || u.last_name AS client_name,
               COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.filing_id = f.id), 0) AS paid_amount,
               (SELECT COUNT(*) FROM documents d WHERE d.filing_id = f.id) AS document_count,
               tf.id AS t1_form_id, tf.status AS t1_status, tf.completion_percentage
        FROM filings f
        JOIN users u ON u.id = f.user_id
        LEFT JOIN t1_forms tf ON tf.filing_id = f.id
        WHERE f.id = :id
    """)
    result = await db.execute(sql, {"id": str(filing_id)})
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Filing not found")
    return _row_to_dict(row)
