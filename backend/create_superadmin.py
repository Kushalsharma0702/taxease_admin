"""
Script to create initial superadmin user
"""
import asyncio
from app.core.database import init_db, AsyncSessionLocal
from app.models.admin_user import AdminUser
from app.core.auth import get_password_hash
from app.core.permissions import ALL_PERMISSIONS


async def create_superadmin():
    """Create superadmin user"""
    await init_db()
    
    async with AsyncSessionLocal() as db:
        # Check if superadmin already exists
        from sqlalchemy import select
        result = await db.execute(
            select(AdminUser).where(AdminUser.email == "superadmin@taxease.ca")
        )
        existing = result.scalar_one_or_none()
        
        if existing:
            print("Superadmin already exists!")
            return
        
        # Create superadmin
        admin = AdminUser(
            email="superadmin@taxease.ca",
            name="Super Admin",
            password_hash=get_password_hash("demo123"),
            role="superadmin",
            permissions=ALL_PERMISSIONS,
            is_active=True
        )
        db.add(admin)
        await db.commit()
        
        print("✅ Superadmin created successfully!")
        print("Email: superadmin@taxease.ca")
        print("Password: demo123")


if __name__ == "__main__":
    asyncio.run(create_superadmin())




