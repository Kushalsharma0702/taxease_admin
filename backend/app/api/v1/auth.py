"""
Authentication routes
"""
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.auth import authenticate_admin, create_access_token, create_refresh_token, get_password_hash
from app.core.config import settings
from app.core.dependencies import get_current_admin
from app.models.admin_user import AdminUser
from app.schemas.auth import AdminLogin, AdminToken, AdminLoginResponse, AdminUserResponse
from sqlalchemy import select
from datetime import datetime

router = APIRouter()


@router.post("/login", response_model=AdminLoginResponse)
async def login(
    login_data: AdminLogin,
    db: AsyncSession = Depends(get_db)
):
    """
    Admin login endpoint
    """
    admin = await authenticate_admin(db, login_data.email, login_data.password)
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Update last login
    admin.last_login_at = datetime.utcnow()
    await db.commit()
    await db.refresh(admin)
    
    # Create tokens
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(admin.id), "email": admin.email, "role": admin.role},
        expires_delta=access_token_expires
    )
    refresh_token = create_refresh_token(
        data={"sub": str(admin.id), "email": admin.email}
    )
    
    return AdminLoginResponse(
        user=AdminUserResponse.model_validate(admin),
        token=AdminToken(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
    )


@router.get("/me", response_model=AdminUserResponse)
async def get_current_user(
    current_admin: AdminUser = Depends(get_current_admin)
):
    """
    Get current authenticated admin user
    """
    return AdminUserResponse.model_validate(current_admin)


