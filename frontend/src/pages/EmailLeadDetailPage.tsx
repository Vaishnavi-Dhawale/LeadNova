import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Mail,
  Building,
  UserCheck,
  Calendar,
  Sparkles,
  CheckCircle2,
  Trash2,
  ExternalLink,
  Layers
} from 'lucide-react';
import { emailLeadsApi, categoriesApi, territoriesApi, usersApi } from '../services/api';
import { EmailLead, Category, Territory, User } from '../types';
import { StatusBadge } from '../components/common/Badge';
import { LoadingSpinner } from '../components/common/TableSkeleton';
import { EmptyState } from '../components/common/EmptyState';
import { useToast } from '../components/common/Toast';
import { EmailContentRenderer } from '../components/common/EmailContentRenderer';
import { ConvertLeadModal } from '../components/common/ConvertLeadModal';
import { formatISTDateTime } from '../utils/date';

export const EmailLeadDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [lead, setLead] = useState<EmailLead | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [salesUsers, setSalesUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Convert modal
  const [convertModalOpen, setConvertModalOpen] = useState(false);

  const fetchLead = async () => {
    if (!id) return;
    try {
      const data = await emailLeadsApi.get(parseInt(id));
      setLead(data);
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Failed to load email lead');
    } finally {
      setLoading(false);
    }
  };

  const loadDropdowns = async (): Promise<Category[]> => {
    try {
      const [cats, terrs, users] = await Promise.all([
        categoriesApi.all(),
        territoriesApi.all(),
        usersApi.list({ page_size: 100 }),
      ]);
      setCategories(cats);
      setTerritories(terrs);
      setSalesUsers(users.items);
      return cats;
    } catch (e) {
      console.error('Failed to load dropdowns', e);
      return [];
    }
  };

  useEffect(() => {
    fetchLead();
    loadDropdowns();
  }, [id]);

  const handleStatusChange = async (newStatus: string) => {
    if (!lead) return;
    try {
      await emailLeadsApi.update(lead.id, { status: newStatus });
      success(`Lead marked as ${newStatus}.`);
      fetchLead();
    } catch (err: any) {
      toastError('Failed to update status');
    }
  };

  const handleLeadConverted = () => {
    fetchLead();
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!lead) {
    return (
      <EmptyState
        icon={Mail}
        title="Email Lead Not Found"
        description="This lead does not exist or was removed."
        actionText="Back to Email Leads"
        onAction={() => navigate('/email-leads')}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Top action header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
        <button
          onClick={() => navigate('/email-leads')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 mb-4 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Email Leads</span>
        </button>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-slate-400">LEAD-#{lead.id}</span>
              <StatusBadge status={lead.status} />
              {lead.category_name && (
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  {lead.category_name}
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {lead.subject}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              From: <span className="font-bold text-slate-800">{lead.sender_name}</span> &lt;
              <span className="text-indigo-600">{lead.sender_email}</span>&gt;
              {lead.recipient && (
                <> • To: <span className="text-slate-700 font-medium">{lead.recipient}</span></>
              )}
              {' '}• Received:{' '}
              {formatISTDateTime(lead.received_at)}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {lead.status !== 'CONVERTED' ? (
              <button
                onClick={() => setConvertModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Convert to Opportunity</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Converted Deal</span>
              </span>
            )}

            <select
              value={lead.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="py-2 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:border-indigo-600 transition"
            >
              <option value="NEW">NEW</option>
              <option value="REVIEWED">REVIEWED</option>
              <option value="QUALIFIED">QUALIFIED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Email Content - Faithfully Rendered with HTML sanitization & plain-text link preservation */}
        <div className="lg:col-span-2">
          <EmailContentRenderer lead={lead} />
        </div>

        {/* Sender Info & Associated Entities */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">Metadata & Pipeline Info</h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400">Company:</span>
                <span className="font-bold text-slate-800">{lead.company || 'Not Inferred'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400">Category:</span>
                <span className="font-bold text-slate-800">{lead.category_name || 'Unassigned'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400">Assigned Rep:</span>
                <span className="font-bold text-slate-800">{lead.assigned_to_name || 'Unassigned'}</span>
              </div>
              {lead.customer_id && (
                <div className="flex justify-between py-1.5 border-b border-slate-50">
                  <span className="text-slate-400">Customer Link:</span>
                  <button
                    onClick={() => navigate(`/customers/${lead.customer_id}`)}
                    className="font-bold text-indigo-600 hover:underline inline-flex items-center gap-1"
                  >
                    <span>View Customer</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              )}
              {lead.enquiry_id && (
                <div className="flex justify-between py-1.5 border-b border-slate-50">
                  <span className="text-slate-400">Enquiry Link:</span>
                  <button
                    onClick={() => navigate(`/enquiries/${lead.enquiry_id}`)}
                    className="font-bold text-indigo-600 hover:underline inline-flex items-center gap-1"
                  >
                    <span>View Enquiry</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Redesigned Machinery Sales Conversion Modal */}
      <ConvertLeadModal
        isOpen={convertModalOpen}
        onClose={() => setConvertModalOpen(false)}
        lead={lead}
        onConverted={handleLeadConverted}
        categories={categories}
        territories={territories}
        salesUsers={salesUsers}
        onRefreshCategories={loadDropdowns}
      />
    </div>
  );
};
