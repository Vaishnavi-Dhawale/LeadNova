import React, { useState, useEffect } from 'react';
import {
  PhoneCall,
  Plus,
  Search,
  Filter,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Building,
  UserCheck,
  Edit2,
  Trash2
} from 'lucide-react';
import { followUpsApi, customersApi, enquiriesApi, usersApi } from '../services/api';
import { FollowUp, Customer, Enquiry, User } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { StatusBadge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Pagination } from '../components/common/Pagination';
import { TableSkeleton } from '../components/common/TableSkeleton';
import { EmptyState } from '../components/common/EmptyState';

export const FollowUpsPage: React.FC = () => {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();

  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [salesUsers, setSalesUsers] = useState<User[]>([]);

  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [preset, setPreset] = useState<'all' | 'upcoming' | 'overdue' | 'today'>('all');
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUp | null>(null);

  const [formData, setFormData] = useState({
    customer_id: '',
    enquiry_id: '',
    assigned_to: '',
    follow_up_date: '',
    follow_up_type: 'CALL',
    notes: '',
    status: 'PENDING',
  });

  const fetchFollowUps = async () => {
    setLoading(true);
    try {
      const params: any = { page, page_size: 10 };
      if (preset !== 'all') params.filter_preset = preset;
      if (typeFilter) params.follow_up_type = typeFilter;
      if (search.trim()) params.search = search.trim();

      const data = await followUpsApi.list(params);
      setFollowUps(data.items);
      setTotal(data.total);
      setTotalPages(data.total_pages);
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Failed to load follow-ups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFollowUps();
  }, [page, preset, typeFilter]);

  useEffect(() => {
    const loadDropdowns = async () => {
      try {
        const [cList, eList, uList] = await Promise.all([
          customersApi.all(),
          enquiriesApi.list({ page_size: 100 }),
          usersApi.list({ page_size: 100 }),
        ]);
        setCustomers(cList);
        setEnquiries(eList.items);
        setSalesUsers(uList.items);
      } catch (e) {
        console.error('Failed to load dropdown options', e);
      }
    };
    loadDropdowns();
  }, []);

  const handleOpenCreate = () => {
    setFormData({
      customer_id: customers[0]?.id ? String(customers[0].id) : '',
      enquiry_id: '',
      assigned_to: user?.id ? String(user.id) : '',
      follow_up_date: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
      follow_up_type: 'CALL',
      notes: '',
      status: 'PENDING',
    });
    setCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        ...formData,
        customer_id: parseInt(formData.customer_id),
        enquiry_id: formData.enquiry_id ? parseInt(formData.enquiry_id) : null,
        assigned_to: formData.assigned_to ? parseInt(formData.assigned_to) : null,
      };
      await followUpsApi.create(payload);
      success('Follow-up scheduled successfully.');
      setCreateModalOpen(false);
      setPage(1);
      fetchFollowUps();
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Failed to schedule follow-up');
    }
  };

  const handleMarkComplete = async (fu: FollowUp) => {
    try {
      await followUpsApi.complete(fu.id);
      success('Follow-up marked as completed.');
      fetchFollowUps();
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Failed to mark as completed');
    }
  };

  const handleMarkCancel = async (fu: FollowUp) => {
    try {
      await followUpsApi.cancel(fu.id);
      success('Follow-up cancelled.');
      fetchFollowUps();
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Failed to cancel follow-up');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Follow-up Schedule
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Maintain sales cadence, log interactions, and resolve overdue touchpoints.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Schedule Follow-up</span>
        </button>
      </div>

      {/* Filter Presets Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Preset Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100/70 border border-slate-200/60 overflow-x-auto">
          {[
            { id: 'all', label: 'All Interactions' },
            { id: 'upcoming', label: 'Upcoming' },
            { id: 'today', label: 'Today' },
            { id: 'overdue', label: 'Overdue' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setPreset(tab.id as any);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                preset === tab.id
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Type Filter */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="py-2 px-3 rounded-xl border border-slate-200 text-xs text-slate-700 bg-white focus:border-indigo-600 transition"
          >
            <option value="">All Types</option>
            <option value="CALL">Call</option>
            <option value="EMAIL">Email</option>
            <option value="MEETING">Meeting</option>
            <option value="VISIT">Visit</option>
          </select>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
              fetchFollowUps();
            }}
            className="relative w-full sm:w-64"
          >
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search notes or company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition"
            />
          </form>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : followUps.length === 0 ? (
        <EmptyState
          icon={PhoneCall}
          title="No Follow-ups Found"
          description="You are all caught up! Schedule a new interaction to keep leads warm."
          actionText="Schedule Follow-up"
          onAction={handleOpenCreate}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-6">Customer & Opportunity</th>
                  <th className="py-3.5 px-6">Scheduled Date & Time</th>
                  <th className="py-3.5 px-6">Channel</th>
                  <th className="py-3.5 px-6">Action / Notes</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {followUps.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-4 px-6">
                      <div>
                        <p className="font-bold text-slate-900">{f.company_name}</p>
                        <p className="text-[11px] text-slate-400">
                          {f.customer_name} {f.enquiry_title ? `• ${f.enquiry_title}` : ''}
                        </p>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div>
                        <p className="font-semibold text-slate-800">
                          {new Date(f.follow_up_date).toLocaleDateString()}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {new Date(f.follow_up_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {f.follow_up_type}
                      </span>
                    </td>
                    <td className="py-4 px-6 max-w-xs">
                      <p className="line-clamp-2 text-slate-700">{f.notes || 'Routine follow-up check-in'}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Assigned: {f.assigned_to_name || 'Sales Rep'}
                      </p>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1.5">
                        <StatusBadge status={f.status} />
                        {f.is_overdue && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-200">
                            Overdue
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      {f.status === 'PENDING' && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleMarkComplete(f)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold transition"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Done</span>
                          </button>
                          <button
                            onClick={() => handleMarkCancel(f)}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                            title="Cancel Follow-up"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      )}
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

      {/* Schedule Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Schedule Follow-up Interaction"
        description="Book a callback, video meeting, or client visit."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Customer Account *
            </label>
            <select
              required
              value={formData.customer_id}
              onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 transition bg-white"
            >
              <option value="">Select a Customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company_name} ({c.customer_name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Associated Enquiry (Optional)
            </label>
            <select
              value={formData.enquiry_id}
              onChange={(e) => setFormData({ ...formData, enquiry_id: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 transition bg-white"
            >
              <option value="">No specific enquiry / General account follow-up</option>
              {enquiries.map((enq) => (
                <option key={enq.id} value={enq.id}>
                  ENQ-#{enq.id}: {enq.title}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Date & Time *
              </label>
              <input
                type="datetime-local"
                required
                value={formData.follow_up_date}
                onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Interaction Channel *
              </label>
              <select
                value={formData.follow_up_type}
                onChange={(e) => setFormData({ ...formData, follow_up_type: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 transition bg-white"
              >
                <option value="CALL">Phone Call</option>
                <option value="EMAIL">Email</option>
                <option value="MEETING">Video / Office Meeting</option>
                <option value="VISIT">On-Site Client Visit</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Assignee
            </label>
            <select
              value={formData.assigned_to}
              onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 transition bg-white"
            >
              {salesUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Discussion Agenda / Notes
            </label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="e.g. Present revised proposal after engineering review..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 transition"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition"
            >
              Schedule Follow-up
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
