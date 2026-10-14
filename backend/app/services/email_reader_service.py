import imaplib
import email
from email.header import decode_header
from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from app.config import settings
from app.models.email_lead import EmailLead, EmailLeadStatus


def get_imap_status() -> Dict[str, Any]:
    configured = bool(settings.IMAP_EMAIL and settings.IMAP_PASSWORD and settings.IMAP_SERVER)
    return {
        "status": "Configured" if configured else "Not Configured",
        "server": settings.IMAP_SERVER,
        "email": settings.IMAP_EMAIL if configured else None,
        "port": settings.IMAP_PORT,
        "fetch_interval_minutes": settings.EMAIL_FETCH_INTERVAL_MINUTES
    }


def clean_header_text(header_val: Any) -> str:
    if not header_val:
        return ""
    decoded_fragments = decode_header(header_val)
    text = ""
    for frag, enc in decoded_fragments:
        if isinstance(frag, bytes):
            try:
                text += frag.decode(enc or "utf-8", errors="replace")
            except Exception:
                text += frag.decode("latin1", errors="replace")
        else:
            text += str(frag)
    return text.strip()


def parse_sender(from_header: str):
    import re
    # Match "John Doe <john@example.com>" or just "john@example.com"
    match = re.search(r"^(.*?)\s*<([^>]+)>$", from_header)
    if match:
        name = match.group(1).strip().strip('"').strip("'")
        addr = match.group(2).strip()
        return name or addr, addr
    return from_header, from_header


def fetch_new_emails(db: Session) -> List[EmailLead]:
    if not settings.IMAP_EMAIL or not settings.IMAP_PASSWORD or not settings.IMAP_SERVER:
        print("[EmailReader] Email integration status: Not Configured. Skipping IMAP polling.")
        return []

    leads_created: List[EmailLead] = []
    try:
        mail = imaplib.IMAP4_SSL(settings.IMAP_SERVER, settings.IMAP_PORT, timeout=15)
        mail.login(settings.IMAP_EMAIL, settings.IMAP_PASSWORD)
        mail.select("INBOX")

        status, messages = mail.search(None, "UNSEEN")
        if status != "OK" or not messages[0]:
            mail.logout()
            return []

        msg_ids = messages[0].split()
        for msg_id in msg_ids[-20:]:  # Process latest 20 unseen messages
            res, data = mail.fetch(msg_id, "(RFC822)")
            if res != "OK":
                continue

            raw_email = data[0][1]
            msg = email.message_from_bytes(raw_email)

            subject = clean_header_text(msg.get("Subject", "No Subject"))
            from_header = clean_header_text(msg.get("From", ""))
            sender_name, sender_email = parse_sender(from_header)

            # Duplicate protection: check if lead with same sender and subject created in last 24h
            existing = db.query(EmailLead).filter(
                EmailLead.sender_email == sender_email,
                EmailLead.subject == subject
            ).first()

            if existing:
                continue

            to_header = clean_header_text(msg.get("To", ""))
            recipient = to_header if to_header else None

            # Extract body (both plain text and html faithfully preserved)
            body_text = ""
            body_html = ""
            attachments_list = []

            if msg.is_multipart():
                for part in msg.walk():
                    content_type = part.get_content_type()
                    content_disposition = str(part.get("Content-Disposition") or "")
                    filename = part.get_filename()
                    if filename:
                        clean_fn = clean_header_text(filename)
                        if clean_fn:
                            attachments_list.append(clean_fn)
                    elif "attachment" not in content_disposition.lower():
                        payload = part.get_payload(decode=True)
                        if payload:
                            charset = part.get_content_charset() or "utf-8"
                            try:
                                decoded = payload.decode(charset, errors="replace")
                            except Exception:
                                decoded = payload.decode("latin1", errors="replace")
                            if content_type == "text/plain" and not body_text:
                                body_text = decoded
                            elif content_type == "text/html" and not body_html:
                                body_html = decoded
            else:
                payload = msg.get_payload(decode=True)
                if payload:
                    charset = msg.get_content_charset() or "utf-8"
                    try:
                        decoded = payload.decode(charset, errors="replace")
                    except Exception:
                        decoded = payload.decode("latin1", errors="replace")
                    if msg.get_content_type() == "text/html":
                        body_html = decoded
                    else:
                        body_text = decoded

            final_body = body_text if body_text else (body_html if body_html else "No email body content available.")
            import json
            attachments_json = json.dumps(attachments_list) if attachments_list else None

            # Infer company from email domain
            company = None
            if "@" in sender_email:
                domain_part = sender_email.split("@")[1].split(".")[0].capitalize()
                if domain_part.lower() not in ["gmail", "yahoo", "outlook", "hotmail", "icloud"]:
                    company = domain_part

            # Extract actual email Date header with strict timezone offset support
            from email.utils import parsedate_to_datetime
            from datetime import timezone

            date_header = msg.get("Date")
            email_dt = None
            if date_header:
                try:
                    parsed_dt = parsedate_to_datetime(date_header)
                    if parsed_dt.tzinfo is not None:
                        # Convert to UTC and strip tzinfo for PostgreSQL DateTime storage
                        email_dt = parsed_dt.astimezone(timezone.utc).replace(tzinfo=None)
                    else:
                        email_dt = parsed_dt
                except Exception as e:
                    print(f"[EmailReader] Could not parse email Date header '{date_header}': {e}")

            actual_received_at = email_dt if email_dt else datetime.utcnow()

            new_lead = EmailLead(
                sender_name=sender_name or sender_email,
                sender_email=sender_email,
                recipient=recipient,
                subject=subject,
                body=final_body,
                body_html=body_html or None,
                attachments_info=attachments_json,
                company=company,
                received_at=actual_received_at,
                status=EmailLeadStatus.NEW
            )
            db.add(new_lead)
            db.commit()
            db.refresh(new_lead)
            leads_created.append(new_lead)

        mail.logout()
    except Exception as e:
        print(f"[EmailReader Error] Failed during IMAP processing: {e}")
        db.rollback()

    return leads_created
