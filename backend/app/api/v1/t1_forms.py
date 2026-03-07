"""
T1 Forms admin routes — reads from production t1_forms + t1_answers tables.
Exposes both /t1-forms/ and /tax/t1-personal to match what the frontend expects.
"""
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.core.database import get_db
from app.core.dependencies import get_current_admin

router = APIRouter()
tax_router = APIRouter()   # mounted at /tax/t1-personal


# ─── Helper ───────────────────────────────────────────────────────────────────

async def _get_t1_forms(db: AsyncSession, filing_id: Optional[str] = None,
                        user_id: Optional[str] = None) -> list[dict]:
    """Fetch T1 forms with client info from production tables."""
    where = ""
    params: dict = {}
    if filing_id:
        where = "WHERE tf.filing_id = :filing_id"
        params["filing_id"] = filing_id
    elif user_id:
        where = "WHERE tf.user_id = :user_id"
        params["user_id"] = user_id

    sql = text(f"""
        SELECT
            tf.id,
            tf.filing_id,
            tf.user_id,
            tf.status,
            tf.is_locked,
            tf.completion_percentage,
            tf.last_saved_step_id,
            tf.submitted_at,
            tf.review_notes,
            tf.created_at,
            tf.updated_at,
            u.first_name || ' ' || u.last_name  AS client_name,
            u.email                              AS client_email,
            u.phone                              AS client_phone,
            f.filing_year,
            f.status                             AS filing_status,
            (SELECT COUNT(*) FROM t1_answers ta
             WHERE ta.t1_form_id = tf.id)         AS answers_count
        FROM t1_forms tf
        JOIN users  u ON u.id = tf.user_id
        JOIN filings f ON f.id = tf.filing_id
        {where}
        ORDER BY tf.created_at DESC
    """)
    result = await db.execute(sql, params)
    rows = result.fetchall()

    forms = []
    for r in rows:
        forms.append({
            "id":                   str(r.id),
            "filing_id":            str(r.filing_id),
            "user_id":              str(r.user_id),
            "status":               r.status,
            "is_locked":            r.is_locked,
            "completion_percentage": r.completion_percentage,
            "last_saved_step_id":   r.last_saved_step_id,
            "submitted_at":         r.submitted_at.isoformat() if r.submitted_at else None,
            "review_notes":         r.review_notes,
            "created_at":           r.created_at.isoformat() if r.created_at else None,
            "updated_at":           r.updated_at.isoformat() if r.updated_at else None,
            # Client info (admin view)
            "client_name":          r.client_name,
            "client_email":         r.client_email,
            "client_phone":         r.client_phone,
            "filing_year":          r.filing_year,
            "filing_status":        r.filing_status,
            "answers_count":        int(r.answers_count or 0),
            # Compat fields for frontend
            "tax_year":             r.filing_year,
            "name":                 r.client_name,
            "email":                r.client_email,
        })
    return forms


async def _get_t1_answers(db: AsyncSession, form_id: str) -> list[dict]:
    """Fetch all answers for a T1 form."""
    sql = text("""
        SELECT id, field_key,
               value_boolean, value_text, value_numeric, value_date, value_array,
               created_at, updated_at
        FROM t1_answers
        WHERE t1_form_id = :form_id
        ORDER BY field_key
    """)
    result = await db.execute(sql, {"form_id": form_id})
    rows = []
    for r in result.fetchall():
        # Resolve the actual value — use `is not None` to correctly handle False
        if r.value_text is not None:
            value = r.value_text
        elif r.value_numeric is not None:
            value = float(r.value_numeric)
        elif r.value_boolean is not None:
            value = r.value_boolean          # preserves False
        elif r.value_date is not None:
            value = r.value_date.isoformat()
        elif r.value_array is not None:
            value = r.value_array
        else:
            value = None
        rows.append({
            "id":            str(r.id),
            "field_key":     r.field_key,
            "value":         value,
            "value_text":    r.value_text,
            "value_numeric": float(r.value_numeric) if r.value_numeric is not None else None,
            "value_boolean": r.value_boolean,
            "value_date":    r.value_date.isoformat() if r.value_date else None,
            "value_array":   r.value_array,
            "created_at":    r.created_at.isoformat() if r.created_at else None,
        })
    return rows


# ─── /t1-forms/ routes ────────────────────────────────────────────────────────

@router.get("/")
async def get_all_t1_forms(
    filing_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """List all T1 forms (admin view of all clients)."""
    forms = await _get_t1_forms(db, filing_id=filing_id)
    return forms


@router.get("/{form_id}")
async def get_t1_form(
    form_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Get a specific T1 form with all answers."""
    sql = text("""
        SELECT tf.*, 
               u.first_name || ' ' || u.last_name AS client_name,
               u.email AS client_email, u.phone AS client_phone,
               f.filing_year, f.status AS filing_status
        FROM t1_forms tf
        JOIN users u ON u.id = tf.user_id
        JOIN filings f ON f.id = tf.filing_id
        WHERE tf.id = :id
    """)
    result = await db.execute(sql, {"id": str(form_id)})
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="T1 form not found")

    answers = await _get_t1_answers(db, str(form_id))

    # Build sections progress (column name may vary)
    try:
        sections_sql = text("""
            SELECT * FROM t1_sections_progress
            WHERE t1_form_id = :form_id
            ORDER BY 1
        """)
        sections_result = await db.execute(sections_sql, {"form_id": str(form_id)})
        sections = [dict(zip(r._fields, r)) for r in sections_result.fetchall()]
    except Exception:
        sections = []

    return {
        "id":                   str(row.id),
        "filing_id":            str(row.filing_id),
        "user_id":              str(row.user_id),
        "status":               row.status,
        "is_locked":            row.is_locked,
        "completion_percentage": row.completion_percentage,
        "last_saved_step_id":   row.last_saved_step_id,
        "submitted_at":         row.submitted_at.isoformat() if row.submitted_at else None,
        "review_notes":         row.review_notes,
        "created_at":           row.created_at.isoformat() if row.created_at else None,
        "updated_at":           row.updated_at.isoformat() if row.updated_at else None,
        "client_name":          row.client_name,
        "client_email":         row.client_email,
        "client_phone":         row.client_phone,
        "filing_year":          row.filing_year,
        "filing_status":        row.filing_status,
        "tax_year":             row.filing_year,
        "answers":              answers,
        "sections":             sections,
        "answers_count":        len(answers),
    }


@router.patch("/{form_id}")
async def update_t1_form(
    form_id: UUID,
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Update T1 form review notes / status."""
    allowed = {"review_notes", "status"}
    updates = {k: v for k, v in data.items() if k in allowed}
    if not updates:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    set_clause = ", ".join(f"{k} = :{k}" for k in updates)
    updates["form_id"] = str(form_id)
    await db.execute(
        text(f"UPDATE t1_forms SET {set_clause}, updated_at = NOW() WHERE id = :form_id"),
        updates
    )
    await db.commit()
    return {"message": "Updated", "id": str(form_id)}


# ─── /tax/t1-personal routes (compat alias) ───────────────────────────────────

@tax_router.get("")
async def get_t1_personal_forms(
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """T1 personal forms — admin view (alias for /t1-forms/)."""
    return await _get_t1_forms(db)


@tax_router.get("/{form_id}")
async def get_t1_personal_form(
    form_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Get specific T1 personal form."""
    forms = await _get_t1_forms(db)
    match = next((f for f in forms if f["id"] == str(form_id)), None)
    if not match:
        raise HTTPException(status_code=404, detail="T1 form not found")
    return match
