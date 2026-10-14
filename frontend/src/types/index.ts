export const UserRole = {
  ADMIN: 'ADMIN' as const,
  SALES_USER: 'SALES_USER' as const,
  MANAGER: 'MANAGER' as const,
  SALES_REP: 'SALES_USER' as const,
};

export type UserRole = 'ADMIN' | 'SALES_USER' | 'MANAGER';

export interface User {
  id: number;
  name: string;
  full_name?: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Territory {
  id: number;
  name: string;
  description?: string;
  state_region: string;
  assigned_sales_user?: number;
  assigned_user_name?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: number;
  customer_name: string;
  company_name: string;
  email: string;
  phone: string;
  alternate_phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  industry?: string;
  source?: string;
  notes?: string;
  territory_id?: number;
  created_by?: number;
  creator_name?: string;
  territory_name?: string;
  enquiries_count?: number;
  created_at: string;
  updated_at: string;
}

export interface CustomerDetail extends Customer {
  enquiries: Array<{
    id: number;
    title: string;
    category_name?: string;
    status: string;
    priority: string;
    estimated_value: number;
    assigned_to_name?: string;
    created_at: string;
  }>;
  follow_ups: Array<{
    id: number;
    follow_up_date: string;
    follow_up_type: string;
    notes?: string;
    status: string;
    assigned_to_name?: string;
    enquiry_id?: number;
  }>;
  documents: Array<{
    id: number;
    filename: string;
    original_filename: string;
    file_size: number;
    content_type: string;
    uploaded_by_name?: string;
    created_at: string;
  }>;
  email_history: Array<{
    id: number;
    recipient: string;
    subject: string;
    body: string;
    status: string;
    sent_at: string;
  }>;
  activity: Array<{
    id: number;
    action: string;
    description: string;
    user_name: string;
    timestamp: string;
  }>;
}

export type EnquiryStatus = 'NEW' | 'IN_PROGRESS' | 'FOLLOW_UP' | 'CONVERTED' | 'LOST' | 'CLOSED';
export type EnquiryPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type EnquirySource = 'EMAIL' | 'WEBSITE' | 'PHONE' | 'REFERRAL' | 'CAMPAIGN' | 'WALK_IN' | 'OTHER';

export interface Enquiry {
  id: number;
  customer_id: number;
  title: string;
  description?: string;
  category_id: number;
  territory_id?: number;
  assigned_to?: number;
  source: EnquirySource | string;
  priority: EnquiryPriority | string;
  status: EnquiryStatus | string;
  product_interested?: string;
  estimated_value: number;
  customer_name?: string;
  company_name?: string;
  category_name?: string;
  territory_name?: string;
  assigned_to_name?: string;
  next_follow_up_date?: string;
  created_at: string;
  updated_at: string;
}

export interface EnquiryDetail extends Enquiry {
  customer_email?: string;
  customer_phone?: string;
  follow_ups: Array<{
    id: number;
    follow_up_date: string;
    follow_up_type: string;
    notes?: string;
    status: string;
    assigned_to_name?: string;
  }>;
  documents: Array<{
    id: number;
    filename: string;
    original_filename: string;
    file_size: number;
    content_type: string;
    uploaded_by_name?: string;
    created_at: string;
  }>;
  email_history: Array<{
    id: number;
    recipient: string;
    subject: string;
    body: string;
    status: string;
    sent_at: string;
  }>;
}

export type FollowUpType = 'CALL' | 'EMAIL' | 'MEETING' | 'VISIT' | 'OTHER';
export type FollowUpStatus = 'PENDING' | 'COMPLETED' | 'MISSED' | 'CANCELLED';

export interface FollowUp {
  id: number;
  customer_id: number;
  enquiry_id?: number;
  assigned_to?: number;
  follow_up_date: string;
  follow_up_type: FollowUpType | string;
  notes?: string;
  status: FollowUpStatus | string;
  customer_name?: string;
  company_name?: string;
  enquiry_title?: string;
  assigned_to_name?: string;
  is_overdue?: boolean;
  created_at: string;
  updated_at: string;
}

export type EmailLeadStatus = 'NEW' | 'REVIEWED' | 'QUALIFIED' | 'CONVERTED' | 'REJECTED';

export interface EmailLead {
  id: number;
  sender_name: string;
  sender_email: string;
  recipient?: string;
  subject: string;
  body: string;
  body_html?: string;
  attachments_info?: string;
  company?: string;
  status: EmailLeadStatus | string;
  category_id?: number;
  category_name?: string;
  assigned_to?: number;
  customer_id?: number;
  enquiry_id?: number;
  received_at: string;
  customer_name?: string;
  assigned_to_name?: string;
  created_at: string;
}

export interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  body: string;
  category?: string;
  created_at: string;
  updated_at: string;
}

export interface EmailHistory {
  id: number;
  sender: string;
  recipient: string;
  subject: string;
  body: string;
  customer_id?: number;
  customer_name?: string;
  enquiry_id?: number;
  enquiry_title?: string;
  status: string;
  sent_at: string;
}

export type CampaignStatus = 'DRAFT' | 'SCHEDULED' | 'SENT' | 'CANCELLED' | 'PLANNED' | 'ACTIVE' | 'COMPLETED';

export interface Campaign {
  id: number;
  name: string;
  description?: string;
  status: CampaignStatus | string;
  target_segment?: string;
  email_subject?: string;
  email_body?: string;
  sent_at?: string;
  sent_by?: number;
  sent_by_name?: string;
  scheduled_at?: string;
  recipient_count?: number;
  start_date?: string;
  end_date?: string;
  created_by?: number;
  creator_name?: string;
  created_at: string;
  updated_at: string;
}

export interface CampaignPreviewRecipients {
  target_segment: string;
  count: number;
  recipients: Array<{
    customer_id: number;
    customer_name: string;
    company_name?: string;
    email: string;
  }>;
}

export interface DocumentItem {
  id: number;
  filename: string;
  original_filename: string;
  file_path: string;
  file_size: number;
  content_type: string;
  customer_id?: number;
  customer_name?: string;
  enquiry_id?: number;
  enquiry_title?: string;
  uploaded_by?: number;
  uploader_name?: string;
  created_at: string;
}

export interface ActivityLogItem {
  id: number;
  user_id?: number;
  user_name?: string;
  action: string;
  description: string;
  entity_type: string;
  entity_id?: number;
  ip_address?: string;
  timestamp?: string;
  created_at?: string;
  user?: {
    id: number;
    name?: string;
    full_name?: string;
    email?: string;
  };
}

export type ActivityLog = ActivityLogItem;

export interface DashboardStats {
  total_enquiries: number;
  new_leads: number;
  in_progress: number;
  converted: number;
  lost: number;
  pending_follow_ups: number;
  overdue_follow_ups: number;
  active_customers: number;
  email_leads: number;
  active_sales_users: number;
  new_email_leads?: number;
  high_priority_enquiries?: number;

  enquiry_status_distribution: Array<{ status: string; count: number }>;
  category_distribution: Array<{ category: string; count: number }>;
  monthly_enquiry_trend: Array<{ month: string; enquiries: number; value: number }>;
  lead_sources: Array<{ source: string; count: number }>;
  sales_user_performance: Array<{
    user_id: number;
    name: string;
    enquiries: number;
    converted: number;
    revenue: number;
  }>;
  territory_performance: Array<{
    territory_id: number;
    name: string;
    enquiries: number;
    total_value: number;
  }>;
}

export interface AnalyticsMetrics {
  total_enquiries: number;
  converted: number;
  lost: number;
  pending: number;
  conversion_rate: number;
  total_pipeline_value: number;
  converted_pipeline_value: number;

  category_wise: Array<{ name: string; count: number; value: number }>;
  source_wise: Array<{ name: string; count: number; value: number }>;
  territory_wise: Array<{ name: string; count: number; value: number }>;
  sales_user_wise: Array<{ name: string; count: number; value: number }>;
  monthly_trends: Array<{ month: string; count: number; value: number }>;
  status_wise: Array<{ name: string; count: number }>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
