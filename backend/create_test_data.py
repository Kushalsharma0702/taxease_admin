"""
Script to create test data for demonstration
"""
import asyncio
from app.core.database import init_db, AsyncSessionLocal
from app.models.admin_user import AdminUser
from app.models.client import Client
from app.models.document import Document
from app.models.payment import Payment
from sqlalchemy import select
from datetime import datetime


async def create_test_data():
    """Create test data"""
    await init_db()
    
    async with AsyncSessionLocal() as db:
        # Get superadmin
        result = await db.execute(select(AdminUser).where(AdminUser.email == "superadmin@taxease.ca"))
        superadmin = result.scalar_one_or_none()
        
        if not superadmin:
            print("❌ Superadmin not found!")
            return
        
        # Check if test clients already exist
        result = await db.execute(select(Client).where(Client.email == "michael.chen@email.com"))
        existing = result.scalar_one_or_none()
        
        if existing:
            print("✅ Test data already exists!")
            return
        
        # Create test clients
        test_clients = [
            {
                "name": "Michael Chen",
                "email": "michael.chen@email.com",
                "phone": "(416) 555-0101",
                "filing_year": 2024,
                "status": "documents_pending",
                "payment_status": "pending",
                "total_amount": 450.0,
                "paid_amount": 0.0,
            },
            {
                "name": "Emily Watson",
                "email": "emily.watson@email.com",
                "phone": "(647) 555-0202",
                "filing_year": 2024,
                "status": "under_review",
                "payment_status": "partial",
                "total_amount": 600.0,
                "paid_amount": 300.0,
            },
            {
                "name": "David Thompson",
                "email": "david.t@email.com",
                "phone": "(905) 555-0303",
                "filing_year": 2024,
                "status": "awaiting_payment",
                "payment_status": "pending",
                "total_amount": 350.0,
                "paid_amount": 0.0,
            },
        ]
        
        clients = []
        for client_data in test_clients:
            client = Client(**client_data, assigned_admin_id=superadmin.id)
            db.add(client)
            clients.append(client)
        
        await db.commit()
        
        # Refresh clients to get IDs
        for client in clients:
            await db.refresh(client)
        
        # Create documents for first client
        documents = [
            Document(
                client_id=clients[0].id,
                name="T4 Slip",
                type="income",
                status="complete",
                version=1,
                uploaded_at=datetime.utcnow(),
            ),
            Document(
                client_id=clients[0].id,
                name="T5 Slip",
                type="investment",
                status="pending",
                version=1,
            ),
            Document(
                client_id=clients[0].id,
                name="RRSP Receipt",
                type="deduction",
                status="missing",
                version=1,
            ),
        ]
        
        for doc in documents:
            db.add(doc)
        
        # Create payments
        payments = [
            Payment(
                client_id=clients[1].id,
                amount=300.0,
                method="E-Transfer",
                created_by_id=superadmin.id,
            ),
            Payment(
                client_id=clients[0].id,
                amount=200.0,
                method="Credit Card",
                created_by_id=superadmin.id,
            ),
        ]
        
        for payment in payments:
            db.add(payment)
        
        await db.commit()
        
        print("✅ Test data created successfully!")
        print(f"   - {len(clients)} clients")
        print(f"   - {len(documents)} documents")
        print(f"   - {len(payments)} payments")


if __name__ == "__main__":
    asyncio.run(create_test_data())




