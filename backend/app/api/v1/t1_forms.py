"""
T1 Forms endpoints - Access client backend T1 forms from admin backend
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List
import httpx
import os
from datetime import datetime

from app.core.database import get_db
from app.core.dependencies import get_current_admin
from app.models.client import Client
from app.schemas.t1_form import T1FormListResponse, T1FormResponse
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/t1-forms", tags=["T1 Forms"])

# Client backend URL
CLIENT_BACKEND_URL = os.getenv("CLIENT_BACKEND_URL", "http://localhost:8001/api/v1")


@router.get("", response_model=T1FormListResponse)
async def get_t1_forms(
    client_id: Optional[str] = Query(None, description="Filter by client ID"),
    client_email: Optional[str] = Query(None, description="Filter by client email"),
    status_filter: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """
    Get T1 forms from client backend
    Admin can view all T1 forms or filter by client
    """
    try:
        # If client_id or client_email provided, get client first
        client = None
        if client_id:
            result = await db.execute(select(Client).where(Client.id == client_id))
            client = result.scalar_one_or_none()
            if not client:
                raise HTTPException(status_code=404, detail="Client not found")
        
        if client_email:
            result = await db.execute(select(Client).where(Client.email == client_email.lower()))
            client = result.scalar_one_or_none()
            if not client:
                raise HTTPException(status_code=404, detail="Client not found")
            client_id = str(client.id)
        
        # Build query params for client backend
        params = {
            "limit": limit,
            "offset": offset
        }
        
        # If filtering by client, we'll need to call client backend
        # For now, return a proxy endpoint that fetches from client backend
        # Note: This requires client backend to have an admin endpoint or shared access
        
        # Since both backends use the same database, we can query directly
        # But T1 forms are in client backend's database schema
        # We'll use HTTP API to fetch from client backend
        
        async with httpx.AsyncClient(timeout=10.0) as http_client:
            # Note: Client backend might need admin authentication
            # For now, we'll try to fetch directly
            response = await http_client.get(
                f"{CLIENT_BACKEND_URL}/t1-forms/",
                params=params
            )
            
            if response.status_code == 200:
                data = response.json()
                # Map client backend response to admin format
                forms = []
                for form in data.get("forms", []):
                    # Get client info for each form
                    user_email = form.get("user_id")  # This would need to be mapped
                    forms.append({
                        "id": form.get("id"),
                        "status": form.get("status"),
                        "tax_year": form.get("tax_year"),
                        "client_email": user_email,  # Would need user lookup
                        "created_at": form.get("created_at"),
                        "updated_at": form.get("updated_at")
                    })
                
                return {
                    "forms": forms,
                    "total": data.get("total", 0),
                    "offset": offset,
                    "limit": limit
                }
            else:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Failed to fetch T1 forms: {response.text}"
                )
                
    except httpx.RequestError as e:
        logger.error(f"Error connecting to client backend: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Client backend is not available"
        )
    except Exception as e:
        logger.error(f"Error fetching T1 forms: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )






