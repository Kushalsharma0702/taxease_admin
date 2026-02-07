#!/usr/bin/env python3
"""
Script to clear all dummy/test data from database
"""
import asyncio
from sqlalchemy import text
from app.core.database import engine, init_db


async def clear_dummy_data():
    """Remove all dummy/test data"""
    await init_db()
    
    print("🧹 Clearing dummy/test data from database...")
    print()
    
    cleanup_queries = [
        # Delete test/dummy clients
        ("clients", "DELETE FROM clients WHERE email LIKE '%test%' OR email LIKE '%example%' OR email LIKE '%demo%' OR name LIKE '%Test%' OR name LIKE '%Dummy%'"),
        
        # Delete test payments (unrealistic amounts)
        ("payments", "DELETE FROM payments WHERE amount < 10 OR amount > 10000"),
        
        # Delete orphaned documents
        ("documents", "DELETE FROM documents WHERE client_id NOT IN (SELECT id FROM clients)"),
        
        # Delete orphaned notes
        ("notes", "DELETE FROM notes WHERE client_id NOT IN (SELECT id FROM clients)"),
        
        # Delete orphaned cost estimates
        ("cost_estimates", "DELETE FROM cost_estimates WHERE client_id NOT IN (SELECT id FROM clients)"),
    ]
    
    async with engine.begin() as conn:
        total_deleted = 0
        for table, query in cleanup_queries:
            try:
                result = await conn.execute(text(query))
                deleted = result.rowcount
                if deleted > 0:
                    print(f"   ✅ Deleted {deleted} rows from {table}")
                    total_deleted += deleted
            except Exception as e:
                print(f"   ⚠️  Warning for {table}: {e}")
    
    # Get current counts
    async with engine.begin() as conn:
        counts = {}
        tables = ["clients", "payments", "documents", "notes", "admin_users"]
        for table in tables:
            result = await conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
            counts[table] = result.scalar()
    
    print()
    print("✅ Cleanup complete!")
    print()
    print("📊 Current database counts:")
    for table, count in counts.items():
        print(f"   • {table}: {count}")
    print()
    
    if total_deleted > 0:
        print(f"🗑️  Total rows deleted: {total_deleted}")
    else:
        print("✨ No dummy data found - database is clean!")


if __name__ == "__main__":
    asyncio.run(clear_dummy_data())







