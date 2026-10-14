import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  Plus,
  Search,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Edit2,
  Trash2,
  Send,
  Users,
  Eye,
  AlertCircle,
  RefreshCw,
  Mail
} from 'lucide-react';
import { campaignsApi } from '../services/api';
import { Campaign, CampaignPreviewRecipients } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { StatusBadge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Pagination } from '../components/common/Pagination';
import { TableSkeleton } from '../components/common/TableSkeleton';
import { EmptyState } from '../components/common/EmptyState';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { formatISTDateTime } from '../utils/date';

const TARGET_SEGMENTS = [
  'All Customers',
  'Interested Customers',
  'New Customers',
  'Existing Customers',
  'Customers with Open Enquiries',
  'Customers with Pending Follow-ups',
];

export const CampaignsPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const { success, error: toastError } = useToast();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  // Recipient Preview State
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<CampaignPreviewRecipients | null>(null);
  const [isSending, setIsSending] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'DRAFT',
    target_segment: 'All Customers',
    email_subject: '',
    email_body: '',
    scheduled_at: '',
  });

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const params: any = { page, page_size: 10 };
      if (search.trim()) params.search = search.trim();
      if (statusFilter) params.status = statusFilter;

      const data = await campaignsApi.list(params);
      setCampaigns(data.items);
      setTotal(data.total);
      setTotalPages(data.total_pages);
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [page, statusFilter]);

  const loadRecipientPreview = async (segment: string) => {
    setPreviewLoading(true);
    try {
      const res = await campaignsApi.previewRecipients(segment);
      setPreviewData(res);
    } catch (err: any) {
      console.error('Failed to preview recipients', err);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleOpenCreate = () => {
    const initialData = {
      name: '',
      description: '',
      status: 'DRAFT',
      target_segment: 'All Customers',
      email_subject: '',
      email_body: '',
      scheduled_at: '',
    };
    setFormData(initialData);
    setCreateModalOpen(true);
    loadRecipientPreview('All Customers');
  };

  const handleOpenEdit = (c: Campaign) => {
    setSelectedCampaign(c);
    setFormData({
      name: c.name,
      description: c.description || '',
      status: c.status,
      target_segment: c.target_segment || 'All Customers',
      email_subject: c.email_subject || '',
      email_body: c.email_body || '',
      scheduled_at: c.scheduled_at ? c.scheduled_at.slice(0, 16) : '',
    });
    setEditModalOpen(true);
    loadRecipientPreview(c.target_segment || 'All Customers');
  };

  const handleOpenSend = (c: Campaign) => {
    setSelectedCampaign(c);
    setSendModalOpen(true);
    loadRecipientPreview(c.target_segment || 'All Customers');
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        status: formData.status,
        target_segment: formData.target_segment,
        email_subject: formData.email_subject.trim() || null,
        email_body: formData.email_body.trim() || null,
        scheduled_at: formData.scheduled_at ? new Date(formData.scheduled_at).toISOString() : null,
      };
      await campaignsApi.create(payload);
      success('Campaign created successfully.');
      setCreateModalOpen(false);
      fetchCampaigns();
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Failed to create campaign');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaign) return;
    try {
      const payload: any = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        status: formData.status,
        target_segment: formData.target_segment,
        email_subject: formData.email_subject.trim() || null,
        email_body: formData.email_body.trim() || null,
        scheduled_at: formData.scheduled_at ? new Date(formData.scheduled_at).toISOString() : null,
      };
      await campaignsApi.update(selectedCampaign.id, payload);
      success('Campaign updated successfully.');
      setEditModalOpen(false);
      fetchCampaigns();
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Failed to update campaign');
    }
  };

  const handleConfirmSend = async () => {
    if (!selectedCampaign) return;
    setIsSending(true);
    try {
      const res = await campaignsApi.send(selectedCampaign.id);
      success(res.message || `Campaign sent successfully to ${res.recipient_count} recipients.`);
      setSendModalOpen(false);
      fetchCampaigns();
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Failed to send campaign');
    } finally {
      setIsSending(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!selectedCampaign) return;
    try {
      await campaignsApi.cancel(selectedCampaign.id);
      success('Campaign cancelled.');
      setCancelConfirmOpen(false);
      fetchCampaigns();
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Failed to cancel campaign');
    }
  };

  const handleDeleteSubmit = async () => {
    if (!selectedCampaign) return;
    try {
      await campaignsApi.delete(selectedCampaign.id);
      success('Campaign deleted successfully.');
      setDeleteConfirmOpen(false);
      fetchCampaigns();
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Failed to delete campaign');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Marketing Campaigns
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Segment your customer base, draft targeted email outreaches, schedule and track campaign delivery.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>New Campaign</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-wrap gap-3 items-center justify-between">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            fetchCampaigns();
          }}
          className="relative w-full sm:w-80"
        >
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search campaign name, subject, target..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition"
          />
        </form>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="py-2 px-3 rounded-xl border border-slate-200 text-xs text-slate-700 bg-white focus:border-indigo-600 transition"
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="SENT">Sent</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <TableSkeleton rows={5} cols={6} />
      ) : campaigns.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No Campaigns Found"
          description="Create your first targeted marketing campaign to engage customers."
          actionText="Create Campaign"
          onAction={handleOpenCreate}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-6">Campaign</th>
                  <th className="py-3.5 px-6">Target</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Send By</th>
                  <th className="py-3.5 px-6">Send At</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {campaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition">
                    {/* Campaign Name & Subject */}
                    <td className="py-4 px-6 max-w-xs sm:max-w-sm">
                      <p className="font-bold text-slate-900 text-sm">{c.name}</p>
                      {c.email_subject && (
                        <p className="text-xs text-indigo-600 font-medium mt-0.5 flex items-center gap-1">
                          <Mail className="w-3 h-3 inline-block shrink-0" />
                          <span className="truncate">{c.email_subject}</span>
                        </p>
                      )}
                      {c.description && (
                        <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                          {c.description}
                        </p>
                      )}
                    </td>

                    {/* Target Segment */}
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        {c.target_segment || 'All Customers'}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-6">
                      <StatusBadge status={c.status} />
                    </td>

                    {/* Send By */}
                    <td className="py-4 px-6 font-medium text-slate-700">
                      {c.sent_by_name || (c.status === 'SENT' ? 'System' : '—')}
                    </td>

                    {/* Send At */}
                    <td className="py-4 px-6 font-medium text-slate-600 whitespace-nowrap">
                      {c.sent_at ? (
                        <div>
                          <p className="text-slate-800 font-semibold">{formatISTDateTime(c.sent_at)}</p>
                          <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">
                            Sent to {c.recipient_count || 0} recipient(s)
                          </p>
                        </div>
                      ) : c.scheduled_at ? (
                        <div>
                          <p className="text-slate-800 font-semibold">{formatISTDateTime(c.scheduled_at)}</p>
                          <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">
                            Scheduled
                          </p>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Send Campaign Now (if draft or scheduled) */}
                        {(c.status === 'DRAFT' || c.status === 'SCHEDULED' || c.status === 'PLANNED') && (
                          <button
                            onClick={() => handleOpenSend(c)}
                            title="Send Campaign Now"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold text-xs transition"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Send</span>
                          </button>
                        )}

                        {/* Cancel Campaign (if draft or scheduled) */}
                        {(c.status === 'DRAFT' || c.status === 'SCHEDULED') && (
                          <button
                            onClick={() => {
                              setSelectedCampaign(c);
                              setCancelConfirmOpen(true);
                            }}
                            title="Cancel Campaign"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}

                        {/* Edit Campaign */}
                        <button
                          onClick={() => handleOpenEdit(c)}
                          title="Edit Campaign"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {/* Delete Campaign (Admin only) */}
                        {isAdmin && (
                          <button
                            onClick={() => {
                              setSelectedCampaign(c);
                              setDeleteConfirmOpen(true);
                            }}
                            title="Delete Campaign"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={total}
            pageSize={10}
            onPageChange={(p) => setPage(p)}
          />
        </div>
      )}

      {/* Create / Edit Campaign Modal */}
      <Modal
        isOpen={createModalOpen || editModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          setEditModalOpen(false);
        }}
        title={editModalOpen ? 'Edit Campaign' : 'Create Marketing Campaign'}
        maxWidth="lg"
      >
        <form onSubmit={editModalOpen ? handleEditSubmit : handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Campaign Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Q4 Precision Machining Outreach"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Target Segment *
              </label>
              <select
                value={formData.target_segment}
                onChange={(e) => {
                  const seg = e.target.value;
                  setFormData({ ...formData, target_segment: seg });
                  loadRecipientPreview(seg);
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 transition bg-white"
              >
                {TARGET_SEGMENTS.map((seg) => (
                  <option key={seg} value={seg}>
                    {seg}
                  </option>
                ))}
              </select>

              {/* Live recipient count preview badge */}
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1 font-medium">
                  <Users className="w-3.5 h-3.5 text-indigo-600" />
                  {previewLoading ? (
                    'Calculating recipients...'
                  ) : (
                    <span>
                      Estimated:{' '}
                      <strong className="text-slate-800 font-bold">
                        {previewData?.count ?? 0}
                      </strong>{' '}
                      customers
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => loadRecipientPreview(formData.target_segment)}
                  className="text-indigo-600 hover:text-indigo-800 transition"
                  title="Refresh recipient count"
                >
                  <RefreshCw className={`w-3 h-3 ${previewLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 transition bg-white"
              >
                <option value="DRAFT">DRAFT</option>
                <option value="SCHEDULED">SCHEDULED</option>
                <option value="SENT">SENT</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Email Subject
            </label>
            <input
              type="text"
              value={formData.email_subject}
              onChange={(e) => setFormData({ ...formData, email_subject: e.target.value })}
              placeholder="e.g. Exclusive Q4 Industrial Gearbox & Spares Catalog"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Email Body
            </label>
            <textarea
              rows={4}
              value={formData.email_body}
              onChange={(e) => setFormData({ ...formData, email_body: e.target.value })}
              placeholder="Dear Partner,\n\nWe are excited to share our latest industrial product catalog..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Scheduled At
              </label>
              <input
                type="datetime-local"
                value={formData.scheduled_at}
                onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Internal Description / Notes
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional notes or objectives"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 transition"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setCreateModalOpen(false);
                setEditModalOpen(false);
              }}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition"
            >
              Save Campaign
            </button>
          </div>
        </form>
      </Modal>

      {/* Send Campaign Confirmation Modal */}
      <Modal
        isOpen={sendModalOpen}
        onClose={() => setSendModalOpen(false)}
        title="Send Campaign Outreach"
        maxWidth="md"
      >
        {selectedCampaign && (
          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Campaign:</span>
                <span className="font-bold text-slate-900">{selectedCampaign.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Target Segment:</span>
                <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                  {selectedCampaign.target_segment || 'All Customers'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Subject:</span>
                <span className="font-medium text-slate-800 truncate max-w-[200px]">
                  {selectedCampaign.email_subject || '(No subject provided)'}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                <span className="text-slate-500 font-medium">Resolved Recipients:</span>
                <span className="font-bold text-emerald-700">
                  {previewLoading ? 'Calculating...' : `${previewData?.count ?? 0} Customer(s)`}
                </span>
              </div>
            </div>

            {/* Recipient preview list */}
            {previewData && previewData.recipients.length > 0 && (
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Recipient Preview ({previewData.recipients.length} shown)
                </p>
                <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-100 bg-white divide-y divide-slate-100">
                  {previewData.recipients.slice(0, 10).map((r) => (
                    <div key={r.customer_id} className="p-2 text-xs flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-800">{r.customer_name}</p>
                        <p className="text-[11px] text-slate-400">{r.company_name || 'No company'}</p>
                      </div>
                      <span className="text-slate-600 text-[11px] font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                        {r.email}
                      </span>
                    </div>
                  ))}
                  {previewData.count > 10 && (
                    <div className="p-2 text-center text-[11px] text-slate-400 font-medium bg-slate-50">
                      + {previewData.count - 10} more customer(s)
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Warning Banner */}
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <p>
                This action will send outreach emails to all resolved customer recipients in the selected segment.
                Status will transition to <strong>SENT</strong> and send time will be recorded in IST.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSendModalOpen(false)}
                disabled={isSending}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSend}
                disabled={isSending || (previewData?.count ?? 0) === 0}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition"
              >
                {isSending ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Sending Campaign...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Campaign Now</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        isOpen={cancelConfirmOpen}
        onClose={() => setCancelConfirmOpen(false)}
        onConfirm={handleConfirmCancel}
        title="Cancel Campaign"
        message={`Are you sure you want to cancel campaign '${selectedCampaign?.name}'?`}
        confirmText="Cancel Campaign"
        isDangerous={false}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeleteSubmit}
        title="Delete Campaign"
        message={`Are you sure you want to permanently delete campaign '${selectedCampaign?.name}'?`}
        confirmText="Delete"
        isDangerous={true}
      />
    </div>
  );
};

export default CampaignsPage;
