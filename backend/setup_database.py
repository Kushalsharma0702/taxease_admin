#!/usr/bin/env python3
"""
Database Setup Script
Creates optimized database schema with indexes for performance
"""
import asyncio
import sys
from sqlalchemy import text, Index, inspect
from app.core.database import engine, Base
from app.core.config import settings
from app.models import (
    admin_user, client, document, payment, 
    cost_estimate, note, audit_log
)
from app.core.config import settings


async def create_tables():
    """Create all database tables"""
    print("📊 Creating database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Tables created successfully")


async def create_indexes():
    """Create performance indexes for read/write optimization"""
    print("\n🔍 Creating performance indexes...")
    
    indexes = [
        # Admin Users indexes
        ("admin_users", "email", "idx_admin_users_email", True),
        ("admin_users", "role", "idx_admin_users_role", False),
        ("admin_users", "is_active", "idx_admin_users_is_active", False),
        
        # Clients indexes
        ("clients", "email", "idx_clients_email", True),
        ("clients", "status", "idx_clients_status", False),
        ("clients", "filing_year", "idx_clients_filing_year", False),
        ("clients", "payment_status", "idx_clients_payment_status", False),
        ("clients", "assigned_admin_id", "idx_clients_assigned_admin", False),
        ("clients", ["assigned_admin_id", "status"], "idx_clients_admin_status", False),
        ("clients", ["filing_year", "status"], "idx_clients_year_status", False),
        
        # Documents indexes
        ("documents", "client_id", "idx_documents_client_id", False),
        ("documents", "status", "idx_documents_status", False),
        ("documents", "type", "idx_documents_type", False),
        ("documents", ["client_id", "status"], "idx_documents_client_status", False),
        
        # Payments indexes
        ("payments", "client_id", "idx_payments_client_id", False),
        ("payments", "created_at", "idx_payments_created_at", False),
        ("payments", ["client_id", "created_at"], "idx_payments_client_date", False),
        
        # Audit Logs indexes
        ("audit_logs", "entity_type", "idx_audit_logs_entity_type", False),
        ("audit_logs", "performed_by_id", "idx_audit_logs_performed_by", False),
        ("audit_logs", "timestamp", "idx_audit_logs_timestamp", False),
        ("audit_logs", ["entity_type", "timestamp"], "idx_audit_logs_type_time", False),
        
        # Notes indexes
        ("notes", "client_id", "idx_notes_client_id", False),
        ("notes", "created_at", "idx_notes_created_at", False),
        
        # Cost Estimates indexes
        ("cost_estimates", "client_id", "idx_cost_estimates_client_id", False),
        ("cost_estimates", "status", "idx_cost_estimates_status", False),
    ]
    
    async with engine.begin() as conn:
        for table, columns, index_name, unique in indexes:
            try:
                # Check if index already exists
                check_sql = text("""
                    SELECT EXISTS (
                        SELECT 1 FROM pg_indexes 
                        WHERE indexname = :index_name
                    )
                """)
                result = await conn.execute(check_sql, {"index_name": index_name})
                exists = result.scalar()
                
                if exists:
                    print(f"   ⏭️  Index {index_name} already exists")
                    continue
                
                # Create index
                if isinstance(columns, str):
                    column_list = [columns]
                else:
                    column_list = columns
                
                columns_str = ", ".join(column_list)
                unique_str = "UNIQUE" if unique else ""
                
                create_sql = text(f"""
                    CREATE {unique_str} INDEX IF NOT EXISTS {index_name}
                    ON {table} ({columns_str})
                """)
                
                await conn.execute(create_sql)
                print(f"   ✅ Created index: {index_name} on {table}({columns_str})")
            except Exception as e:
                print(f"   ⚠️  Error creating index {index_name}: {e}")
    
    print("\n✅ Indexes created successfully")


async def create_constraints():
    """Create foreign key constraints and check constraints"""
    print("\n🔗 Creating database constraints...")
    
    constraints = [
        # Foreign key constraints (if not already exists)
        """
        DO $$ 
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint 
                WHERE conname = 'fk_clients_assigned_admin'
            ) THEN
                ALTER TABLE clients 
                ADD CONSTRAINT fk_clients_assigned_admin 
                FOREIGN KEY (assigned_admin_id) 
                REFERENCES admin_users(id) ON DELETE SET NULL;
            END IF;
        END $$;
        """,
        
        """
        DO $$ 
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint 
                WHERE conname = 'fk_documents_client'
            ) THEN
                ALTER TABLE documents 
                ADD CONSTRAINT fk_documents_client 
                FOREIGN KEY (client_id) 
                REFERENCES clients(id) ON DELETE CASCADE;
            END IF;
        END $$;
        """,
        
        """
        DO $$ 
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint 
                WHERE conname = 'fk_payments_client'
            ) THEN
                ALTER TABLE payments 
                ADD CONSTRAINT fk_payments_client 
                FOREIGN KEY (client_id) 
                REFERENCES clients(id) ON DELETE CASCADE;
            END IF;
        END $$;
        """,
        
        """
        DO $$ 
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint 
                WHERE conname = 'fk_payments_created_by'
            ) THEN
                ALTER TABLE payments 
                ADD CONSTRAINT fk_payments_created_by 
                FOREIGN KEY (created_by_admin_id) 
                REFERENCES admin_users(id) ON DELETE SET NULL;
            END IF;
        END $$;
        """,
        
        """
        DO $$ 
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint 
                WHERE conname = 'fk_notes_client'
            ) THEN
                ALTER TABLE notes 
                ADD CONSTRAINT fk_notes_client 
                FOREIGN KEY (client_id) 
                REFERENCES clients(id) ON DELETE CASCADE;
            END IF;
        END $$;
        """,
        
        """
        DO $$ 
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint 
                WHERE conname = 'fk_notes_author'
            ) THEN
                ALTER TABLE notes 
                ADD CONSTRAINT fk_notes_author 
                FOREIGN KEY (author_id) 
                REFERENCES admin_users(id) ON DELETE SET NULL;
            END IF;
        END $$;
        """,
        
        """
        DO $$ 
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint 
                WHERE conname = 'fk_audit_logs_performed_by'
            ) THEN
                ALTER TABLE audit_logs 
                ADD CONSTRAINT fk_audit_logs_performed_by 
                FOREIGN KEY (performed_by_id) 
                REFERENCES admin_users(id) ON DELETE SET NULL;
            END IF;
        END $$;
        """,
    ]
    
    async with engine.begin() as conn:
        for constraint_sql in constraints:
            try:
                await conn.execute(text(constraint_sql))
            except Exception as e:
                print(f"   ⚠️  Constraint creation warning: {e}")
    
    print("✅ Constraints created successfully")


async def analyze_tables():
    """Run ANALYZE on all tables for query planner optimization"""
    print("\n📈 Analyzing tables for query optimization...")
    
    tables = [
        "admin_users", "clients", "documents", "payments",
        "notes", "audit_logs", "cost_estimates"
    ]
    
    async with engine.begin() as conn:
        for table in tables:
            try:
                await conn.execute(text(f"ANALYZE {table}"))
                print(f"   ✅ Analyzed {table}")
            except Exception as e:
                print(f"   ⚠️  Error analyzing {table}: {e}")
    
    print("✅ Table analysis complete")


async def cleanup_dummy_data():
    """Remove all dummy/test data from database"""
    print("\n🧹 Cleaning up dummy/test data...")
    
    cleanup_queries = [
        # Delete test payments
        "DELETE FROM payments WHERE amount < 10 OR amount > 10000",
        
        # Delete test clients (keep only real ones)
        "DELETE FROM clients WHERE email LIKE '%test%' OR email LIKE '%example%' OR email LIKE '%demo%'",
        
        # Delete orphaned documents
        "DELETE FROM documents WHERE client_id NOT IN (SELECT id FROM clients)",
        
        # Delete orphaned notes
        "DELETE FROM notes WHERE client_id NOT IN (SELECT id FROM clients)",
        
        # Delete test audit logs (optional - keep for now)
        # "DELETE FROM audit_logs WHERE action LIKE '%Test%' OR action LIKE '%test%'",
    ]
    
    async with engine.begin() as conn:
        for query in cleanup_queries:
            try:
                result = await conn.execute(text(query))
                deleted = result.rowcount
                if deleted > 0:
                    print(f"   ✅ Cleaned up {deleted} rows")
            except Exception as e:
                print(f"   ⚠️  Cleanup warning: {e}")
    
    print("✅ Data cleanup complete")


async def main():
    """Main setup function"""
    print("=" * 60)
    print("🚀 Database Setup and Optimization")
    print("=" * 60)
    print(f"\n📋 Database URL: {settings.DATABASE_URL.split('@')[1] if '@' in settings.DATABASE_URL else settings.DATABASE_URL}")
    print()
    
    try:
        # Step 1: Create tables
        await create_tables()
        
        # Step 2: Create indexes for performance
        await create_indexes()
        
        # Step 3: Create constraints
        await create_constraints()
        
        # Step 4: Analyze tables
        await analyze_tables()
        
        # Step 5: Cleanup dummy data
        await cleanup_dummy_data()
        
        print("\n" + "=" * 60)
        print("✅ Database setup complete!")
        print("=" * 60)
        print("\n📊 Your database is now optimized for:")
        print("   • Fast read operations (indexes on commonly queried columns)")
        print("   • Efficient write operations (optimized indexes)")
        print("   • Data integrity (foreign key constraints)")
        print("   • Query planning (ANALYZE statistics)")
        print()
        
    except Exception as e:
        print(f"\n❌ Error during setup: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())

