"""
Authentication schemas
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field
from uuid import UUID


class AdminLogin(BaseModel):
    """Admin login request"""
    email: EmailStr
    password: str


class AdminToken(BaseModel):
    """Token response"""
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    expires_in: int


class AdminUserResponse(BaseModel):
    """Admin user response"""
    id: UUID
    email: str
    name: str
    role: str
    permissions: List[str]
    avatar: Optional[str] = None
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class AdminLoginResponse(BaseModel):
    """Login response with user and token"""
    user: AdminUserResponse
    token: AdminToken


