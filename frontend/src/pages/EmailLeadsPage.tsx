import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail,
  RefreshCw,
  Search,
  CheckCircle2,
  Sparkles,
  Building,
  User,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import { emailLeadsApi, categoriesApi, territoriesApi, usersApi } from '../services/api';
import { EmailLead, Category, Territory, User as UserType } from '../types';
import { useToast } from '../components/common/Toast';
import { StatusBadge } from '../components/common/Badge';
import { Pagination } from '../components/common/Pagination';
import { TableSkeleton } from '../components/common/TableSkeleton';
import { EmptyState } from '../components/common/EmptyState';
import { ConvertLeadModal } from '../components/common/ConvertLeadModal';
import { formatISTDateTime } from '../utils/date';

export const EmailLeadsPage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error: toastError, info } = useToast();

  const [leads, setLeads] = useState<EmailLead[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [salesUsers, setSalesUsers] = useState<UserType[]>([]);

  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [imapStatus, setImapStatus] = useState<any>(null);

  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch] = useState('');

  // Convert Modal State
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<EmailLead | null>(null);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const params: any = { page, page_size: 10 };
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.category_id = categoryFilter;
      if (search.trim()) params.search = search.trim();

      const [leadsRes, statusRes] = await Promise.all([
        emailLeadsApi.list(params),
        emailLeadsApi.getStatus(),
      ]);

      setLeads(leadsRes.items);
      setTotal(leadsRes.total);
      setTotalPages(leadsRes.total_pages);
      setImapStatus(statusRes);
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Failed to load email leads');
    } finally {
      setLoading(false);
    }
  };

  const loadMetadata = async (): Promise<Category[]> => {
    try {
      const [catList, terrList, uList] = await Promise.all([
        categoriesApi.all(),
        territoriesApi.all(),
        usersApi.list({ page_size: 100 }),
      ]);
      setCategories(catList);
      setTerritories(terrList);
      setSalesUsers(uList.items);
      return catList;
    } catch (e) {
      console.error('Failed to load metadata', e);
      return [];
    }
  };

  useEffect(() => {
    loadMetadata();
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [page, statusFilter, categoryFilter]);

  const handleFetchNow = async () => {
    setFetching(true);
    try {
      const res = await emailLeadsApi.fetchNow();
      info(res.message);
      fetchLeads();
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Failed to fetch incoming emails');
    } finally {
      setFetching(false);
    }
  };

  const handleOpenConvert = (lead: EmailLead, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedLead(lead);
    setConvertModalOpen(true);
  };

  const handleLeadConverted = () => {
    fetchLeads();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Email Leads Inbox
            </h2>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                imapStatus?.status === 'Configured'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              IMAP: {imapStatus?.status || 'Active'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Multichannel machinery enquiry inbox with original email fidelity and instant customer conversion.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleFetchNow}
            disabled={fetching}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${fetching ? 'animate-spin' : ''}`} />
            <span>{fetching ? 'Checking Inbox...' : 'Fetch Emails Now'}</span>
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-wrap gap-3 items-center justify-between">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            fetchLeads();
          }}
          className="relative w-full sm:w-80"
        >
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search email sender, subject, company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition"
          />
        </form>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="py-2 px-3 rounded-xl border border-slate-200 text-xs text-slate-700 bg-white focus:border-indigo-600 transition"
          >
            <option value="">All Statuses</option>
            <option value="NEW">New</option>
            <option value="REVIEWED">Reviewed</option>
            <option value="QUALIFIED">Qualified</option>
            <option value="CONVERTED">Converted</option>
            <option value="REJECTED">Rejected</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="py-2 px-3 rounded-xl border border-slate-200 text-xs text-slate-700 bg-white focus:border-indigo-600 transition"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Leads List / Cards */}
      {loading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : leads.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="No Email Leads Found"
          description="Adjust your status or category filters, or click 'Fetch Emails Now' to sync."
          actionText="Poll Inbox Now"
          onAction={handleFetchNow}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {leads.map((lead) => (
            <div
              key={lead.id}
              onClick={() => navigate(`/email-leads/${lead.id}`)}
              className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs hover:shadow-md hover:border-indigo-100 transition cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 font-bold text-xs flex items-center justify-center flex-shrink-0">
                      {lead.company ? lead.company.charAt(0) : lead.sender_name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 leading-tight">
                        {lead.sender_name}
                      </p>
                      <p className="text-[11px] text-slate-400 font-medium">
                        {lead.sender_email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {lead.category_name && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        {lead.category_name}
                      </span>
                    )}
                    <StatusBadge status={lead.status} />
                  </div>
                </div>

                <h3 className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition line-clamp-1 mb-1.5">
                  {lead.subject}
                </h3>
                <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100 whitespace-pre-line font-sans">
                  {lead.body}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px] flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span>Received: {formatISTDateTime(lead.received_at)}</span>
                </span>

                <div className="flex items-center gap-2">
                  {lead.status !== 'CONVERTED' ? (
                    <button
                      onClick={(e) => handleOpenConvert(lead, e)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Convert Lead</span>
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Converted</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={total}
        pageSize={10}
        onPageChange={(p) => setPage(p)}
      />

      {/* Redesigned Machinery Sales Conversion Modal */}
      <ConvertLeadModal
        isOpen={convertModalOpen}
        onClose={() => setConvertModalOpen(false)}
        lead={selectedLead}
        onConverted={handleLeadConverted}
        categories={categories}
        territories={territories}
        salesUsers={salesUsers}
        onRefreshCategories={loadMetadata}
      />
    </div>
  );
};
