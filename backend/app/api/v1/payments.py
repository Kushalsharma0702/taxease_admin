"""
Payment routes
"""
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.dependencies import get_current_admin, require_permission
from app.core.permissions import PERMISSIONS
from app.core.utils import create_audit_log
from app.models.payment import Payment
from app.models.client import Client
from app.schemas.payment import PaymentCreate, PaymentUpdate, PaymentResponse, PaymentListResponse

router = APIRouter()


@router.get("", response_model=PaymentListResponse)
async def get_payments(
    client_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Get all payments"""
    query = select(Payment).options(selectinload(Payment.client), selectinload(Payment.created_by_admin))
    
    if client_id:
        query = query.where(Payment.client_id == client_id)
    
    query = query.order_by(Payment.created_at.desc())
    result = await db.execute(query)
    payments = result.scalars().all()
    
    # Calculate totals
    total_revenue = sum(p.amount for p in payments)
    avg_payment = total_revenue / len(payments) if payments else 0
    
    # Format response
    payment_responses = []
    for payment in payments:
        payment_dict = PaymentResponse.model_validate(payment).model_dump()
        if payment.client:
            payment_dict["client_name"] = payment.client.name
        if payment.created_by_admin:
            payment_dict["created_by_name"] = payment.created_by_admin.name
        payment_responses.append(PaymentResponse(**payment_dict))
    
    return PaymentListResponse(
        payments=payment_responses,
        total=len(payments),
        total_revenue=total_revenue,
        avg_payment=avg_payment
    )


@router.post("", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
async def create_payment(
    payment_data: PaymentCreate,
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(require_permission(PERMISSIONS["ADD_EDIT_PAYMENT"]))
):
    """Create a new payment"""
    # Verify client exists
    client_query = select(Client).where(Client.id == payment_data.client_id)
    client_result = await db.execute(client_query)
    client = client_result.scalar_one_or_none()
    
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    payment = Payment(
        **payment_data.model_dump(),
        created_by_id=current_admin.id
    )
    db.add(payment)
    
    # Update client paid amount
    client.paid_amount += payment.amount
    if client.paid_amount >= client.total_amount:
        client.payment_status = "paid"
    elif client.paid_amount > 0:
        client.payment_status = "partial"
    
    await db.commit()
    await db.refresh(payment)
    await db.refresh(client)
    
    # Create audit log
    await create_audit_log(
        db, "Payment Added", "payment", str(payment.id), current_admin.id,
        new_value=f"${payment.amount} via {payment.method}"
    )
    
    payment_dict = PaymentResponse.model_validate(payment).model_dump()
    payment_dict["client_name"] = client.name
    payment_dict["created_by_name"] = current_admin.name
    
    return PaymentResponse(**payment_dict)


@router.patch("/{payment_id}", response_model=PaymentResponse)
async def update_payment(
    payment_id: UUID,
    payment_data: PaymentUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(require_permission(PERMISSIONS["ADD_EDIT_PAYMENT"]))
):
    """Update a payment"""
    # Get payment
    payment_query = select(Payment).where(Payment.id == payment_id)
    payment_result = await db.execute(payment_query)
    payment = payment_result.scalar_one_or_none()
    
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    # Get client for amount recalculation
    client_query = select(Client).where(Client.id == payment.client_id)
    client_result = await db.execute(client_query)
    client = client_result.scalar_one_or_none()
    
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    old_amount = payment.amount
    
    # Update payment fields
    update_data = payment_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(payment, field, value)
    
    # Recalculate client paid amount if amount changed
    if "amount" in update_data:
        amount_diff = payment.amount - old_amount
        client.paid_amount += amount_diff
        
        # Update payment status
        if client.paid_amount >= client.total_amount:
            client.payment_status = "paid"
        elif client.paid_amount > 0:
            client.payment_status = "partial"
        else:
            client.payment_status = "pending"
    
    await db.commit()
    await db.refresh(payment)
    await db.refresh(client)
    
    # Load relationships
    await db.refresh(payment, ["client", "created_by_admin"])
    
    # Create audit log
    changes = ", ".join([f"{k}: {v}" for k, v in update_data.items()])
    await create_audit_log(
        db, "Payment Updated", "payment", str(payment.id), current_admin.id,
        old_value=f"Old: ${old_amount}", new_value=f"New: {changes}"
    )
    
    payment_dict = PaymentResponse.model_validate(payment).model_dump()
    if payment.client:
        payment_dict["client_name"] = payment.client.name
    if payment.created_by_admin:
        payment_dict["created_by_name"] = payment.created_by_admin.name
    
    return PaymentResponse(**payment_dict)


@router.delete("/{payment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_payment(
    payment_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(require_permission(PERMISSIONS["ADD_EDIT_PAYMENT"]))
):
    """Delete a payment"""
    # Get payment
    payment_query = select(Payment).where(Payment.id == payment_id)
    payment_result = await db.execute(payment_query)
    payment = payment_result.scalar_one_or_none()
    
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    # Get client for amount recalculation
    client_query = select(Client).where(Client.id == payment.client_id)
    client_result = await db.execute(client_query)
    client = client_result.scalar_one_or_none()
    
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Recalculate client paid amount
    client.paid_amount -= payment.amount
    if client.paid_amount < 0:
        client.paid_amount = 0
    
    # Update payment status
    if client.paid_amount >= client.total_amount:
        client.payment_status = "paid"
    elif client.paid_amount > 0:
        client.payment_status = "partial"
    else:
        client.payment_status = "pending"
    
    # Create audit log before deletion
    await create_audit_log(
        db, "Payment Deleted", "payment", str(payment.id), current_admin.id,
        old_value=f"${payment.amount} via {payment.method}"
    )
    
    # Delete payment
    await db.delete(payment)
    await db.commit()
    
    return Response(status_code=status.HTTP_204_NO_CONTENT)

