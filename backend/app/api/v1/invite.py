"""
Invite Client endpoint — sends a professional invitation email to a prospective
client with instructions to download the app and create their account.
"""
from __future__ import annotations

import logging
import uuid as uuidlib
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_admin
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()

PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.aurocode.tax_ease"
APP_URL = "https://tax.diamondaccounts.ca"
PRIMARY = "#1a3c5e"
ACCENT = "#2563eb"


class InviteClientRequest(BaseModel):
    email: EmailStr
    client_name: Optional[str] = None
    personal_message: Optional[str] = None


class InviteClientResponse(BaseModel):
    success: bool
    email: str
    message: str


def _build_invite_email(*, client_name: str, personal_message: str = "") -> tuple[str, str, str]:
    """Build subject, html, plain for an invitation email."""

    greeting = client_name if client_name else "there"

    subject = "You're Invited to File Your Taxes with Diamond Accounts"

    personal_section = ""
    personal_plain = ""
    if personal_message:
        personal_section = f"""
        <div style="background:#f0f9ff;border-left:4px solid {ACCENT};padding:14px 18px;margin:16px 0;border-radius:0 6px 6px 0">
          <p style="margin:0;font-style:italic;color:#334155">{personal_message}</p>
        </div>"""
        personal_plain = f"\nMessage from your advisor: {personal_message}\n"

    plain = f"""Hi {greeting},

You've been invited to file your personal taxes with Diamond Accounts — a trusted Canadian tax filing service.
{personal_plain}
Getting started is easy:

Step 1: Download the Tax Ease app from Google Play Store
        {PLAY_STORE_URL}

Step 2: Open the app and tap "Create Account"

Step 3: Enter your email address ({client_name or 'your email'}), create a password, and fill in your name

Step 4: You'll receive a verification code via email — enter it to activate your account

Step 5: Once logged in, tap "Start Personal Tax Filing" and follow the guided questionnaire

That's it! Your tax advisor will review your submission and handle the rest.

If you have any questions, just reply to this email.

— Diamond Accounts Tax Team
"""

    html = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:640px;margin:0 auto;padding:0;background:#f8fafc">
  <!-- Header -->
  <div style="background:{PRIMARY};padding:28px 36px;color:white;border-radius:8px 8px 0 0">
    <h1 style="margin:0;font-size:22px;font-weight:700">Diamond Accounts</h1>
    <p style="margin:6px 0 0;color:#93c5fd;font-size:13px;letter-spacing:0.3px">Professional Tax Filing Services</p>
  </div>

  <!-- Body -->
  <div style="padding:36px;background:white;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px">
    <h2 style="margin:0 0 16px;color:#1e293b;font-size:20px">You're Invited!</h2>

    <p style="color:#475569;line-height:1.6;margin:0 0 16px">
      Hi <strong>{greeting}</strong>,
    </p>
    <p style="color:#475569;line-height:1.6;margin:0 0 16px">
      You've been invited to file your personal taxes with <strong>Diamond Accounts</strong> — a trusted Canadian tax filing service. Our app makes it simple to complete your tax return from your phone.
    </p>
    {personal_section}

    <!-- Steps -->
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:24px;margin:24px 0">
      <h3 style="margin:0 0 16px;color:#1e293b;font-size:16px">How to Get Started</h3>

      <div style="display:flex;align-items:flex-start;margin-bottom:14px">
        <div style="min-width:28px;height:28px;background:{ACCENT};color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;margin-right:12px">1</div>
        <div>
          <p style="margin:0;color:#1e293b;font-weight:600;font-size:14px">Download the App</p>
          <p style="margin:4px 0 0;color:#64748b;font-size:13px">Get "Tax Ease" from the Google Play Store</p>
        </div>
      </div>

      <div style="display:flex;align-items:flex-start;margin-bottom:14px">
        <div style="min-width:28px;height:28px;background:{ACCENT};color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;margin-right:12px">2</div>
        <div>
          <p style="margin:0;color:#1e293b;font-weight:600;font-size:14px">Create Your Account</p>
          <p style="margin:4px 0 0;color:#64748b;font-size:13px">Tap "Create Account", enter your email, set a password, and fill in your name</p>
        </div>
      </div>

      <div style="display:flex;align-items:flex-start;margin-bottom:14px">
        <div style="min-width:28px;height:28px;background:{ACCENT};color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;margin-right:12px">3</div>
        <div>
          <p style="margin:0;color:#1e293b;font-weight:600;font-size:14px">Verify Your Email</p>
          <p style="margin:4px 0 0;color:#64748b;font-size:13px">Enter the 6-digit code sent to your email to activate your account</p>
        </div>
      </div>

      <div style="display:flex;align-items:flex-start;margin-bottom:14px">
        <div style="min-width:28px;height:28px;background:{ACCENT};color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;margin-right:12px">4</div>
        <div>
          <p style="margin:0;color:#1e293b;font-weight:600;font-size:14px">Start Your Tax Filing</p>
          <p style="margin:4px 0 0;color:#64748b;font-size:13px">Tap "Start Personal Tax Filing" and answer the guided questionnaire — it takes about 15-20 minutes</p>
        </div>
      </div>

      <div style="display:flex;align-items:flex-start">
        <div style="min-width:28px;height:28px;background:{ACCENT};color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;margin-right:12px">5</div>
        <div>
          <p style="margin:0;color:#1e293b;font-weight:600;font-size:14px">Upload Documents & Submit</p>
          <p style="margin:4px 0 0;color:#64748b;font-size:13px">Upload any requested tax slips (T4, T5, etc.) and submit — your advisor handles the rest!</p>
        </div>
      </div>
    </div>

    <!-- CTA Button -->
    <div style="text-align:center;margin:28px 0">
      <a href="{PLAY_STORE_URL}" style="display:inline-block;background:{ACCENT};color:white;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;box-shadow:0 2px 8px rgba(37,99,235,0.3)">
        Download Tax Ease App
      </a>
    </div>

    <p style="color:#64748b;font-size:13px;text-align:center;margin:16px 0 0">
      Or visit: <a href="{PLAY_STORE_URL}" style="color:{ACCENT}">{PLAY_STORE_URL}</a>
    </p>

    <!-- Footer note -->
    <div style="margin-top:32px;padding-top:20px;border-top:1px solid #e2e8f0">
      <p style="color:#94a3b8;font-size:12px;margin:0;line-height:1.5">
        If you have any questions, simply reply to this email. Your tax advisor is here to help.
      </p>
      <p style="color:#94a3b8;font-size:12px;margin:8px 0 0">
        — Diamond Accounts Tax Team
      </p>
    </div>
  </div>
</body>
</html>"""

    return subject, html, plain


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
        logger.info(f"invite.email.sent to={to_email} ses_id={resp.get('MessageId')}")
        return {"sent": True, "ses_message_id": resp.get("MessageId")}
    except Exception as exc:
        logger.error(f"invite.email.failed to={to_email} error={exc}")
        return {"sent": False, "error": str(exc)}


@router.post("", status_code=status.HTTP_200_OK)
async def invite_client(
    req: InviteClientRequest,
    db: AsyncSession = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    """Send an invitation email to a prospective client."""

    client_name = req.client_name or ""

    subject, html, plain = _build_invite_email(
        client_name=client_name,
        personal_message=req.personal_message or "",
    )

    result = _send_ses_email(
        to_email=req.email,
        subject=subject,
        html_body=html,
        plain_body=plain,
    )

    if result.get("sent"):
        # Log the invitation in the audit trail
        try:
            await db.execute(
                text("""
                    INSERT INTO audit_logs (id, admin_id, action, details, created_at)
                    VALUES (:id, :admin_id, 'invite_client', :details, NOW())
                """),
                {
                    "id": str(uuidlib.uuid4()),
                    "admin_id": str(current_admin.id),
                    "details": f"Invited {req.email} ({client_name or 'no name'})",
                },
            )
            await db.commit()
        except Exception:
            pass

        return InviteClientResponse(
            success=True,
            email=req.email,
            message="Invitation email sent successfully!",
        )
    else:
        error_reason = result.get("error", result.get("reason", "Unknown error"))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send invitation email: {error_reason}",
        )
