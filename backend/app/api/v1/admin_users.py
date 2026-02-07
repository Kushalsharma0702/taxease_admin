"""
Admin User routes
"""
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.dependencies import get_current_admin, get_current_superadmin
from app.core.auth import get_password_hash
from app.core.utils import create_audit_log
from app.models.admin_user import AdminUser
from app.models.client import Client
from app.schemas.admin_user import (
    AdminUserCreate, AdminUserUpdate, AdminUserResponse, AdminUserWithWorkload
)
from app.core.permissions import ALL_PERMISSIONS

router = APIRouter()


@router.get("", response_model=list[AdminUserResponse])
async def get_admin_users(
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_superadmin)
):
    """Get all admin users (superadmin only)"""
    query = select(AdminUser).order_by(AdminUser.created_at.desc())
    result = await db.execute(query)
    admins = result.scalars().all()
    return [AdminUserResponse.model_validate(admin) for admin in admins]


@router.get("/{admin_id}", response_model=AdminUserWithWorkload)
async def get_admin_user(
    admin_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_superadmin)
):
    """Get admin user with workload"""
    query = select(AdminUser).where(AdminUser.id == admin_id)
    result = await db.execute(query)
    admin = result.scalar_one_or_none()
    
    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")
    
    # Count assigned clients
    count_query = select(func.count()).select_from(Client).where(Client.assigned_admin_id == admin_id)
    count_result = await db.execute(count_query)
    client_count = count_result.scalar() or 0
    
    admin_dict = AdminUserResponse.model_validate(admin).model_dump()
    admin_dict["client_count"] = client_count
    
    return AdminUserWithWorkload(**admin_dict)


@router.post("", response_model=AdminUserResponse, status_code=status.HTTP_201_CREATED)
async def create_admin_user(
    admin_data: AdminUserCreate,
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_superadmin)
):
    """Create a new admin user"""
    # Check if email already exists
    existing = await db.execute(select(AdminUser).where(AdminUser.email == admin_data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Admin with this email already exists")
    
    admin = AdminUser(
        email=admin_data.email,
        name=admin_data.name,
        password_hash=get_password_hash(admin_data.password),
        role=admin_data.role,
        permissions=admin_data.permissions if admin_data.role != "superadmin" else ALL_PERMISSIONS,
        is_active=True
    )
    db.add(admin)
    await db.commit()
    await db.refresh(admin)
    
    # Create audit log
    await create_audit_log(
        db, "Admin Created", "admin", str(admin.id), current_admin.id,
        new_value=f"Admin: {admin.name}"
    )
    
    return AdminUserResponse.model_validate(admin)


@router.patch("/{admin_id}", response_model=AdminUserResponse)
async def update_admin_user(
    admin_id: UUID,
    admin_data: AdminUserUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_superadmin)
):
    """Update admin user"""
    query = select(AdminUser).where(AdminUser.id == admin_id)
    result = await db.execute(query)
    admin = result.scalar_one_or_none()
    
    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")
    
    # Don't allow editing superadmin
    if admin.role == "superadmin" and admin_data.role and admin_data.role != "superadmin":
        raise HTTPException(status_code=400, detail="Cannot change superadmin role")
    
    old_values = {}
    for key, value in admin_data.model_dump(exclude_unset=True).items():
        if hasattr(admin, key) and key != "password":
            old_values[key] = str(getattr(admin, key))
            setattr(admin, key, value)
    
    # If role is superadmin, grant all permissions
    if admin.role == "superadmin":
        admin.permissions = ALL_PERMISSIONS
    
    await db.commit()
    await db.refresh(admin)
    
    # Create audit log
    await create_audit_log(
        db, "Admin Updated", "admin", str(admin.id), current_admin.id,
        old_value=str(old_values) if old_values else None,
        new_value=str(admin_data.model_dump(exclude_unset=True)) if admin_data.model_dump(exclude_unset=True) else None
    )
    
    return AdminUserResponse.model_validate(admin)


@router.delete("/{admin_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_admin_user(
    admin_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_superadmin)
):
    """Delete admin user"""
    query = select(AdminUser).where(AdminUser.id == admin_id)
    result = await db.execute(query)
    admin = result.scalar_one_or_none()
    
    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")
    
    if admin.role == "superadmin":
        raise HTTPException(status_code=400, detail="Cannot delete superadmin")
    
    admin_name = admin.name
    await db.delete(admin)
    await db.commit()
    
    # Create audit log
    await create_audit_log(
        db, "Admin Deleted", "admin", str(admin_id), current_admin.id,
        old_value=f"Admin: {admin_name}"
    )




