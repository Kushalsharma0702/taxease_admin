"""
Audit Log routes
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.dependencies import get_current_superadmin
from app.core.utils import calculate_pagination
from app.models.audit_log import AuditLog
from app.models.admin_user import AdminUser
from app.schemas.audit_log import AuditLogResponse, AuditLogListResponse

router = APIRouter()


@router.get("", response_model=AuditLogListResponse)
async def get_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    entity_type: Optional[str] = None,
    action: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_superadmin)
):
    """Get audit logs with pagination (superadmin only)"""
    query = select(AuditLog).options(selectinload(AuditLog.performed_by_admin))
    
    # Filter out legacy logs with missing required fields
    conditions = [
        AuditLog.entity_type != None,  # noqa: E711
        AuditLog.entity_id != None  # noqa: E711
    ]
    
    if entity_type:
        conditions.append(AuditLog.entity_type == entity_type)
    if action:
        conditions.append(AuditLog.action.ilike(f"%{action}%"))
    
    query = query.where(and_(*conditions))
    
    # Count total (with same conditions)
    count_query = select(func.count()).select_from(AuditLog).where(and_(*conditions))
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Apply pagination
    query = query.order_by(AuditLog.timestamp.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    
    result = await db.execute(query)
    logs = result.scalars().all()
    
    # Format response (filter out any logs with missing required fields as safety measure)
    log_responses = []
    for log in logs:
        # Skip logs with missing required fields (legacy data that might slip through)
        if not log.entity_type or not log.entity_id or not log.performed_by_id:
            continue
        
        # Build response dict manually to avoid validation issues
        log_dict = {
            "id": log.id,
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "old_value": log.old_value,
            "new_value": log.new_value,
            "performed_by_id": log.performed_by_id,
            "performed_by_name": log.performed_by_admin.name if log.performed_by_admin else None,
            "timestamp": log.timestamp
        }
        log_responses.append(AuditLogResponse(**log_dict))
    
    pagination = calculate_pagination(page, page_size, total)
    
    return AuditLogListResponse(
        logs=log_responses,
        **pagination
    )


