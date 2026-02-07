"""
Admin User schemas
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field
from uuid import UUID


class AdminUserBase(BaseModel):
    """Base admin user schema"""
    email: EmailStr
    name: str


class AdminUserCreate(AdminUserBase):
    """Create admin user schema"""
    password: str = Field(..., min_length=8)
    role: str = Field(default="admin", pattern="^(superadmin|admin)$")
    permissions: List[str] = Field(default_factory=list)


class AdminUserUpdate(BaseModel):
    """Update admin user schema"""
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = Field(None, pattern="^(superadmin|admin)$")
    permissions: Optional[List[str]] = None
    is_active: Optional[bool] = None


class AdminUserResponse(BaseModel):
    """Admin user response schema"""
    id: UUID
    email: str
    name: str
    role: str
    permissions: List[str]
    avatar: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    last_login_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class AdminUserWithWorkload(AdminUserResponse):
    """Admin user with client workload"""
    client_count: int = 0


