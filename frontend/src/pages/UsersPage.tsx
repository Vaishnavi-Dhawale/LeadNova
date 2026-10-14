import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { usersApi } from '../services/api';
import { User, UserRole } from '../types';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import Pagination from '../components/common/Pagination';
import TableSkeleton from '../components/common/TableSkeleton';
import EmptyState from '../components/common/EmptyState';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { PasswordInput } from '../components/common/PasswordInput';
import { Shield, UserPlus, Search, RefreshCw, Key, Edit2, Trash2 } from 'lucide-react';

export const UsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { success, error: toastError } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [confirmStatusUser, setConfirmStatusUser] = useState<User | null>(null);
  const [deleteUserConfirm, setDeleteUserConfirm] = useState<User | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role: UserRole.SALES_USER as UserRole,
    password: '',
    is_active: true,
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await usersApi.getAll({
        skip: (page - 1) * pageSize,
        limit: pageSize,
        search: search.trim() || undefined,
        role: roleFilter || undefined,
      });
      setUsers(res.items);
      setTotal(res.total);
    } catch {
      toastError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, roleFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleOpenCreate = () => {
    setFormData({
      email: '',
      full_name: '',
      role: UserRole.SALES_USER,
      password: '',
      is_active: true,
    });
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (u: User) => {
    setSelectedUser(u);
    setFormData({
      email: u.email,
      full_name: u.full_name || u.name,
      role: u.role,
      password: '',
      is_active: u.is_active,
    });
    setIsEditOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = formData.full_name.trim();
    const trimmedEmail = formData.email.trim();
    if (!trimmedEmail || !trimmedName || !formData.password) {
      toastError('Please fill in all required fields');
      return;
    }
    try {
      await usersApi.create({
        name: trimmedName,
        full_name: trimmedName,
        email: trimmedEmail,
        role: formData.role,
        password: formData.password,
        is_active: formData.is_active,
      });
      success('User added successfully.');
      setIsCreateOpen(false);
      fetchUsers();
    } catch (err: any) {
      const errDetail = err.response?.data?.detail;
      const errMsg = typeof errDetail === 'string'
        ? errDetail
        : Array.isArray(errDetail)
        ? errDetail.map((d: any) => d.msg || JSON.stringify(d)).join(', ')
        : 'Failed to create user';
      toastError(errMsg);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    const trimmedName = formData.full_name.trim();
    const trimmedEmail = formData.email.trim();
    try {
      const payload: any = {
        name: trimmedName,
        full_name: trimmedName,
        email: trimmedEmail,
        role: formData.role,
        is_active: formData.is_active,
      };
      if (formData.password.trim()) {
        payload.password = formData.password.trim();
      }
      await usersApi.update(selectedUser.id, payload);
      success('User updated successfully');
      setIsEditOpen(false);
      fetchUsers();
    } catch (err: any) {
      const errDetail = err.response?.data?.detail;
      const errMsg = typeof errDetail === 'string'
        ? errDetail
        : Array.isArray(errDetail)
        ? errDetail.map((d: any) => d.msg || JSON.stringify(d)).join(', ')
        : 'Failed to update user';
      toastError(errMsg);
    }
  };

  const handleToggleStatus = async () => {
    if (!confirmStatusUser) return;
    try {
      await usersApi.update(confirmStatusUser.id, {
        is_active: !confirmStatusUser.is_active,
      });
      success(`User account ${confirmStatusUser.is_active ? 'deactivated' : 'activated'}`);
      setConfirmStatusUser(null);
      fetchUsers();
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Failed to update user status');
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUserConfirm) return;
    try {
      await usersApi.delete(deleteUserConfirm.id);
      success('User deleted successfully');
      setDeleteUserConfirm(null);
      fetchUsers();
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Failed to delete user');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">User Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage system users, assign role-based access permissions, and configure accounts.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Add User
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-center gap-4">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
          >
            <option value="">All Roles</option>
            <option value={UserRole.ADMIN}>Administrator</option>
            <option value={UserRole.MANAGER}>Sales Manager</option>
            <option value={UserRole.SALES_USER}>Sales Representative</option>
          </select>
          <button
            onClick={() => {
              setSearch('');
              setRoleFilter('');
              setPage(1);
              fetchUsers();
            }}
            title="Reset Filters"
            className="p-2 border border-gray-300 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* User Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <TableSkeleton rows={5} columns={5} />
        ) : users.length === 0 ? (
          <EmptyState
            title="No Users Found"
            description="No users matched your query or filter criteria."
            actionLabel="Add User"
            onAction={handleOpenCreate}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    User Details
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {users.map((u, idx) => {
                  const displayName = u.full_name || u.name || 'User';
                  const isCurrent = currentUser?.id === u.id;
                  const rowNumber = (page - 1) * pageSize + idx + 1;
                  return (
                    <tr key={u.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-semibold flex items-center justify-center text-xs mr-3 border border-slate-200 shrink-0">
                            {rowNumber}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                              {displayName}
                              {isCurrent && (
                                <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded font-medium">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="neutral">
                          <Shield className="w-3 h-3 mr-1 inline" />
                          {u.role.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {u.is_active ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="danger">Inactive</Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(u)}
                            title="Edit User"
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {!isCurrent && (
                            <button
                              onClick={() => setDeleteUserConfirm(u)}
                              title="Delete User"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
        />
      </div>

      {/* Create User Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add New User"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
              placeholder="e.g. Priya Deshmukh"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Email Address *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
              placeholder="user@example.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Role *</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
            >
              <option value={UserRole.ADMIN}>Administrator (Full System Access)</option>
              <option value={UserRole.MANAGER}>Sales Manager (Approvals & Team Analytics)</option>
              <option value={UserRole.SALES_USER}>Sales Representative (Direct Deals)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Password *</label>
            <PasswordInput
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Minimum 6 characters"
              minLength={6}
            />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="is_active_create"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="is_active_create" className="text-sm text-gray-700">
              Account Active Immediately
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-xs transition-colors cursor-pointer"
            >
              Save User
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={`Edit User: ${selectedUser?.full_name || selectedUser?.name}`}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Email Address *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Role *</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
            >
              <option value={UserRole.ADMIN}>Administrator (Full Access)</option>
              <option value={UserRole.MANAGER}>Sales Manager (Approvals & Team)</option>
              <option value={UserRole.SALES_USER}>Sales Representative (Direct Deals)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Reset Password (leave blank to keep unchanged)</label>
            <PasswordInput
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Enter new password (optional)"
              showLeftIcon={false}
            />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="is_active_edit"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="is_active_edit" className="text-sm text-gray-700">
              Account Active
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setIsEditOpen(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-xs transition-colors cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Status Change */}
      <ConfirmDialog
        isOpen={!!confirmStatusUser}
        title={confirmStatusUser?.is_active ? "Deactivate User Account" : "Activate User Account"}
        message={`Are you sure you want to ${
          confirmStatusUser?.is_active ? 'deactivate' : 'activate'
        } ${confirmStatusUser?.full_name || confirmStatusUser?.name}? ${
          confirmStatusUser?.is_active
            ? 'The user will immediately lose access to log into LeadNova.'
            : 'The user will regain login and system access.'
        }`}
        confirmLabel={confirmStatusUser?.is_active ? "Deactivate" : "Activate"}
        confirmVariant={confirmStatusUser?.is_active ? "danger" : "primary"}
        onConfirm={handleToggleStatus}
        onCancel={() => setConfirmStatusUser(null)}
      />

      {/* Confirm Delete User */}
      <ConfirmDialog
        isOpen={!!deleteUserConfirm}
        title="Delete User Account"
        message={`Are you sure you want to delete ${deleteUserConfirm?.full_name || deleteUserConfirm?.name} (${deleteUserConfirm?.email})?`}
        confirmLabel="Delete User"
        confirmVariant="danger"
        onConfirm={handleDeleteUser}
        onCancel={() => setDeleteUserConfirm(null)}
      />
    </div>
  );
};

export default UsersPage;
