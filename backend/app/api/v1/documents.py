"""
Document routes — reads from production documents table (keyed by filing_id).
The frontend passes client_id which may be a filing.id or user.id;
we resolve to all matching documents.
"""
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.core.database import get_db
from app.core.dependencies import get_current_admin

router = APIRouter()


@router.get("")
async def get_documents(
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = None,
    client_id: Optional[str] = Query(None),
    filing_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_admin=Depends(get_current_admin)
):
    """
    Get documents from the production documents table.
    
    The production schema uses filing_id (not client_id).
    client_id param is treated as user_id OR filing_id for backwards compat.
    """
    where_clauses = []
    params: dict = {}

    if filing_id:
        where_clauses.append("d.filing_id = :filing_id")
        params["filing_id"] = filing_id
    elif client_id:
        # client_id might be a user_id or a filing_id — resolve both
        where_clauses.append(
            "(d.filing_id = :cid::uuid OR d.filing_id IN (SELECT id FROM filings WHERE user_id = :cid::uuid))"
        )
        params["cid"] = client_id

    if status_filter:
        where_clauses.append("d.status = :status_filter")
        params["status_filter"] = status_filter

    if search:
        where_clauses.append("(d.name ILIKE :search OR d.original_filename ILIKE :search)")
        params["search"] = f"%{search}%"

    where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

    sql = text(f"""
        SELECT
            d.id, d.filing_id, d.name, d.original_filename,
            d.file_type, d.file_size, d.file_path,
            d.section_name, d.document_type, d.status,
            d.created_at, d.updated_at,
            u.first_name || ' ' || u.last_name AS client_name,
            u.email AS client_email
        FROM documents d
        JOIN filings f ON f.id = d.filing_id
        JOIN users u ON u.id = f.user_id
        {where_sql}
        ORDER BY d.created_at DESC
    """)

    result = await db.execute(sql, params)
    rows = result.fetchall()

    documents = []
    for r in rows:
        documents.append({
            "id": str(r.id),
            "filing_id": str(r.filing_id),
            "name": r.name,
            "original_filename": r.original_filename,
            "file_type": r.file_type,
            "file_size": r.file_size,
            "file_path": r.file_path,
            "section_name": r.section_name,
            "document_type": r.document_type,
            "status": r.status or "pending",
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "updated_at": r.updated_at.isoformat() if r.updated_at else None,
            "client_name": r.client_name,
            "client_email": r.client_email,
        })

    return {"documents": documents, "total": len(documents)}


@router.patch("/{document_id}")
async def update_document_status(
    document_id: UUID,
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_admin=Depends(get_current_admin)
):
    """Update document status (approve, request reupload, etc.)"""
    allowed = {"status", "notes"}
    updates = {k: v for k, v in data.items() if k in allowed}
    if not updates:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    set_clause = ", ".join(f"{k} = :{k}" for k in updates)
    updates["doc_id"] = str(document_id)
    await db.execute(
        text(f"UPDATE documents SET {set_clause}, updated_at = NOW() WHERE id = :doc_id"),
        updates
    )
    await db.commit()
    return {"message": "Document updated", "id": str(document_id)}


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_admin=Depends(get_current_admin)
):
    """Delete a document"""
    result = await db.execute(
        text("SELECT id FROM documents WHERE id = :id"),
        {"id": str(document_id)}
    )
    if not result.fetchone():
        raise HTTPException(status_code=404, detail="Document not found")

    await db.execute(text("DELETE FROM documents WHERE id = :id"), {"id": str(document_id)})
    await db.commit()
