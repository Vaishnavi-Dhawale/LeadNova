from app.routers.auth import router as auth_router
from app.routers.users import router as users_router
from app.routers.customers import router as customers_router
from app.routers.territories import router as territories_router
from app.routers.enquiries import router as enquiries_router
from app.routers.categories import router as categories_router
from app.routers.follow_ups import router as follow_ups_router
from app.routers.email_leads import router as email_leads_router
from app.routers.emails import router as emails_router
from app.routers.campaigns import router as campaigns_router
from app.routers.documents import router as documents_router
from app.routers.activity_logs import router as activity_logs_router
from app.routers.analytics import router as analytics_router

__all__ = [
    "auth_router",
    "users_router",
    "customers_router",
    "territories_router",
    "enquiries_router",
    "categories_router",
    "follow_ups_router",
    "email_leads_router",
    "emails_router",
    "campaigns_router",
    "documents_router",
    "activity_logs_router",
    "analytics_router",
]
