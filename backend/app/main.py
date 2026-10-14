import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import Base, engine, SessionLocal
from app.services.scheduler_service import start_scheduler, shutdown_scheduler
from app.seed import seed_database
from app.models.user import User

# Routers
from app.routers import (
    auth_router,
    users_router,
    customers_router,
    territories_router,
    enquiries_router,
    categories_router,
    follow_ups_router,
    email_leads_router,
    emails_router,
    campaigns_router,
    documents_router,
    activity_logs_router,
    analytics_router,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure upload dir exists
    os.makedirs(os.path.abspath(settings.UPLOAD_DIR), exist_ok=True)

    # Startup: Initialize tables
    print("[LeadNova] Initializing database tables...")
    Base.metadata.create_all(bind=engine)

    # Startup: Check and auto-seed if first run
    db = SessionLocal()
    try:
        admin_count = db.query(User).count()
        if admin_count == 0:
            print("[LeadNova] Fresh database detected. Seeding demo CRM data...")
            seed_database(db)
        else:
            print(f"[LeadNova] Database already contains {admin_count} users. Ready.")
    except Exception as e:
        print(f"[LeadNova Startup Warning] Seeding check: {e}")
    finally:
        db.close()

    # Startup: Start background scheduler for IMAP email polling
    start_scheduler()

    yield

    # Shutdown: Stop scheduler
    shutdown_scheduler()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Intelligent Customer Enquiry Tracking and Advanced Sales Analytics Platform REST API",
    lifespan=lifespan,
    docs_url="/docs",
    openapi_url="/openapi.json"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploads directory for static access if needed
upload_path = os.path.abspath(settings.UPLOAD_DIR)
os.makedirs(upload_path, exist_ok=True)
app.mount("/static/uploads", StaticFiles(directory=upload_path), name="uploads")

# Register API Routers under both /api and /api/v1 for maximum compatibility
for pfx in ["/api", "/api/v1"]:
    app.include_router(auth_router, prefix=pfx)
    app.include_router(users_router, prefix=pfx)
    app.include_router(customers_router, prefix=pfx)
    app.include_router(territories_router, prefix=pfx)
    app.include_router(enquiries_router, prefix=pfx)
    app.include_router(categories_router, prefix=pfx)
    app.include_router(follow_ups_router, prefix=pfx)
    app.include_router(email_leads_router, prefix=pfx)
    app.include_router(emails_router, prefix=pfx)
    app.include_router(campaigns_router, prefix=pfx)
    app.include_router(documents_router, prefix=pfx)
    app.include_router(activity_logs_router, prefix=pfx)
    app.include_router(analytics_router, prefix=pfx)


@app.get("/")
def root():
    return {
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "docs": "/docs"
    }


@app.get("/health")
@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "LeadNova Backend API",
        "version": settings.VERSION
    }
