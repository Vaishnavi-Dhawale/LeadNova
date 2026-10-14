import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Inbox,
  Plus,
  Search,
  Filter,
  DollarSign,
  UserCheck,
  Tag,
  Building,
  Edit2,
  Trash2,
  ChevronRight,
  TrendingUp,
  Clock,
  Calendar,
  X
} from 'lucide-react';
import { enquiriesApi, customersApi, categoriesApi, territoriesApi, usersApi } from '../services/api';
import { Enquiry, Customer, Category, Territory, User } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { StatusBadge, PriorityBadge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Pagination } from '../components/common/Pagination';
import { TableSkeleton } from '../components/common/TableSkeleton';
import { EmptyState } from '../components/common/EmptyState';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { formatISTDate } from '../utils/date';

export const EnquiriesPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAdmin } = useAuth();
  const { success, error: toastError } = useToast();

  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [salesUsers, setSalesUsers] = useState<User[]>([]);

  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [territoryFilter, setTerritoryFilter] = useState('');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);

  // Add Category inline popover state
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    customer_id: '',
    title: '',
    description: '',
    category_id: '',
    territory_id: '',
    assigned_to: '',
    source: 'WEBSITE',
    priority: 'MEDIUM',
    status: 'NEW',
    estimated_value: 0,
    follow_up_date: '',
  });

  const [statusUpdateData, setStatusUpdateData] = useState({
    status: '',
    notes: '',
  });

  const fetchEnquiries = async () => {
    setLoading(true);
    try {
      const params: any = { page, page_size: 10 };
      if (search.trim()) params.search = search.trim();
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (categoryFilter) params.category_id = parseInt(categoryFilter);
      if (territoryFilter) params.territory_id = parseInt(territoryFilter);

      const custIdParam = searchParams.get('customer_id');
      if (custIdParam) params.customer_id = parseInt(custIdParam);

      const data = await enquiriesApi.list(params);
      setEnquiries(data.items);
      setTotal(data.total);
      setTotalPages(data.total_pages);
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Failed to load enquiries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnquiries();
  }, [page, statusFilter, priorityFilter, categoryFilter, territoryFilter]);

  useEffect(() => {
    const loadDropdownData = async () => {
      try {
        const [custList, catList, terrList, userList] = await Promise.all([
          customersApi.all(),
          categoriesApi.all(),
          territoriesApi.all(),
          usersApi.list({ page_size: 100 }),
        ]);
        setCustomers(custList);
        setCategories(catList);
        setTerritories(terrList);
        setSalesUsers(userList.items);
      } catch (e) {
        console.error('Failed to load dropdown options', e);
      }
    };
    loadDropdownData();
  }, []);

  const handleOpenCreate = () => {
    const custIdParam = searchParams.get('customer_id') || '';
    setFormData({
      customer_id: custIdParam || (customers[0]?.id ? String(customers[0].id) : ''),
      title: '',
      description: '',
      category_id: categories[0]?.id ? String(categories[0].id) : '',
      territory_id: '',
      assigned_to: '',
      source: 'WEBSITE',
      priority: 'MEDIUM',
      status: 'NEW',
      estimated_value: 100000,
      follow_up_date: '',
    });
    setShowAddCategory(false);
    setCreateModalOpen(true);
  };

  const handleOpenEdit = (e: Enquiry, evt: React.MouseEvent) => {
    evt.stopPropagation();
    setSelectedEnquiry(e);
    let formattedFollowUp = '';
    if (e.next_follow_up_date) {
      try {
        const d = new Date(e.next_follow_up_date);
        if (!isNaN(d.getTime())) {
          formattedFollowUp = d.toISOString().slice(0, 10);
        }
      } catch {}
    }
    setFormData({
      customer_id: String(e.customer_id),
      title: e.title,
      description: e.description || '',
      category_id: String(e.category_id),
      territory_id: e.territory_id ? String(e.territory_id) : '',
      assigned_to: e.assigned_to ? String(e.assigned_to) : '',
      source: e.source,
      priority: e.priority,
      status: e.status,
      estimated_value: e.estimated_value,
      follow_up_date: formattedFollowUp,
    });
    setShowAddCategory(false);
    setEditModalOpen(true);
  };

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) {
      toastError('Please enter a category name');
      return;
    }
    setSavingCategory(true);
    try {
      const created = await categoriesApi.create({
        name: newCatName.trim(),
        description: newCatDesc.trim() || undefined,
      });
      success(`Category '${created.name}' created`);
      setCategories((prev) => [...prev, created]);
      setFormData((prev) => ({ ...prev, category_id: String(created.id) }));
      setNewCatName('');
      setNewCatDesc('');
      setShowAddCategory(false);
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Failed to create category');
    } finally {
      setSavingCategory(false);
    }
  };

  const handleOpenStatusModal = (e: Enquiry, evt: React.MouseEvent) => {
    evt.stopPropagation();
    setSelectedEnquiry(e);
    setStatusUpdateData({
      status: e.status,
      notes: '',
    });
    setStatusModalOpen(true);
  };

  const handleOpenDelete = (e: Enquiry, evt: React.MouseEvent) => {
    evt.stopPropagation();
    setSelectedEnquiry(e);
    setDeleteConfirmOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        ...formData,
        customer_id: parseInt(formData.customer_id),
        category_id: parseInt(formData.category_id),
        territory_id: formData.territory_id ? parseInt(formData.territory_id) : null,
        assigned_to: formData.assigned_to ? parseInt(formData.assigned_to) : null,
        estimated_value: parseFloat(String(formData.estimated_value)) || 0,
        follow_up_date: formData.follow_up_date ? new Date(formData.follow_up_date).toISOString() : null,
      };
      await enquiriesApi.create(payload);
      success('Enquiry created successfully.');
      setCreateModalOpen(false);
      setPage(1);
      fetchEnquiries();
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Failed to create enquiry');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnquiry) return;
    try {
      const payload: any = {
        ...formData,
        customer_id: parseInt(formData.customer_id),
        category_id: parseInt(formData.category_id),
        territory_id: formData.territory_id ? parseInt(formData.territory_id) : null,
        assigned_to: formData.assigned_to ? parseInt(formData.assigned_to) : null,
        estimated_value: parseFloat(String(formData.estimated_value)) || 0,
        follow_up_date: formData.follow_up_date ? new Date(formData.follow_up_date).toISOString() : null,
      };
      await enquiriesApi.update(selectedEnquiry.id, payload);
      success('Enquiry updated successfully.');
      setEditModalOpen(false);
      fetchEnquiries();
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Failed to update enquiry');
    }
  };

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnquiry) return;
    try {
      await enquiriesApi.updateStatus(selectedEnquiry.id, statusUpdateData.status, statusUpdateData.notes);
      success(`Enquiry status changed to ${statusUpdateData.status}.`);
      setStatusModalOpen(false);
      fetchEnquiries();
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Failed to update status');
    }
  };

  const handleDeleteSubmit = async () => {
    if (!selectedEnquiry) return;
    try {
      await enquiriesApi.delete(selectedEnquiry.id);
      success('Enquiry deleted successfully.');
      fetchEnquiries();
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Failed to delete enquiry');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Enquiry Logbook
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Track customer enquiries, commercial opportunities, stages, and sales assignments.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>New Enquiry</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-wrap gap-3 items-center justify-between">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            fetchEnquiries();
          }}
          className="relative w-full sm:w-72"
        >
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search enquiries or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
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
            <option value="IN_PROGRESS">In Progress</option>
            <option value="FOLLOW_UP">Follow Up</option>
            <option value="CONVERTED">Converted</option>
            <option value="LOST">Lost</option>
            <option value="CLOSED">Closed</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value);
              setPage(1);
            }}
            className="py-2 px-3 rounded-xl border border-slate-200 text-xs text-slate-700 bg-white focus:border-indigo-600 transition"
          >
            <option value="">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
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

      {/* Table */}
      {loading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : enquiries.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No Enquiries Found"
          description="Create your first sales enquiry or clear your filters."
          actionText="Create Enquiry"
          onAction={handleOpenCreate}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-6">Enquiry & Customer</th>
                  <th className="py-3.5 px-6">Category / Territory</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Priority</th>
                  <th className="py-3.5 px-6">Est. Pipeline Value</th>
                  <th className="py-3.5 px-6">Assigned Rep</th>
                  <th className="py-3.5 px-6">Follow-up</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {enquiries.map((e) => (
                  <tr
                    key={e.id}
                    onClick={() => navigate(`/enquiries/${e.id}`)}
                    className="hover:bg-slate-50/80 transition cursor-pointer group"
                  >
                    <td className="py-4 px-6">
                      <div>
                        <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition">
                          {e.title}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {e.company_name} ({e.customer_name})
                        </p>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div>
                        <p className="font-semibold text-slate-800">{e.category_name || 'N/A'}</p>
                        <p className="text-[11px] text-indigo-600 font-medium">
                          {e.territory_name || 'General'}
                        </p>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <button
                        onClick={(evt) => handleOpenStatusModal(e, evt)}
                        className="hover:opacity-80 transition"
                        title="Click to update status"
                      >
                        <StatusBadge status={e.status} />
                      </button>
                    </td>
                    <td className="py-4 px-6">
                      <PriorityBadge priority={e.priority} />
                    </td>
                    <td className="py-4 px-6 font-bold text-slate-900">
                      ₹{e.estimated_value.toLocaleString('en-IN')}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                        <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                        <span>{e.assigned_to_name || 'Unassigned'}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      {e.next_follow_up_date ? (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded-lg w-fit">
                          <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span>{formatISTDate(e.next_follow_up_date)}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={(evt) => handleOpenStatusModal(e, evt)}
                          title="Change Status"
                          className="px-2 py-1 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 transition"
                        >
                          Status
                        </button>
                        <button
                          onClick={(evt) => handleOpenEdit(e, evt)}
                          title="Edit Enquiry"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={(evt) => handleOpenDelete(e, evt)}
                            title="Delete Enquiry"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 transition ml-1" />
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

      {/* Create Enquiry Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New Enquiry"
        description="Log a new sales inquiry with estimated value and stage."
        maxWidth="2xl"
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
              Enquiry Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Automated CNC Turning Center Proposal"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Category *
                </label>
                <button
                  type="button"
                  onClick={() => setShowAddCategory(!showAddCategory)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Category</span>
                </button>
              </div>

              {showAddCategory && (
                <div className="mb-2.5 p-3 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-indigo-900 text-xs flex items-center gap-1">
                      <Plus className="w-3.5 h-3.5 text-indigo-600" />
                      <span>New Category</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowAddCategory(false)}
                      className="text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. Price Enquiry"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-indigo-200 text-xs bg-white focus:outline-none focus:border-indigo-600"
                  />
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddCategory(false)}
                      className="px-2.5 py-1 text-xs text-slate-600 hover:bg-white rounded-lg transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={savingCategory}
                      onClick={handleCreateCategory}
                      className="px-3 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs transition cursor-pointer disabled:opacity-50"
                    >
                      {savingCategory ? 'Saving...' : 'Add'}
                    </button>
                  </div>
                </div>
              )}

              <select
                required
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition bg-white"
              >
                <option value="">Select Category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Estimated Value (₹) *
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                required
                value={formData.estimated_value}
                onChange={(e) => setFormData({ ...formData, estimated_value: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition bg-white"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition bg-white"
              >
                <option value="NEW">New</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="FOLLOW_UP">Follow Up</option>
                <option value="CONVERTED">Converted</option>
                <option value="LOST">Lost</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Assign Sales Rep
              </label>
              <select
                value={formData.assigned_to}
                onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition bg-white"
              >
                <option value="">Unassigned</option>
                {salesUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Scheduled Follow-up Date
            </label>
            <input
              type="date"
              value={formData.follow_up_date}
              onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Description & Specifications
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Technical specs, machine capacity requirements, delivery timeline..."
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
              Save Enquiry
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Enquiry"
        description="Update enquiry details, priority, or assigned representative."
        maxWidth="2xl"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Enquiry Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Category *
                </label>
                <button
                  type="button"
                  onClick={() => setShowAddCategory(!showAddCategory)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Category</span>
                </button>
              </div>

              {showAddCategory && (
                <div className="mb-2.5 p-3 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-indigo-900 text-xs flex items-center gap-1">
                      <Plus className="w-3.5 h-3.5 text-indigo-600" />
                      <span>New Category</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowAddCategory(false)}
                      className="text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. Price Enquiry"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-indigo-200 text-xs bg-white focus:outline-none focus:border-indigo-600"
                  />
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddCategory(false)}
                      className="px-2.5 py-1 text-xs text-slate-600 hover:bg-white rounded-lg transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={savingCategory}
                      onClick={handleCreateCategory}
                      className="px-3 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs transition cursor-pointer disabled:opacity-50"
                    >
                      {savingCategory ? 'Saving...' : 'Add'}
                    </button>
                  </div>
                </div>
              )}

              <select
                required
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition bg-white"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Estimated Value (₹) *
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                required
                value={formData.estimated_value}
                onChange={(e) => setFormData({ ...formData, estimated_value: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 transition bg-white"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
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
                <option value="NEW">New</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="FOLLOW_UP">Follow Up</option>
                <option value="CONVERTED">Converted</option>
                <option value="LOST">Lost</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Assign Sales Rep
              </label>
              <select
                value={formData.assigned_to}
                onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 transition bg-white"
              >
                <option value="">Unassigned</option>
                {salesUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name || u.name} ({u.role.replace('_', ' ')})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Scheduled Follow-up Date
            </label>
            <input
              type="date"
              value={formData.follow_up_date}
              onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 transition"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition"
            >
              Update Enquiry
            </button>
          </div>
        </form>
      </Modal>

      {/* Quick Status Modal */}
      <Modal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title="Update Enquiry Status"
        description={`Change lifecycle stage for '${selectedEnquiry?.title}'`}
        maxWidth="md"
      >
        <form onSubmit={handleStatusSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              New Status *
            </label>
            <select
              value={statusUpdateData.status}
              onChange={(e) => setStatusUpdateData({ ...statusUpdateData, status: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:border-indigo-600 transition bg-white"
            >
              <option value="NEW">New</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="FOLLOW_UP">Follow Up</option>
              <option value="CONVERTED">Converted (Won)</option>
              <option value="LOST">Lost</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Reason / Status Notes
            </label>
            <textarea
              rows={3}
              value={statusUpdateData.notes}
              onChange={(e) => setStatusUpdateData({ ...statusUpdateData, notes: e.target.value })}
              placeholder="e.g. Quotation accepted, PO received, or client budget postponed..."
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
              Apply Status
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeleteSubmit}
        title="Delete Enquiry"
        message={`Are you sure you want to permanently delete enquiry '${selectedEnquiry?.title}'? This action cannot be undone.`}
        confirmText="Delete"
        isDangerous={true}
      />
    </div>
  );
};
