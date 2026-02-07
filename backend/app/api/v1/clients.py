"""
Client routes
"""
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.dependencies import get_current_admin, require_permission
from app.core.utils import create_audit_log, calculate_pagination
from app.core.permissions import PERMISSIONS
from app.models.client import Client
from app.models.admin_user import AdminUser
from app.schemas.client import (
    ClientCreate, ClientUpdate, ClientResponse, ClientListResponse
)

router = APIRouter()


@router.get("", response_model=ClientListResponse)
async def get_clients(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = Query(None, alias="status"),
    year_filter: Optional[int] = Query(None, alias="year"),
    search: Optional[str] = None,
    email: Optional[str] = Query(None),  # Direct email search for sync
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Get all clients with pagination and filters"""
    query = select(Client).options(selectinload(Client.assigned_admin))
    
    # Apply filters
    conditions = []
    if status_filter:
        conditions.append(Client.status == status_filter)
    if year_filter:
        conditions.append(Client.filing_year == year_filter)
    if email:
        # Exact email match for sync service
        conditions.append(Client.email == email)
    elif search:
        conditions.append(
            or_(
                Client.name.ilike(f"%{search}%"),
                Client.email.ilike(f"%{search}%")
            )
        )
    
    if conditions:
        query = query.where(and_(*conditions))
    
    # Count total
    count_query = select(func.count()).select_from(Client)
    if conditions:
        count_query = count_query.where(and_(*conditions))
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Apply pagination
    query = query.order_by(Client.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    
    result = await db.execute(query)
    clients = result.scalars().all()
    
    # Format response
    client_responses = []
    for client in clients:
        client_dict = ClientResponse.model_validate(client).model_dump()
        if client.assigned_admin:
            client_dict["assigned_admin_name"] = client.assigned_admin.name
        client_responses.append(ClientResponse(**client_dict))
    
    pagination = calculate_pagination(page, page_size, total)
    
    return ClientListResponse(
        clients=client_responses,
        **pagination
    )


@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(
    client_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Get a specific client"""
    query = select(Client).options(selectinload(Client.assigned_admin)).where(Client.id == client_id)
    result = await db.execute(query)
    client = result.scalar_one_or_none()
    
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    client_dict = ClientResponse.model_validate(client).model_dump()
    if client.assigned_admin:
        client_dict["assigned_admin_name"] = client.assigned_admin.name
    
    return ClientResponse(**client_dict)


@router.post("", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
async def create_client(
    client_data: ClientCreate,
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(require_permission(PERMISSIONS["ADD_EDIT_CLIENT"]))
):
    """Create a new client"""
    # Check if email already exists for the same year
    existing = await db.execute(
        select(Client).where(
            and_(Client.email == client_data.email, Client.filing_year == client_data.filing_year)
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Client with this email already exists for this year")
    
    client = Client(**client_data.model_dump())
    db.add(client)
    await db.commit()
    await db.refresh(client)
    
    # Create audit log
    await create_audit_log(
        db, "Client Created", "client", str(client.id), current_admin.id,
        new_value=f"Client: {client.name}"
    )
    
    return ClientResponse.model_validate(client)


@router.patch("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: UUID,
    client_data: ClientUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(require_permission(PERMISSIONS["ADD_EDIT_CLIENT"]))
):
    """Update a client"""
    query = select(Client).where(Client.id == client_id)
    result = await db.execute(query)
    client = result.scalar_one_or_none()
    
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    old_values = {k: str(v) for k, v in client_data.model_dump(exclude_unset=True).items()}
    new_values = {}
    
    for key, value in client_data.model_dump(exclude_unset=True).items():
        if hasattr(client, key):
            old_values[key] = str(getattr(client, key))
            setattr(client, key, value)
            new_values[key] = str(value)
    
    await db.commit()
    await db.refresh(client)
    
    # Create audit log
    await create_audit_log(
        db, "Client Updated", "client", str(client.id), current_admin.id,
        old_value=str(old_values) if old_values else None,
        new_value=str(new_values) if new_values else None
    )
    
    return ClientResponse.model_validate(client)


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_client(
    client_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(require_permission(PERMISSIONS["ADD_EDIT_CLIENT"]))
):
    """Delete a client"""
    query = select(Client).where(Client.id == client_id)
    result = await db.execute(query)
    client = result.scalar_one_or_none()
    
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    client_name = client.name
    await db.delete(client)
    await db.commit()
    
    # Create audit log
    await create_audit_log(
        db, "Client Deleted", "client", str(client_id), current_admin.id,
        old_value=f"Client: {client_name}"
    )



