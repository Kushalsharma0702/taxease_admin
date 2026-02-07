"""
FastAPI dependencies
"""
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.auth import decode_token, get_admin_user
from app.core.permissions import ALL_PERMISSIONS
from app.models.admin_user import AdminUser
from uuid import UUID

security = HTTPBearer()


async def get_current_admin(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> AdminUser:
    """
    Get current authenticated admin user
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    token = credentials.credentials
    payload = decode_token(token)
    
    if payload is None:
        raise credentials_exception
    
    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception
    
    try:
        user_uuid = UUID(user_id)
    except ValueError:
        raise credentials_exception
    
    admin = await get_admin_user(db, user_uuid)
    if admin is None:
        raise credentials_exception
    
    if not admin.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin account is inactive"
        )
    
    return admin


async def get_current_superadmin(
    current_admin: AdminUser = Depends(get_current_admin)
) -> AdminUser:
    """
    Get current authenticated superadmin (for admin management only)
    Note: This is only used for admin user management endpoints.
    For all other endpoints, both admin and superadmin can access.
    """
    if current_admin.role != "superadmin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superadmin access required"
        )
    return current_admin


async def get_current_admin_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> Optional[AdminUser]:
    """
    Get current authenticated admin user (optional - returns None if not authenticated)
    This allows pages to be accessed without authentication check, but actions require auth
    """
    if credentials is None:
        return None
    
    try:
        token = credentials.credentials
        payload = decode_token(token)
        
        if payload is None:
            return None
        
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
        
        try:
            user_uuid = UUID(user_id)
        except ValueError:
            return None
        
        admin = await get_admin_user(db, user_uuid)
        if admin is None or not admin.is_active:
            return None
        
        return admin
    except Exception:
        return None


def require_permission(permission: str):
    """
    Dependency factory to require a specific permission
    """
    async def permission_checker(
        current_admin: AdminUser = Depends(get_current_admin)
    ) -> AdminUser:
        if current_admin.role == "superadmin":
            return current_admin
        
        if permission not in current_admin.permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission '{permission}' required"
            )
        return current_admin
    
    return permission_checker


