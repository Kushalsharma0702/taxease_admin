"""
Utility functions for the application
"""
from typing import Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select
from app.models.audit_log import AuditLog
from datetime import datetime


async def create_audit_log(
    db: AsyncSession,
    action: str,
    entity_type: str,
    entity_id: str,
    performed_by_id: str,
    old_value: Optional[str] = None,
    new_value: Optional[str] = None,
):
    """
    Create an audit log entry
    
    Args:
        db: Database session
        action: Action performed (e.g., 'Created', 'Updated', 'Deleted')
        entity_type: Type of entity (e.g., 'client', 'admin', 'payment')
        entity_id: ID of the entity
        performed_by_id: ID of the user who performed the action
        old_value: Previous value (optional)
        new_value: New value (optional)
    """
    audit_log = AuditLog(
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        performed_by_id=performed_by_id,
        old_value=old_value,
        new_value=new_value,
        timestamp=datetime.utcnow(),
    )
    
    db.add(audit_log)
    await db.commit()
    await db.refresh(audit_log)
    
    return audit_log


def calculate_pagination(page: int, page_size: int, total: int) -> dict:
    """
    Calculate pagination metadata
    
    Args:
        page: Current page number (1-indexed)
        page_size: Number of items per page
        total: Total number of items
    
    Returns:
        Dictionary with pagination metadata
    """
    total_pages = (total + page_size - 1) // page_size if total > 0 else 0
    
    return {
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": total_pages,
        "has_next": page < total_pages,
        "has_prev": page > 1,
    }

