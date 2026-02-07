#!/usr/bin/env python3
"""
Script to create default admin users for the admin panel
Creates superadmin and admin users with default credentials
"""

import asyncio
import sys
import os
from uuid import uuid4

# Add app to path
sys.path.append(os.path.dirname(__file__))

from app.core.database import AsyncSessionLocal, engine, Base
from app.models.admin_user import AdminUser
from app.core.auth import get_password_hash
from sqlalchemy import select


async def create_default_admins():
    """Create default admin users"""
    
    # Default admin users
    admins = [
        {
            "email": "superadmin@taxease.ca",
            "name": "Super Admin",
            "password": "demo123",
            "role": "superadmin",
            "is_active": True
        },
        {
            "email": "admin@taxease.ca",
            "name": "Admin User",
            "password": "demo123",
            "role": "admin",
            "is_active": True
        }
    ]
    
    async with AsyncSessionLocal() as db:
        try:
            # Initialize database
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            print("✅ Database initialized")
            print()
            
            created_count = 0
            updated_count = 0
            
            for admin_data in admins:
                email = admin_data["email"]
                
                # Check if admin already exists
                result = await db.execute(
                    select(AdminUser).where(AdminUser.email == email)
                )
                existing_admin = result.scalar_one_or_none()
                
                if existing_admin:
                    print(f"✅ Admin already exists: {email}")
                    print(f"   ID: {existing_admin.id}")
                    print(f"   Role: {existing_admin.role}")
                    print(f"   Active: {existing_admin.is_active}")
                    
                    # Update password and ensure it's active
                    existing_admin.password_hash = get_password_hash(admin_data["password"])
                    existing_admin.is_active = True
                    existing_admin.role = admin_data["role"]
                    updated_count += 1
                    print(f"   ✅ Password updated and account activated")
                    print()
                else:
                    # Create new admin
                    print(f"Creating admin: {email}")
                    hashed_password = get_password_hash(admin_data["password"])
                    
                    new_admin = AdminUser(
                        id=uuid4(),
                        email=email,
                        name=admin_data["name"],
                        password_hash=hashed_password,
                        role=admin_data["role"],
                        is_active=admin_data["is_active"]
                    )
                    
                    db.add(new_admin)
                    created_count += 1
                    print(f"   ✅ Admin created successfully!")
                    print(f"   Role: {admin_data['role']}")
                    print()
            
            await db.commit()
            
            print("=" * 60)
            print("✅ Admin Setup Complete!")
            print("=" * 60)
            print(f"Created: {created_count} new admin(s)")
            print(f"Updated: {updated_count} existing admin(s)")
            print()
            print("🔑 Login Credentials:")
            print()
            print("Superadmin:")
            print("  Email: superadmin@taxease.ca")
            print("  Password: demo123")
            print()
            print("Admin:")
            print("  Email: admin@taxease.ca")
            print("  Password: demo123")
            print()
            print("✅ You can now login to the admin panel!")
            
        except Exception as e:
            await db.rollback()
            print(f"❌ Error creating admins: {e}")
            import traceback
            traceback.print_exc()
            sys.exit(1)


if __name__ == "__main__":
    asyncio.run(create_default_admins())






