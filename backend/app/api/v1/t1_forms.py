"""
T1 Forms endpoints - Access client backend T1 forms from admin backend
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List
import httpx
import os
from datetime import datetime

from app.core.database import get_db
from app.core.dependencies import get_current_admin
from app.models.client import Client
from app.schemas.t1_form import T1FormListResponse, T1FormResponse
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/t1-forms", tags=["T1 Forms"])

# Client backend URL
CLIENT_BACKEND_URL = os.getenv("CLIENT_BACKEND_URL", "http://localhost:8001/api/v1")


@router.get("", response_model=T1FormListResponse)
async def get_t1_forms(
    client_id: Optional[str] = Query(None, description="Filter by client ID"),
    client_email: Optional[str] = Query(None, description="Filter by client email"),
    status_filter: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """
    Get T1 forms from database (both backends use same database)
    Admin can view all T1 forms or filter by client
    """
    try:
        from sqlalchemy import text
        from uuid import UUID as PyUUID
        
        # Since both backends use the same database, query directly
        # Support both t1_personal_forms (legacy) and t1_forms_main (new schema)
        
        # Build base query - union of both table schemas
        base_query = """
            SELECT * FROM (
                SELECT
                    t1.id::text as id,
                    t1.user_id::text as user_id,
                    COALESCE(t1.tax_year, EXTRACT(YEAR FROM t1.created_at)::int) as tax_year,
                    t1.status as status,
                    t1.first_name as first_name,
                    t1.last_name as last_name,
                    COALESCE(t1.email, u.email) as client_email,
                    t1.created_at as created_at,
                    t1.updated_at as updated_at,
                    t1.submitted_at as submitted_at
                FROM t1_personal_forms t1
                LEFT JOIN users u ON t1.user_id = u.id
                
                UNION ALL
                
                SELECT
                    tm.id::text as id,
                    tm.user_id::text as user_id,
                    EXTRACT(YEAR FROM tm.created_at)::int as tax_year,
                    tm.status as status,
                    pi.first_name as first_name,
                    pi.last_name as last_name,
                    COALESCE(pi.email, u.email) as client_email,
                    tm.created_at as created_at,
                    tm.updated_at as updated_at,
                    CASE WHEN tm.status = 'submitted' THEN tm.updated_at ELSE NULL END as submitted_at
                FROM t1_forms_main tm
                LEFT JOIN t1_personal_info pi ON pi.form_id = tm.id
                LEFT JOIN users u ON tm.user_id = u.id
            ) forms
        """
        
        # Build conditions
        conditions = []
        params = {}
        
        if client_id:
            try:
                # Convert client_id to user_id by looking up client
                client_result = await db.execute(select(Client).where(Client.id == client_id))
                client = client_result.scalar_one_or_none()
                if client:
                    # Find user by email (clients and users share email)
                    user_query = text("SELECT id FROM users WHERE LOWER(email) = LOWER(:email)")
                    user_result = await db.execute(user_query, {"email": client.email})
                    user_row = user_result.fetchone()
                    if user_row:
                        conditions.append("forms.user_id = :user_id")
                        params["user_id"] = str(user_row[0])
                    else:
                        # If no user found, return empty result
                        return {
                            "forms": [],
                            "total": 0,
                            "offset": offset,
                            "limit": limit
                        }
            except Exception as e:
                logger.warning(f"Could not resolve client_id to user_id: {e}")
        
        if client_email:
            # Find user by email
            user_query = text("SELECT id FROM users WHERE LOWER(email) = LOWER(:email)")
            user_result = await db.execute(user_query, {"email": client_email})
            user_row = user_result.fetchone()
            if user_row:
                conditions.append("forms.user_id = :user_id")
                params["user_id"] = str(user_row[0])
        
        if status_filter:
            conditions.append("forms.status = :status")
            params["status"] = status_filter
        
        # Build final query
        where_clause = " WHERE " + " AND ".join(conditions) if conditions else ""
        query_sql = base_query + where_clause + " ORDER BY forms.created_at DESC LIMIT :limit OFFSET :offset"
        count_sql = "SELECT COUNT(*) FROM (" + base_query + where_clause + ") count_forms"
        
        params["limit"] = limit
        params["offset"] = offset
        
        # Execute query
        result = await db.execute(text(query_sql), params)
        rows = result.fetchall()
        
        # Get total count
        count_params = {k: v for k, v in params.items() if k not in ["limit", "offset"]}
        count_result = await db.execute(text(count_sql), count_params)
        total = count_result.scalar() or 0
        
        # Format response
        forms = []
        for row in rows:
            forms.append({
                "id": row[0],
                "user_id": row[1],
                "tax_year": int(row[2]) if row[2] else datetime.utcnow().year,
                "status": row[3] or "draft",
                "first_name": row[4],
                "last_name": row[5],
                "client_email": row[6],
                "created_at": row[7].isoformat() if row[7] else None,
                "updated_at": row[8].isoformat() if row[8] else None,
                "submitted_at": row[9].isoformat() if row[9] else None
            })
        
        logger.info(f"Retrieved {len(forms)} T1 forms (total: {total})")
        
        return {
            "forms": forms,
            "total": total,
            "offset": offset,
            "limit": limit
        }
                
    except Exception as e:
        logger.error(f"Error fetching T1 forms: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )






