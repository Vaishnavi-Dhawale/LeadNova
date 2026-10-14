import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Inbox,
  Building,
  Calendar,
  Clock,
  UserCheck,
  Tag,
  DollarSign,
  FileText,
  Mail,
  Plus,
  Send,
  Download,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { enquiriesApi, followUpsApi } from '../services/api';
import { EnquiryDetail } from '../types';
import { StatusBadge, PriorityBadge } from '../components/common/Badge';
import { LoadingSpinner } from '../components/common/TableSkeleton';
import { EmptyState } from '../components/common/EmptyState';
import { Modal } from '../components/common/Modal';
import { useToast } from '../components/common/Toast';

export const EnquiryDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [enquiry, setEnquiry] = useState<EnquiryDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Status modal
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');

  // Schedule follow-up modal
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
  const [followUpData, setFollowUpData] = useState({
    follow_up_date: '',
    follow_up_type: 'CALL',
    notes: '',
  });

  const fetchEnquiry = async () => {
    if (!id) return;
    try {
      const data = await enquiriesApi.get(parseInt(id));
      setEnquiry(data);
      setNewStatus(data.status);
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Failed to load enquiry details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnquiry();
  }, [id]);

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enquiry) return;
    try {
      await enquiriesApi.updateStatus(enquiry.id, newStatus, statusNotes);
      success(`Enquiry status changed to ${newStatus}.`);
      setStatusModalOpen(false);
      fetchEnquiry();
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Failed to update status');
    }
  };

  const handleScheduleFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enquiry) return;
    try {
      await followUpsApi.create({
        customer_id: enquiry.customer_id,
        enquiry_id: enquiry.id,
        follow_up_date: followUpData.follow_up_date,
        follow_up_type: followUpData.follow_up_type,
        notes: followUpData.notes,
        status: 'PENDING',
      });
      success('Follow-up scheduled successfully.');
      setFollowUpModalOpen(false);
      fetchEnquiry();
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Failed to schedule follow-up');
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!enquiry) {
    return (
      <EmptyState
        icon={Inbox}
        title="Enquiry Not Found"
        description="The enquiry you are looking for does not exist or has been deleted."
        actionText="Back to Enquiries"
        onAction={() => navigate('/enquiries')}
      />
    );
  }

  const pipelineStages = ['NEW', 'IN_PROGRESS', 'FOLLOW_UP', 'CONVERTED'];
  const isTerminalLost = enquiry.status === 'LOST' || enquiry.status === 'CLOSED';

  return (
    <div className="space-y-6">
      {/* Header Back button */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
        <button
          onClick={() => navigate('/enquiries')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 mb-4 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Enquiries</span>
        </button>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-xs font-bold text-slate-400">ENQ-#{enquiry.id}</span>
              <StatusBadge status={enquiry.status} />
              <PriorityBadge priority={enquiry.priority} />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {enquiry.title}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Customer:{' '}
              <button
                onClick={() => navigate(`/customers/${enquiry.customer_id}`)}
                className="font-bold text-indigo-600 hover:underline"
              >
                {enquiry.company_name}
              </button>{' '}
              ({enquiry.customer_name}) • Created:{' '}
              <span className="font-semibold text-slate-700">
                {new Date(enquiry.created_at).toLocaleDateString()}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setStatusModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition"
            >
              <span>Update Status</span>
            </button>
            <button
              onClick={() => setFollowUpModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Schedule Follow-up</span>
            </button>
          </div>
        </div>

        {/* Visual Pipeline Progression Bar */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
            Pipeline Lifecycle
          </p>
          <div className="grid grid-cols-4 gap-2">
            {pipelineStages.map((stage, idx) => {
              const stageLabels: Record<string, string> = {
                NEW: '1. New Lead',
                IN_PROGRESS: '2. In Progress',
                FOLLOW_UP: '3. Follow Up',
                CONVERTED: '4. Converted (Won)',
              };
              const isCurrent = enquiry.status === stage;
              const currentIndex = pipelineStages.indexOf(enquiry.status);
              const isPast = currentIndex > idx && !isTerminalLost;

              return (
                <div
                  key={stage}
                  className={`p-3 rounded-xl border text-center transition ${
                    isCurrent
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-bold shadow-xs'
                      : isPast
                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-800 font-semibold'
                      : 'bg-slate-50/50 border-slate-200 text-slate-400 font-medium'
                  }`}
                >
                  <p className="text-xs">{stageLabels[stage]}</p>
                </div>
              );
            })}
          </div>
          {isTerminalLost && (
            <div className="mt-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold text-center">
              Current Outcome: {enquiry.status}
            </div>
          )}
        </div>
      </div>

      {/* Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Details & Follow-ups */}
        <div className="lg:col-span-2 space-y-6">
          {/* Commercial & Specification Details */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span>Commercial & Technical Scope</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50/60 border border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 font-semibold block mb-0.5">Estimated Value</span>
                <span className="text-base font-extrabold text-slate-900">
                  ₹{enquiry.estimated_value.toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block mb-0.5">Category</span>
                <span className="font-bold text-slate-800">{enquiry.category_name}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block mb-0.5">Territory</span>
                <span className="font-bold text-indigo-600">{enquiry.territory_name || 'General'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block mb-0.5">Inquiry Source</span>
                <span className="font-bold text-slate-800">{enquiry.source}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block mb-0.5">Assigned Rep</span>
                <span className="font-bold text-slate-800">{enquiry.assigned_to_name || 'Unassigned'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block mb-0.5">Last Updated</span>
                <span className="font-bold text-slate-800">
                  {new Date(enquiry.updated_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Technical Requirements & Notes
              </span>
              <p className="text-xs text-slate-700 leading-relaxed bg-white p-3.5 rounded-xl border border-slate-200">
                {enquiry.description || 'No detailed technical specifications recorded.'}
              </p>
            </div>
          </div>

          {/* Follow-ups Timeline for this enquiry */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-600" />
                <span>Scheduled Follow-ups ({enquiry.follow_ups.length})</span>
              </h3>
              <button
                onClick={() => setFollowUpModalOpen(true)}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Follow-up</span>
              </button>
            </div>

            {enquiry.follow_ups.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">
                No follow-ups logged for this enquiry yet.
              </p>
            ) : (
              <div className="space-y-3">
                {enquiry.follow_ups.map((f) => (
                  <div
                    key={f.id}
                    className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 font-bold text-[10px] flex items-center justify-center">
                        {f.follow_up_type}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">{f.notes || 'Scheduled Interaction'}</p>
                        <p className="text-[11px] text-slate-400">
                          {new Date(f.follow_up_date).toLocaleString()} • Assigned: {f.assigned_to_name || 'Rep'}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={f.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Customer Info & Documents */}
        <div className="space-y-6">
          {/* Customer Summary Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Building className="w-4 h-4 text-indigo-600" />
              <span>Customer Summary</span>
            </h3>

            <div className="space-y-2 text-xs">
              <p className="font-bold text-slate-900 text-sm">{enquiry.company_name}</p>
              <p className="text-slate-600">{enquiry.customer_name}</p>
              <p className="text-slate-500">{enquiry.customer_email || 'N/A'}</p>
              <p className="text-slate-500">{enquiry.customer_phone || 'N/A'}</p>
            </div>

            <button
              onClick={() => navigate(`/customers/${enquiry.customer_id}`)}
              className="w-full mt-3 py-2 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition text-center"
            >
              Open Full Customer Profile
            </button>
          </div>

          {/* Documents Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>Quotations & KYC</span>
              </h3>
              <button
                onClick={() => navigate('/documents')}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
              >
                Upload
              </button>
            </div>

            {enquiry.documents.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">
                No documents attached to this enquiry.
              </p>
            ) : (
              <div className="space-y-2">
                {enquiry.documents.map((d) => (
                  <div
                    key={d.id}
                    className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs"
                  >
                    <span className="font-semibold text-slate-800 truncate mr-2">
                      {d.original_filename}
                    </span>
                    <a
                      href={`/api/v1/documents/${d.id}/download`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600 hover:text-indigo-800"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Modal */}
      <Modal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title="Update Enquiry Lifecycle Stage"
        description="Transition this enquiry to the next stage in the sales funnel."
        maxWidth="md"
      >
        <form onSubmit={handleStatusSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Select Stage *
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:border-indigo-600 transition bg-white"
            >
              <option value="NEW">NEW - Newly Received</option>
              <option value="IN_PROGRESS">IN_PROGRESS - Proposal In Preparation</option>
              <option value="FOLLOW_UP">FOLLOW_UP - Demo / Discussion Ongoing</option>
              <option value="CONVERTED">CONVERTED - Order Won & Confirmed</option>
              <option value="LOST">LOST - Order Lost to Competitor / Postponed</option>
              <option value="CLOSED">CLOSED - Final Administrative Closure</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Stage Notes
            </label>
            <textarea
              rows={3}
              value={statusNotes}
              onChange={(e) => setStatusNotes(e.target.value)}
              placeholder="Rationale for status transition..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 transition"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStatusModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition"
            >
              Save Stage
            </button>
          </div>
        </form>
      </Modal>

      {/* Schedule Follow-up Modal */}
      <Modal
        isOpen={followUpModalOpen}
        onClose={() => setFollowUpModalOpen(false)}
        title="Schedule Follow-up"
        description="Book a callback, client meeting, or technical demo."
        maxWidth="md"
      >
        <form onSubmit={handleScheduleFollowUp} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Date & Time *
            </label>
            <input
              type="datetime-local"
              required
              value={followUpData.follow_up_date}
              onChange={(e) => setFollowUpData({ ...followUpData, follow_up_date: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Interaction Type *
            </label>
            <select
              value={followUpData.follow_up_type}
              onChange={(e) => setFollowUpData({ ...followUpData, follow_up_type: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 transition bg-white"
            >
              <option value="CALL">Phone Call</option>
              <option value="EMAIL">Email Follow-up</option>
              <option value="MEETING">Video / Office Meeting</option>
              <option value="VISIT">On-Site Client Plant Visit</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Agenda / Notes
            </label>
            <textarea
              rows={3}
              value={followUpData.notes}
              onChange={(e) => setFollowUpData({ ...followUpData, notes: e.target.value })}
              placeholder="e.g. Discuss commercial payment terms and delivery milestones..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 transition"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setFollowUpModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition"
            >
              Schedule
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
