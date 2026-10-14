from app.schemas.auth import LoginRequest, TokenResponse, UserProfileResponse
from app.schemas.user import UserCreate, UserUpdate, UserResponse
from app.schemas.territory import TerritoryCreate, TerritoryUpdate, TerritoryResponse
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse
from app.schemas.customer import CustomerCreate, CustomerUpdate, CustomerResponse, CustomerDetailResponse
from app.schemas.enquiry import EnquiryCreate, EnquiryUpdate, EnquiryStatusUpdate, EnquiryResponse, EnquiryDetailResponse
from app.schemas.follow_up import FollowUpCreate, FollowUpUpdate, FollowUpResponse
from app.schemas.email_lead import EmailLeadCreate, EmailLeadUpdate, EmailLeadConvert, EmailLeadResponse
from app.schemas.email import EmailTemplateCreate, EmailTemplateUpdate, EmailTemplateResponse, SendEmailRequest, EmailHistoryResponse
from app.schemas.campaign import CampaignCreate, CampaignUpdate, CampaignResponse
from app.schemas.document import DocumentResponse
from app.schemas.activity_log import ActivityLogResponse
from app.schemas.analytics import DashboardStatsResponse, AnalyticsFilter, AnalyticsMetricsResponse

__all__ = [
    "LoginRequest", "TokenResponse", "UserProfileResponse",
    "UserCreate", "UserUpdate", "UserResponse",
    "TerritoryCreate", "TerritoryUpdate", "TerritoryResponse",
    "CategoryCreate", "CategoryUpdate", "CategoryResponse",
    "CustomerCreate", "CustomerUpdate", "CustomerResponse", "CustomerDetailResponse",
    "EnquiryCreate", "EnquiryUpdate", "EnquiryStatusUpdate", "EnquiryResponse", "EnquiryDetailResponse",
    "FollowUpCreate", "FollowUpUpdate", "FollowUpResponse",
    "EmailLeadCreate", "EmailLeadUpdate", "EmailLeadConvert", "EmailLeadResponse",
    "EmailTemplateCreate", "EmailTemplateUpdate", "EmailTemplateResponse", "SendEmailRequest", "EmailHistoryResponse",
    "CampaignCreate", "CampaignUpdate", "CampaignResponse",
    "DocumentResponse",
    "ActivityLogResponse",
    "DashboardStatsResponse", "AnalyticsFilter", "AnalyticsMetricsResponse",
]
