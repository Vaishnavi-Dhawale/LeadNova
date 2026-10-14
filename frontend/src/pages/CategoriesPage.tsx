import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2
} from 'lucide-react';
import { categoriesApi } from '../services/api';
import { Category } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { Modal } from '../components/common/Modal';
import { TableSkeleton } from '../components/common/TableSkeleton';
import { EmptyState } from '../components/common/EmptyState';
import { ConfirmDialog } from '../components/common/ConfirmDialog';

export const CategoriesPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const { success, error: toastError } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true,
  });

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const data = await categoriesApi.list({ search: search.trim(), page_size: 100 });
      setCategories(data.items);
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [search]);

  const handleOpenCreate = () => {
    setFormData({ name: '', description: '', is_active: true });
    setCreateModalOpen(true);
  };

  const handleOpenEdit = (c: Category) => {
    setSelectedCategory(c);
    setFormData({
      name: c.name,
      description: c.description || '',
      is_active: c.is_active,
    });
    setEditModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await categoriesApi.create(formData);
      success(`Category '${formData.name}' created successfully.`);
      setCreateModalOpen(false);
      fetchCategories();
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Failed to create category');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory) return;
    try {
      await categoriesApi.update(selectedCategory.id, formData);
      success(`Category updated successfully.`);
      setEditModalOpen(false);
      fetchCategories();
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Failed to update category');
    }
  };

  const handleDeleteSubmit = async () => {
    if (!selectedCategory) return;
    try {
      await categoriesApi.delete(selectedCategory.id);
      success('Category deleted successfully.');
      fetchCategories();
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Failed to delete category');
    }
  };

  const handleToggleActive = async (c: Category) => {
    try {
      await categoriesApi.update(c.id, { is_active: !c.is_active });
      success(`Category '${c.name}' ${!c.is_active ? 'activated' : 'deactivated'}.`);
      fetchCategories();
    } catch (err: any) {
      toastError('Failed to change category status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Product & Service Categories
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Configure default equipment, spares, and service lines used for enquiry segmentation.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Category</span>
          </button>
        )}
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <TableSkeleton rows={6} cols={4} />
      ) : categories.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No Categories"
          description="Create categories to classify machinery, spare parts, and service requests."
          actionText={isAdmin ? "Create Category" : undefined}
          onAction={isAdmin ? handleOpenCreate : undefined}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-6">Category Name</th>
                <th className="py-3.5 px-6">Description</th>
                <th className="py-3.5 px-6">Status</th>
                {isAdmin && <th className="py-3.5 px-6 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {categories.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-4 px-6 font-bold text-slate-900 text-sm">{c.name}</td>
                  <td className="py-4 px-6 text-slate-500 max-w-md">
                    {c.description || 'No description provided'}
                  </td>
                  <td className="py-4 px-6">
                    <button
                      onClick={() => isAdmin && handleToggleActive(c)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition ${
                        c.is_active
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {c.is_active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      <span>{c.is_active ? 'Active' : 'Inactive'}</span>
                    </button>
                  </td>
                  {isAdmin && (
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(c)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedCategory(c);
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
        title={editModalOpen ? 'Edit Category' : 'Add New Category'}
        maxWidth="md"
      >
        <form onSubmit={editModalOpen ? handleEditSubmit : handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Category Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Machinery"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 transition"
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
              placeholder="Scope of equipment covered..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 transition"
            />
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
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition"
            >
              Save Category
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeleteSubmit}
        title="Delete Category"
        message={`Are you sure you want to delete category '${selectedCategory?.name}'?`}
        confirmText="Delete"
        isDangerous={true}
      />
    </div>
  );
};

export default CategoriesPage;
