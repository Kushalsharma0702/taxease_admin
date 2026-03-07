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
    try:
        # Use a raw INSERT to bypass ORM relationship loading and FK issues
        # performed_by_id FK points to 'admins' table (not admin_users) — use NULL
        from sqlalchemy import text as _text
        import uuid as _uuid
        await db.execute(_text("""
            INSERT INTO audit_logs (id, action, entity_type, entity_id, old_value, new_value, timestamp)
            VALUES (:id, :action, :entity_type, :entity_id, :old_value, :new_value, NOW())
        """), {
            "id": str(_uuid.uuid4()),
            "action": action,
            "entity_type": entity_type,
            "entity_id": str(entity_id),
            "old_value": old_value,
            "new_value": new_value,
        })
        await db.commit()
    except Exception:
        # Never let audit log failure break the main operation
        pass
    return None


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

