#!/usr/bin/env python3
"""
Script to create admin users with custom permissions
Usage: python create_admin.py <email> <name> <password> <role> [permissions...]
"""
import asyncio
import sys
from app.core.database import init_db, AsyncSessionLocal
from app.models.admin_user import AdminUser
from app.core.auth import get_password_hash
from app.core.permissions import ALL_PERMISSIONS
from sqlalchemy import select


async def create_admin(email: str, name: str, password: str, role: str, permissions: list = None):
    """Create an admin user with specified permissions"""
    await init_db()
    
    async with AsyncSessionLocal() as db:
        # Check if admin already exists
        result = await db.execute(select(AdminUser).where(AdminUser.email == email))
        existing = result.scalar_one_or_none()
        
        if existing:
            print(f"❌ Admin with email {email} already exists!")
            print(f"   Name: {existing.name}")
            print(f"   Role: {existing.role}")
            return
        
        # Validate role
        if role not in ["admin", "superadmin"]:
            print(f"❌ Invalid role: {role}. Must be 'admin' or 'superadmin'")
            return
        
        # Set permissions
        if role == "superadmin":
            admin_permissions = ALL_PERMISSIONS
            print("   Superadmin will have all permissions")
        elif permissions:
            # Validate permissions
            invalid_perms = [p for p in permissions if p not in ALL_PERMISSIONS]
            if invalid_perms:
                print(f"❌ Invalid permissions: {invalid_perms}")
                print(f"   Valid permissions: {', '.join(ALL_PERMISSIONS)}")
                return
            admin_permissions = permissions
        else:
            # Default permissions for admin
            admin_permissions = [
                "add_edit_client",
                "view_analytics",
                "request_documents"
            ]
            print("   Using default permissions for admin role")
        
        # Create admin
        admin = AdminUser(
            email=email,
            name=name,
            password_hash=get_password_hash(password),
            role=role,
            permissions=admin_permissions,
            is_active=True
        )
        db.add(admin)
        await db.commit()
        
        print("✅ Admin user created successfully!")
        print(f"   Email: {email}")
        print(f"   Name: {name}")
        print(f"   Role: {role}")
        print(f"   Permissions: {', '.join(admin_permissions)}")
        print(f"   Total permissions: {len(admin_permissions)}")


def main():
    """Main function"""
    if len(sys.argv) < 5:
        print("Usage: python create_admin.py <email> <name> <password> <role> [permissions...]")
        print("\nExample:")
        print("  python create_admin.py admin@taxease.ca 'John Admin' 'password123' admin")
        print("  python create_admin.py admin@taxease.ca 'John Admin' 'password123' admin add_edit_client view_analytics")
        print("  python create_admin.py super@taxease.ca 'Super Admin' 'password123' superadmin")
        print("\nAvailable permissions:")
        for perm in ALL_PERMISSIONS:
            print(f"  - {perm}")
        sys.exit(1)
    
    email = sys.argv[1]
    name = sys.argv[2]
    password = sys.argv[3]
    role = sys.argv[4]
    permissions = sys.argv[5:] if len(sys.argv) > 5 else None
    
    asyncio.run(create_admin(email, name, password, role, permissions))


if __name__ == "__main__":
    main()







