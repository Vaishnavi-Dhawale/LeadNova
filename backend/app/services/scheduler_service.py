from apscheduler.schedulers.background import BackgroundScheduler
from app.config import settings
from app.database import SessionLocal
from app.services.email_reader_service import fetch_new_emails

scheduler = BackgroundScheduler()


def scheduled_email_fetch_job():
    db = SessionLocal()
    try:
        fetch_new_emails(db)
    except Exception as e:
        print(f"[Scheduler Job Error] Error during scheduled email fetch: {e}")
    finally:
        db.close()


def start_scheduler():
    if not scheduler.running:
        interval_minutes = max(1, settings.EMAIL_FETCH_INTERVAL_MINUTES)
        scheduler.add_job(
            scheduled_email_fetch_job,
            "interval",
            minutes=interval_minutes,
            id="email_fetcher_job",
            replace_existing=True
        )
        try:
            scheduler.start()
            print(f"[Scheduler] APScheduler started. Polling every {interval_minutes} minutes.")
        except Exception as e:
            print(f"[Scheduler] Could not start APScheduler: {e}")


def shutdown_scheduler():
    if scheduler.running:
        try:
            scheduler.shutdown(wait=False)
            print("[Scheduler] APScheduler stopped.")
        except Exception as e:
            print(f"[Scheduler] Error stopping APScheduler: {e}")
