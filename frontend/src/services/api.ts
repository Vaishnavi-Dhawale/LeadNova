import axios from 'axios';
import {
  User, Customer, CustomerDetail, Territory, Category,
  Enquiry, EnquiryDetail, FollowUp, EmailLead, EmailTemplate,
  EmailHistory, Campaign, CampaignPreviewRecipients, DocumentItem, ActivityLogItem,
  DashboardStats, AnalyticsMetrics, PaginatedResponse
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle session expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// --- AUTH API ---
export const authApi = {
  login: async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
  },
  getMe: async (): Promise<User> => {
    const res = await api.get('/auth/me');
    return res.data;
  },
  logout: async () => {
    const res = await api.post('/auth/logout');
    return res.data;
  },
};

// --- USERS API ---
export const usersApi = {
  list: async (params?: any): Promise<PaginatedResponse<User>> => {
    const res = await api.get('/users', { params });
    return res.data;
  },
  getAll: async (params?: any): Promise<PaginatedResponse<User>> => {
    const res = await api.get('/users', { params });
    return res.data;
  },
  create: async (data: any): Promise<User> => {
    const res = await api.post('/users', data);
    return res.data;
  },
  get: async (id: number): Promise<User> => {
    const res = await api.get(`/users/${id}`);
    return res.data;
  },
  update: async (id: number, data: any): Promise<User> => {
    const res = await api.put(`/users/${id}`, data);
    return res.data;
  },
  delete: async (id: number) => {
    const res = await api.delete(`/users/${id}`);
    return res.data;
  },
};

// --- CUSTOMERS API ---
export const customersApi = {
  list: async (params?: any): Promise<PaginatedResponse<Customer>> => {
    const res = await api.get('/customers', { params });
    return res.data;
  },
  all: async (): Promise<Customer[]> => {
    const res = await api.get('/customers/all');
    return res.data;
  },
  get: async (id: number): Promise<CustomerDetail> => {
    const res = await api.get(`/customers/${id}`);
    return res.data;
  },
  create: async (data: any): Promise<Customer> => {
    const res = await api.post('/customers', data);
    return res.data;
  },
  update: async (id: number, data: any): Promise<Customer> => {
    const res = await api.put(`/customers/${id}`, data);
    return res.data;
  },
  delete: async (id: number) => {
    const res = await api.delete(`/customers/${id}`);
    return res.data;
  },
};

// --- ENQUIRIES API ---
export const enquiriesApi = {
  list: async (params?: any): Promise<PaginatedResponse<Enquiry>> => {
    const res = await api.get('/enquiries', { params });
    return res.data;
  },
  get: async (id: number): Promise<EnquiryDetail> => {
    const res = await api.get(`/enquiries/${id}`);
    return res.data;
  },
  create: async (data: any): Promise<Enquiry> => {
    const res = await api.post('/enquiries', data);
    return res.data;
  },
  update: async (id: number, data: any): Promise<Enquiry> => {
    const res = await api.put(`/enquiries/${id}`, data);
    return res.data;
  },
  updateStatus: async (id: number, status: string, notes?: string): Promise<Enquiry> => {
    const res = await api.patch(`/enquiries/${id}/status`, { status, notes });
    return res.data;
  },
  delete: async (id: number) => {
    const res = await api.delete(`/enquiries/${id}`);
    return res.data;
  },
};

// --- TERRITORIES API ---
export const territoriesApi = {
  list: async (params?: any): Promise<PaginatedResponse<Territory>> => {
    const res = await api.get('/territories', { params });
    return res.data;
  },
  all: async (): Promise<Territory[]> => {
    const res = await api.get('/territories/all');
    return res.data;
  },
  create: async (data: any): Promise<Territory> => {
    const res = await api.post('/territories', data);
    return res.data;
  },
  update: async (id: number, data: any): Promise<Territory> => {
    const res = await api.put(`/territories/${id}`, data);
    return res.data;
  },
  delete: async (id: number) => {
    const res = await api.delete(`/territories/${id}`);
    return res.data;
  },
};

// --- CATEGORIES API ---
export const categoriesApi = {
  list: async (params?: any): Promise<PaginatedResponse<Category>> => {
    const res = await api.get('/categories', { params });
    return res.data;
  },
  all: async (): Promise<Category[]> => {
    const res = await api.get('/categories/all');
    return res.data;
  },
  create: async (data: any): Promise<Category> => {
    const res = await api.post('/categories', data);
    return res.data;
  },
  update: async (id: number, data: any): Promise<Category> => {
    const res = await api.put(`/categories/${id}`, data);
    return res.data;
  },
  delete: async (id: number) => {
    const res = await api.delete(`/categories/${id}`);
    return res.data;
  },
};

// --- FOLLOW-UPS API ---
export const followUpsApi = {
  list: async (params?: any): Promise<PaginatedResponse<FollowUp>> => {
    const res = await api.get('/follow-ups', { params });
    return res.data;
  },
  create: async (data: any): Promise<FollowUp> => {
    const res = await api.post('/follow-ups', data);
    return res.data;
  },
  update: async (id: number, data: any): Promise<FollowUp> => {
    const res = await api.put(`/follow-ups/${id}`, data);
    return res.data;
  },
  complete: async (id: number): Promise<FollowUp> => {
    const res = await api.patch(`/follow-ups/${id}/complete`);
    return res.data;
  },
  cancel: async (id: number): Promise<FollowUp> => {
    const res = await api.patch(`/follow-ups/${id}/cancel`);
    return res.data;
  },
  delete: async (id: number) => {
    const res = await api.delete(`/follow-ups/${id}`);
    return res.data;
  },
};

// --- EMAIL LEADS API ---
export const emailLeadsApi = {
  list: async (params?: any): Promise<PaginatedResponse<EmailLead>> => {
    const res = await api.get('/email-leads', { params });
    return res.data;
  },
  get: async (id: number): Promise<EmailLead> => {
    const res = await api.get(`/email-leads/${id}`);
    return res.data;
  },
  create: async (data: any): Promise<EmailLead> => {
    const res = await api.post('/email-leads', data);
    return res.data;
  },
  update: async (id: number, data: any): Promise<EmailLead> => {
    const res = await api.put(`/email-leads/${id}`, data);
    return res.data;
  },
  convert: async (id: number, data: any): Promise<EmailLead> => {
    const res = await api.post(`/email-leads/${id}/convert`, data);
    return res.data;
  },
  delete: async (id: number) => {
    const res = await api.delete(`/email-leads/${id}`);
    return res.data;
  },
  fetchNow: async () => {
    const res = await api.post('/email-leads/fetch-now');
    return res.data;
  },
  getStatus: async () => {
    const res = await api.get('/email-leads/status/integration');
    return res.data;
  },
};

// --- EMAILS API ---
export const emailsApi = {
  getTemplates: async (category?: string): Promise<EmailTemplate[]> => {
    const res = await api.get('/emails/templates', { params: { category } });
    return res.data;
  },
  createTemplate: async (data: any): Promise<EmailTemplate> => {
    const res = await api.post('/emails/templates', data);
    return res.data;
  },
  updateTemplate: async (id: number, data: any): Promise<EmailTemplate> => {
    const res = await api.put(`/emails/templates/${id}`, data);
    return res.data;
  },
  deleteTemplate: async (id: number) => {
    const res = await api.delete(`/emails/templates/${id}`);
    return res.data;
  },
  sendEmail: async (data: any): Promise<EmailHistory> => {
    const res = await api.post('/emails/send', data);
    return res.data;
  },
  getHistory: async (params?: any): Promise<PaginatedResponse<EmailHistory>> => {
    const res = await api.get('/emails/history', { params });
    return res.data;
  },
};

// --- CAMPAIGNS API ---
export const campaignsApi = {
  list: async (params?: any): Promise<PaginatedResponse<Campaign>> => {
    const res = await api.get('/campaigns', { params });
    return res.data;
  },
  get: async (id: number): Promise<Campaign> => {
    const res = await api.get(`/campaigns/${id}`);
    return res.data;
  },
  previewRecipients: async (targetSegment?: string): Promise<CampaignPreviewRecipients> => {
    const res = await api.get('/campaigns/preview-recipients', { params: { target_segment: targetSegment } });
    return res.data;
  },
  create: async (data: any): Promise<Campaign> => {
    const res = await api.post('/campaigns', data);
    return res.data;
  },
  update: async (id: number, data: any): Promise<Campaign> => {
    const res = await api.put(`/campaigns/${id}`, data);
    return res.data;
  },
  send: async (id: number): Promise<{ message: string; success_count: number; failed_count: number; recipient_count: number; campaign: Campaign }> => {
    const res = await api.post(`/campaigns/${id}/send`);
    return res.data;
  },
  cancel: async (id: number): Promise<Campaign> => {
    const res = await api.post(`/campaigns/${id}/cancel`);
    return res.data;
  },
  delete: async (id: number) => {
    const res = await api.delete(`/campaigns/${id}`);
    return res.data;
  },
};

// --- DOCUMENTS API ---
export const documentsApi = {
  list: async (params?: { customer_id?: number; enquiry_id?: number }): Promise<DocumentItem[]> => {
    const res = await api.get('/documents', { params });
    return res.data;
  },
  upload: async (formData: FormData): Promise<DocumentItem> => {
    const res = await api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  delete: async (id: number) => {
    const res = await api.delete(`/documents/${id}`);
    return res.data;
  },
  downloadUrl: (id: number) => `${API_BASE_URL}/documents/${id}/download`,
};

// --- ACTIVITY LOGS API ---
export const activityLogsApi = {
  list: async (params?: any): Promise<PaginatedResponse<ActivityLogItem>> => {
    const res = await api.get('/activity-logs', { params });
    return res.data;
  },
  getAll: async (params?: any): Promise<PaginatedResponse<ActivityLogItem>> => {
    const res = await api.get('/activity-logs', { params });
    return res.data;
  },
};

// --- ANALYTICS API ---
export const analyticsApi = {
  getDashboard: async (): Promise<DashboardStats> => {
    const res = await api.get('/analytics/dashboard');
    return res.data;
  },
  getReport: async (params?: any): Promise<AnalyticsMetrics> => {
    const res = await api.get('/analytics/report', { params });
    return res.data;
  },
};

export default api;
