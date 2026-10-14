import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  UserCheck,
  Edit2,
  Trash2
} from 'lucide-react';
import { territoriesApi, usersApi } from '../services/api';
import { Territory, User } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { Modal } from '../components/common/Modal';
import { TableSkeleton } from '../components/common/TableSkeleton';
import { EmptyState } from '../components/common/EmptyState';
import { ConfirmDialog } from '../components/common/ConfirmDialog';

export const TerritoriesPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const { success, error: toastError } = useToast();

  const [territories, setTerritories] = useState<Territory[]>([]);
  const [salesUsers, setSalesUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedTerritory, setSelectedTerritory] = useState<Territory | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    state_region: '',
    description: '',
    assigned_sales_user: '',
    is_active: true,
  });

  const fetchTerritories = async () => {
    setLoading(true);
    try {
      const data = await territoriesApi.list({ search: search.trim(), page_size: 100 });
      setTerritories(data.items);
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Failed to load territories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTerritories();
  }, [search]);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const uList = await usersApi.list({ page_size: 100 });
        setSalesUsers(uList.items);
      } catch (e) {
        console.error('Failed to load users', e);
      }
    };
    loadUsers();
  }, []);

  const handleOpenCreate = () => {
    setFormData({
      name: '',
      state_region: '',
      description: '',
      assigned_sales_user: '',
      is_active: true,
    });
    setCreateModalOpen(true);
  };

  const handleOpenEdit = (t: Territory) => {
    setSelectedTerritory(t);
    setFormData({
      name: t.name,
      state_region: t.state_region,
      description: t.description || '',
      assigned_sales_user: t.assigned_sales_user ? String(t.assigned_sales_user) : '',
      is_active: t.is_active,
    });
    setEditModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        name: formData.name,
        state_region: formData.state_region,
        description: formData.description,
        assigned_sales_user: formData.assigned_sales_user ? parseInt(formData.assigned_sales_user) : null,
        is_active: formData.is_active,
      };
      await territoriesApi.create(payload);
      success(`Territory '${formData.name}' created successfully.`);
      setCreateModalOpen(false);
      fetchTerritories();
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Failed to create territory');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTerritory) return;
    try {
      const payload: any = {
        name: formData.name,
        state_region: formData.state_region,
        description: formData.description,
        assigned_sales_user: formData.assigned_sales_user ? parseInt(formData.assigned_sales_user) : null,
        is_active: formData.is_active,
      };
      await territoriesApi.update(selectedTerritory.id, payload);
      success(`Territory updated successfully.`);
      setEditModalOpen(false);
      fetchTerritories();
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Failed to update territory');
    }
  };

  const handleDeleteSubmit = async () => {
    if (!selectedTerritory) return;
    try {
      await territoriesApi.delete(selectedTerritory.id);
      success('Territory deleted successfully.');
      fetchTerritories();
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Failed to delete territory');
    }
  };

  const handleToggleActive = async (t: Territory) => {
    try {
      await territoriesApi.update(t.id, { is_active: !t.is_active });
      success(`Territory '${t.name}' ${!t.is_active ? 'activated' : 'deactivated'}.`);
      fetchTerritories();
    } catch (err: any) {
      toastError('Failed to change territory status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Sales Territory Management
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Segment customers and opportunities across geographical zones and assign regional lead reps.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Territory</span>
          </button>
        )}
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search territory name or state region..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : territories.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No Territories Found"
          description="Create geographic territories to organize your sales pipeline."
          actionText={isAdmin ? "Create Territory" : undefined}
          onAction={isAdmin ? handleOpenCreate : undefined}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-6">Territory Name</th>
                <th className="py-3.5 px-6">State / Region</th>
                <th className="py-3.5 px-6">Assigned Sales Lead</th>
                <th className="py-3.5 px-6">Status</th>
                {isAdmin && <th className="py-3.5 px-6 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {territories.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-4 px-6 font-bold text-slate-900 text-sm">{t.name}</td>
                  <td className="py-4 px-6 font-medium text-slate-800">
                    {t.state_region}
                  </td>
                  <td className="py-4 px-6 font-semibold text-indigo-600 flex items-center gap-1.5 mt-2">
                    <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                    <span>{t.assigned_user_name || 'Unassigned'}</span>
                  </td>
                  <td className="py-4 px-6">
                    <button
                      onClick={() => isAdmin && handleToggleActive(t)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition ${
                        t.is_active
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {t.is_active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      <span>{t.is_active ? 'Active' : 'Inactive'}</span>
                    </button>
                  </td>
                  {isAdmin && (
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(t)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedTerritory(t);
                            setDeleteConfirmOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={createModalOpen || editModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          setEditModalOpen(false);
        }}
        title={editModalOpen ? 'Edit Territory' : 'Add New Territory'}
        maxWidth="md"
      >
        <form onSubmit={editModalOpen ? handleEditSubmit : handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Territory Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. North Region"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              State *
            </label>
            <input
              type="text"
              required
              value={formData.state_region}
              onChange={(e) => setFormData({ ...formData, state_region: e.target.value })}
              placeholder="e.g. Maharashtra or Gujarat"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Assign Sales Lead
            </label>
            <select
              value={formData.assigned_sales_user}
              onChange={(e) => setFormData({ ...formData, assigned_sales_user: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition bg-white"
            >
              <option value="">Unassigned</option>
              {salesUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name || u.name} ({u.role.replace('_', ' ')})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setCreateModalOpen(false);
                setEditModalOpen(false);
              }}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              Save Territory
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeleteSubmit}
        title="Delete Territory"
        message={`Are you sure you want to delete territory '${selectedTerritory?.name}'?`}
        confirmText="Delete"
        isDangerous={true}
      />
    </div>
  );
};

export default TerritoriesPage;
