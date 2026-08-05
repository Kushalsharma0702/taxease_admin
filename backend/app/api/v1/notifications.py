"""
Notifications endpoint for admin dashboard.

On any admin action (status change, document request, payment request, general note):
1. Inserts a record into the shared `notifications` table (visible in client app)
2. Sends a professional HTML email via AWS SES
3. Fires a push notification via Firebase Cloud Messaging (FCM)

Email and push are fire-and-forget — failures never block the HTTP response.
"""
from __future__ import annotations

import json
import logging
import os
import uuid as uuidlib
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_admin
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()


# ─── Request/Response models ──────────────────────────────────────────────────

class SendNotificationRequest(BaseModel):
    client_id: UUID
    type: str = "general"  # general | document_request | payment_request | status_update | reupload_requested
    title: str
    message: str
    doc_name: Optional[str] = None
    amount: Optional[float] = None
    new_status: Optional[str] = None
    reason: Optional[str] = None
    filing_year: Optional[int] = None


class NotificationResponse(BaseModel):
    id: str
    user_id: str
    type: str
    title: str
    message: str
    is_read: bool
    created_at: Optional[str] = None


# ─── Email via AWS SES ────────────────────────────────────────────────────────

APP_URL = "https://tax.diamondaccounts.ca"
PRIMARY = "#1a3c5e"
ACCENT = "#2563eb"


def _send_ses_email(*, to_email: str, subject: str, html_body: str, plain_body: str) -> dict:
    """Send email via SES. Returns {"sent": True/False, ...}."""
    if not getattr(settings, "ENABLE_EMAIL_NOTIFICATIONS", True):
        return {"sent": False, "reason": "disabled"}
    if not to_email:
        return {"sent": False, "reason": "no-recipient"}

    try:
        import boto3
        from botocore.exceptions import BotoCoreError, ClientError

        client = boto3.client(
            "ses",
            region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        )

        sender_email = settings.SES_FROM_EMAIL
        sender_name = settings.SENDER_NAME

        mime = MIMEMultipart("alternative")
        mime["Subject"] = subject
        mime["From"] = f"{sender_name} <{sender_email}>"
        mime["To"] = to_email
        mime.attach(MIMEText(plain_body, "plain", "utf-8"))
        mime.attach(MIMEText(html_body, "html", "utf-8"))

        resp = client.send_raw_email(
            Source=sender_email,
            Destinations=[to_email],
            RawMessage={"Data": mime.as_string()},
        )
        logger.info(f"email.sent to={to_email} subject={subject!r} ses_id={resp.get('MessageId')}")
        return {"sent": True, "ses_message_id": resp.get("MessageId")}
    except Exception as exc:
        logger.error(f"email.failed to={to_email} error={exc}")
        return {"sent": False, "error": str(exc)}


def _build_email(*, client_name: str, notif_type: str, title: str, message: str,
                 doc_name: str = "", amount: float = 0, new_status: str = "",
                 filing_year: int = 2025) -> tuple[str, str, str]:
    """Build subject, html, plain for a notification email."""

    if notif_type == "document_request" and doc_name:
        subject = f"Action Required: Please Upload {doc_name}"
        plain = f"Hi {client_name},\n\nYour tax advisor has requested: {doc_name}\n\n{message}\n\nPlease upload it at: {APP_URL}/welcome"
        html = f"""<html><body style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
        <div style="background:{PRIMARY};padding:24px 32px;color:white;border-radius:8px 8px 0 0">
          <h2 style="margin:0">Diamond Accounts</h2>
          <p style="margin:4px 0 0;color:#93c5fd;font-size:12px">Tax Filing Services</p>
        </div>
        <div style="padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
          <h3>Document Request</h3>
          <p>Hi <strong>{client_name}</strong>,</p>
          <p>Your tax advisor has requested the following document for your <strong>{filing_year}</strong> tax return:</p>
          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:14px 18px;margin:16px 0">
            <strong>{doc_name}</strong>
          </div>
          {"<p><em>" + message + "</em></p>" if message else ""}
          <p><a href="{APP_URL}/welcome" style="display:inline-block;background:{ACCENT};color:white;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold">Upload Document Now</a></p>
        </div>
        </body></html>"""
    elif notif_type == "payment_request" and amount:
        subject = f"Payment Request — ${amount:,.2f} Due"
        plain = f"Hi {client_name},\n\nA payment of ${amount:,.2f} CAD has been requested for your {filing_year} tax filing.\n{message}\n\nPlease log in: {APP_URL}/welcome"
        html = f"""<html><body style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
        <div style="background:{PRIMARY};padding:24px 32px;color:white;border-radius:8px 8px 0 0">
          <h2 style="margin:0">Diamond Accounts</h2>
          <p style="margin:4px 0 0;color:#93c5fd;font-size:12px">Tax Filing Services</p>
        </div>
        <div style="padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
          <h3>Payment Request</h3>
          <p>Hi <strong>{client_name}</strong>,</p>
          <p>A payment has been requested for your <strong>{filing_year}</strong> tax filing:</p>
          <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:6px;padding:20px;margin:16px 0;text-align:center">
            <p style="margin:0;font-size:13px;color:#166534;text-transform:uppercase">Amount Due</p>
            <p style="margin:8px 0 0;font-size:32px;font-weight:800;color:#15803d">${amount:,.2f} CAD</p>
          </div>
          {"<p>" + message + "</p>" if message else ""}
          <p><a href="{APP_URL}/welcome" style="display:inline-block;background:{ACCENT};color:white;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold">View & Pay Now</a></p>
        </div>
        </body></html>"""
    elif notif_type == "status_update" and new_status:
        label = new_status.replace("_", " ").title()
        subject = f"Tax Return Update: {label} — {filing_year} Filing"
        plain = f"Hi {client_name},\n\nYour {filing_year} tax return status has been updated to: {label}.\n{message}\n\nView filing: {APP_URL}/welcome"
        html = f"""<html><body style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
        <div style="background:{PRIMARY};padding:24px 32px;color:white;border-radius:8px 8px 0 0">
          <h2 style="margin:0">Diamond Accounts</h2>
          <p style="margin:4px 0 0;color:#93c5fd;font-size:12px">Tax Filing Services</p>
        </div>
        <div style="padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
          <h3>Filing Status Update</h3>
          <p>Hi <strong>{client_name}</strong>,</p>
          <p>Your <strong>{filing_year}</strong> tax return status has been updated:</p>
          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:14px 18px;margin:16px 0">
            <strong style="color:{ACCENT}">{label}</strong>
          </div>
          {"<p>" + message + "</p>" if message else ""}
          <p><a href="{APP_URL}/welcome" style="display:inline-block;background:{ACCENT};color:white;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold">View My Filing</a></p>
        </div>
        </body></html>"""
    else:
        subject = title or f"Message from Your Tax Advisor — {filing_year}"
        plain = f"Hi {client_name},\n\n{message}\n\nLog in: {APP_URL}/welcome"
        html = f"""<html><body style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
        <div style="background:{PRIMARY};padding:24px 32px;color:white;border-radius:8px 8px 0 0">
          <h2 style="margin:0">Diamond Accounts</h2>
          <p style="margin:4px 0 0;color:#93c5fd;font-size:12px">Tax Filing Services</p>
        </div>
        <div style="padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
          <h3>{title}</h3>
          <p>Hi <strong>{client_name}</strong>,</p>
          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:16px 20px;margin:16px 0">
            <p style="white-space:pre-wrap">{message}</p>
          </div>
          <p><a href="{APP_URL}/welcome" style="display:inline-block;background:{ACCENT};color:white;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold">Open TaxEase App</a></p>
        </div>
        </body></html>"""

    return subject, html, plain


# ─── Firebase Cloud Messaging (push) ─────────────────────────────────────────

FCM_PROJECT_ID = "taxease-58eb1"
FCM_SEND_URL = f"https://fcm.googleapis.com/v1/projects/{FCM_PROJECT_ID}/messages:send"


def _send_push_to_user(user_id: str, title: str, body: str, data: dict = None) -> dict:
    """Fire-and-forget FCM push to all active device tokens for a user."""
    raw = os.getenv("FCM_SERVICE_ACCOUNT_JSON", "").strip()
    if not raw:
        return {"sent": 0, "reason": "fcm_not_configured"}

    try:
        sa_info = json.loads(raw) if raw.startswith("{") else json.load(open(raw))
        from google.oauth2 import service_account
        import google.auth.transport.requests
        creds = service_account.Credentials.from_service_account_info(
            sa_info, scopes=["https://www.googleapis.com/auth/firebase.messaging"]
        )
        creds.refresh(google.auth.transport.requests.Request())
        access_token = creds.token
    except Exception as e:
        logger.warning(f"FCM: credentials error: {e}")
        return {"sent": 0, "error": str(e)}

    # Fetch active device tokens from DB (sync connection to avoid async issues)
    try:
        import urllib.parse
        db_url = os.getenv("DATABASE_URL", "")
        sync_url = db_url.replace("postgresql+asyncpg://", "").replace("postgresql://", "")
        parsed = urllib.parse.urlparse("postgresql://" + sync_url)
        import psycopg2
        conn = psycopg2.connect(
            host=parsed.hostname, port=parsed.port or 5432,
            dbname=parsed.path.lstrip("/"),
            user=parsed.username, password=parsed.password,
        )
        cur = conn.cursor()
        cur.execute(
            "SELECT id::text, token FROM notification_device_tokens WHERE user_id = %s AND is_active = true",
            (str(user_id),)
        )
        tokens = cur.fetchall()
        cur.close()
        conn.close()
    except Exception as e:
        logger.warning(f"FCM: DB lookup failed: {e}")
        return {"sent": 0, "error": str(e)}

    if not tokens:
        return {"sent": 0, "reason": "no_tokens"}

    import httpx
    str_data = {str(k): str(v) for k, v in (data or {}).items() if v is not None}
    sent_count = 0
    for token_id, device_token in tokens:
        payload = {
            "message": {
                "token": device_token,
                "notification": {"title": title, "body": body},
                "data": str_data,
                "android": {"priority": "high", "notification": {"channel_id": "default_channel", "sound": "default"}},
                "apns": {"headers": {"apns-priority": "10"}, "payload": {"aps": {"sound": "default", "badge": 1}}},
            }
        }
        try:
            resp = httpx.post(
                FCM_SEND_URL,
                headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"},
                json=payload, timeout=8.0,
            )
            if resp.status_code == 200:
                sent_count += 1
        except Exception:
            pass

    return {"sent": sent_count}


# ─── Routes ──────────────────────────────────────────────────────────────────

@router.get("")
async def list_notifications(
    client_id: str = Query(...),
    unread_only: bool = Query(False),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    """Get notifications sent to a client (by user_id or filing→user resolution)."""
    where = "WHERE n.user_id = :uid::uuid"
    if unread_only:
        where += " AND n.is_read = false"

    # Also try resolving client_id as filing_id → user_id
    sql = text(f"""
        SELECT n.id::text, n.user_id::text, n.type, n.title, n.message,
               n.is_read, n.created_at
        FROM notifications n
        {where}
        UNION
        SELECT n.id::text, n.user_id::text, n.type, n.title, n.message,
               n.is_read, n.created_at
        FROM notifications n
        JOIN filings f ON f.user_id = n.user_id
        WHERE f.id = :uid::uuid
        ORDER BY created_at DESC
        LIMIT :limit
    """)
    try:
        result = await db.execute(sql, {"uid": client_id, "limit": limit})
        rows = result.fetchall()
    except Exception:
        # If UUID cast fails (not a valid UUID), return empty
        return {"notifications": [], "total": 0}

    # Deduplicate (UNION should handle but just in case)
    seen = set()
    notifications = []
    for r in rows:
        if r[0] in seen:
            continue
        seen.add(r[0])
        notifications.append({
            "id": r[0],
            "user_id": r[1],
            "type": r[2],
            "title": r[3],
            "message": r[4],
            "is_read": bool(r[5]),
            "created_at": r[6].isoformat() if r[6] else None,
        })

    return {"notifications": notifications, "total": len(notifications)}


@router.post("", status_code=status.HTTP_201_CREATED)
async def send_notification(
    req: SendNotificationRequest,
    db: AsyncSession = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    """
    Send a notification to a client:
    1. Insert into notifications table (in-app notification)
    2. Send email via SES
    3. Send push via FCM
    """
    # Resolve client → user
    user_row = (await db.execute(
        text("SELECT id::text, COALESCE(first_name || ' ' || last_name, email) AS name, email FROM users WHERE id = :id LIMIT 1"),
        {"id": str(req.client_id)},
    )).fetchone()

    if not user_row:
        # Maybe client_id is a filing_id — resolve to user
        user_row = (await db.execute(
            text("""
                SELECT u.id::text, COALESCE(u.first_name || ' ' || u.last_name, u.email) AS name, u.email
                FROM users u JOIN filings f ON f.user_id = u.id
                WHERE f.id = :fid LIMIT 1
            """),
            {"fid": str(req.client_id)},
        )).fetchone()

    if not user_row:
        raise HTTPException(status_code=404, detail="Client not found")

    user_id, client_name, client_email = user_row[0], (user_row[1] or "").strip(), user_row[2]
    if not client_name:
        client_name = client_email.split("@")[0].replace(".", " ").title()

    filing_year = req.filing_year or datetime.now().year
    admin_name = getattr(current_admin, "name", "Your Tax Advisor")

    # 1. Build & send email
    subject, html, plain = _build_email(
        client_name=client_name, notif_type=req.type,
        title=req.title, message=req.message,
        doc_name=req.doc_name or "", amount=req.amount or 0,
        new_status=req.new_status or "", filing_year=filing_year,
    )
    email_result = _send_ses_email(to_email=client_email, subject=subject, html_body=html, plain_body=plain)

    # 2. Send push notification (fire-and-forget)
    push_title = req.title
    push_body = req.message[:120]
    push_data = {"type": req.type}
    if req.type == "document_request":
        push_title = "Document Required"
        push_body = f"Please upload: {req.doc_name}"
        push_data["doc_name"] = req.doc_name or ""
    elif req.type == "payment_request":
        push_title = "Payment Due"
        push_body = f"A payment of ${req.amount:,.2f} CAD has been requested."
        push_data["amount"] = str(req.amount or 0)
    elif req.type == "status_update":
        push_title = "Filing Status Updated"
        push_body = f"Your tax return is now: {(req.new_status or '').replace('_', ' ').title()}"
        push_data["status"] = req.new_status or ""

    try:
        _send_push_to_user(user_id, push_title, push_body, push_data)
    except Exception as e:
        logger.warning(f"Push notification failed: {e}")

    # 3. Insert notification record
    nid = str(uuidlib.uuid4())
    title_to_store = req.title
    message_to_store = req.message
    if not email_result.get("sent"):
        title_to_store = f"{req.title} (email pending)"
        message_to_store = f"{req.message}\n\n[Email dispatch pending: {email_result.get('error', 'unknown')}]"

    await db.execute(
        text("""
            INSERT INTO notifications (id, user_id, filing_id, created_by_id, type, title, message, is_read, created_at)
            VALUES (:id, :uid::uuid, :filing_id, :admin_id, :type, :title, :message, false, NOW())
        """),
        {
            "id": nid,
            "uid": user_id,
            "filing_id": None,
            "admin_id": str(current_admin.id),
            "type": req.type,
            "title": title_to_store,
            "message": message_to_store,
        },
    )
    await db.commit()

    return NotificationResponse(
        id=nid,
        user_id=user_id,
        type=req.type,
        title=title_to_store,
        message=message_to_store,
        is_read=False,
        created_at=datetime.utcnow().isoformat(),
    )


@router.patch("/{notification_id}/read")
async def mark_notification_read(
    notification_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    """Mark a notification as read."""
    await db.execute(
        text("UPDATE notifications SET is_read = true WHERE id = :id"),
        {"id": str(notification_id)},
    )
    await db.commit()
    return {"message": "Marked as read"}
