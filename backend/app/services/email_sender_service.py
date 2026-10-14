import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session
from app.config import settings
from app.models.email import EmailHistory


def send_email_message(
    db: Session,
    recipient: str,
    subject: str,
    body: str,
    sender: Optional[str] = None,
    customer_id: Optional[int] = None,
    enquiry_id: Optional[int] = None
) -> EmailHistory:
    from_address = sender or settings.SMTP_FROM or settings.SENDER_EMAIL or "notifications@leadnova.com"
    email_status = "SENT"

    # 1. Try Resend if API key is provided
    if settings.RESEND_API_KEY:
        try:
            import httpx
            response = httpx.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "from": from_address,
                    "to": [recipient],
                    "subject": subject,
                    "text": body
                },
                timeout=10.0
            )
            if response.status_code not in (200, 201):
                email_status = f"FAILED: Resend HTTP {response.status_code}"
        except Exception as e:
            print(f"[EmailSender Resend Error]: {e}")
            email_status = f"FAILED: {str(e)}"
    
    # 2. Try SMTP if host is provided
    elif settings.SMTP_HOST and settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
        try:
            msg = MIMEMultipart()
            msg["From"] = from_address
            msg["To"] = recipient
            msg["Subject"] = subject
            msg.attach(MIMEText(body, "plain"))

            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
                server.starttls()
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                server.sendmail(from_address, [recipient], msg.as_string())
            email_status = "SENT"
        except Exception as e:
            print(f"[EmailSender SMTP Error]: {e}")
            email_status = f"FAILED: {str(e)}"
    
    # 3. Development / Demo mode: simulated send
    else:
        print(f"[EmailSender Demo]: Simulated email sent to {recipient} with subject '{subject}'")
        email_status = "SENT (DEMO)"

    # Record to EmailHistory table
    history = EmailHistory(
        sender=from_address,
        recipient=recipient,
        subject=subject,
        body=body,
        customer_id=customer_id,
        enquiry_id=enquiry_id,
        status=email_status,
        sent_at=datetime.utcnow()
    )
    db.add(history)
    db.commit()
    db.refresh(history)
    return history
