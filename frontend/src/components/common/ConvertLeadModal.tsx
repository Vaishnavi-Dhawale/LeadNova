import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Plus,
  Building,
  User as UserIcon,
  Phone,
  Layers,
  MapPin,
  Check,
  AlertCircle,
  X,
  PackageCheck
} from 'lucide-react';
import { Modal } from './Modal';
import { EmailLead, Category, Territory, User } from '../../types';
import { MACHINERY_PRODUCTS } from '../../config/products';
import { categoriesApi, emailLeadsApi } from '../../services/api';
import { useToast } from './Toast';

interface ConvertLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: EmailLead | null;
  onConverted: (convertedLead: EmailLead) => void;
  categories: Category[];
  territories: Territory[];
  salesUsers: User[];
  onRefreshCategories: () => Promise<Category[]>;
}

export const ConvertLeadModal: React.FC<ConvertLeadModalProps> = ({
  isOpen,
  onClose,
  lead,
  onConverted,
  categories,
  territories,
  salesUsers,
  onRefreshCategories,
}) => {
  const { success, error: toastError } = useToast();

  const [customerName, setCustomerName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [categoryId, setCategoryId] = useState<string | number>('');
  const [productInterested, setProductInterested] = useState<string>('');
  const [territoryId, setTerritoryId] = useState<string | number>('');
  const [assignedTo, setAssignedTo] = useState<string | number>('');
  const [estimatedValue, setEstimatedValue] = useState<number | string>(0);
  const [notes, setNotes] = useState('');

  const [phoneError, setPhoneError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Add Category inline popover state
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);

  // Extract phone number candidate from text
  const extractPhone = (text: string): string => {
    if (!text) return '';
    const match = text.match(/(?:\+91[\-\s]?)?[6789]\d{9}/);
    return match ? match[0] : '';
  };

  // Detect matching machinery product from subject/body
  const detectProduct = (text: string): string => {
    if (!text) return '';
    const lower = text.toLowerCase();
    for (const prod of MACHINERY_PRODUCTS) {
      if (prod === 'Other') continue;
      if (lower.includes(prod.toLowerCase())) return prod;
    }
    return '';
  };

  useEffect(() => {
    if (lead) {
      setCustomerName(lead.sender_name || '');
      const extracted = extractPhone(lead.body);
      setContactNumber(extracted || '+91 ');
      setPhoneError('');

      // Auto-select detected or lead category
      if (lead.category_id) {
        setCategoryId(lead.category_id);
      } else if (categories.length > 0) {
        // Try matching by lead text
        const matchedCat = categories.find((c) =>
          lead.subject.toLowerCase().includes(c.name.toLowerCase())
        );
        setCategoryId(matchedCat ? matchedCat.id : categories[0].id);
      }

      // Auto-detect machinery product
      const detected = detectProduct(lead.subject + ' ' + lead.body);
      setProductInterested(detected || MACHINERY_PRODUCTS[0]);

      // Territory
      if (territories.length > 0) {
        // Check if customer city or state matches territory
        const matchedTerr = territories.find(
          (t) =>
            lead.body.toLowerCase().includes(t.name.toLowerCase()) ||
            t.name.toLowerCase() === 'mumbai'
        );
        setTerritoryId(matchedTerr ? matchedTerr.id : territories[0].id);
      }

      setAssignedTo(lead.assigned_to ? String(lead.assigned_to) : salesUsers[0]?.id ? String(salesUsers[0].id) : '');
      setEstimatedValue(1500000);
      setNotes(`Converted from Email Lead #${lead.id}: ${lead.subject}`);
    }
  }, [lead, isOpen, categories, territories, salesUsers]);

  const validateIndianPhone = (phone: string): boolean => {
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');
    // Matches 10 digits starting with 6-9, optionally prefixed by +91, 91, or 0
    const regex = /^(\+91|91|0)?[6-9]\d{9}$/;
    return regex.test(cleaned);
  };

  const handlePhoneBlur = () => {
    if (!contactNumber.trim()) {
      setPhoneError('Contact number is required.');
    } else if (!validateIndianPhone(contactNumber)) {
      setPhoneError('Please enter a valid Indian phone number (e.g. +91 98201 12345 or 9820112345).');
    } else {
      setPhoneError('');
    }
  };

  const handleAddCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    setCreatingCategory(true);
    try {
      const created = await categoriesApi.create({
        name: newCatName.trim(),
        description: newCatDesc.trim() || 'Enquiry Category for Machinery Sales',
        is_active: true,
      });

      success(`Category '${created.name}' added successfully!`);
      const updatedList = await onRefreshCategories();
      setCategoryId(created.id);
      setNewCatName('');
      setNewCatDesc('');
      setShowAddCategory(false);
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Failed to create category');
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead) return;

    if (!customerName.trim()) {
      toastError('Customer Name is required.');
      return;
    }

    if (!contactNumber.trim() || !validateIndianPhone(contactNumber)) {
      setPhoneError('Please enter a valid Indian phone number (e.g. +91 98201 12345).');
      toastError('Please enter a valid contact number.');
      return;
    }

    if (!categoryId) {
      toastError('Please select a Category.');
      return;
    }

    if (!territoryId) {
      toastError('Please select a Territory.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        customer_name: customerName.trim(),
        phone: contactNumber.trim(),
        category_id: Number(categoryId),
        product_interested: productInterested || null,
        territory_id: Number(territoryId),
        estimated_value: parseFloat(String(estimatedValue)) || 0.0,
        assigned_to: assignedTo ? Number(assignedTo) : null,
        notes: notes.trim(),
      };

      const res = await emailLeadsApi.convert(lead.id, payload);
      success('Email lead successfully converted to Customer and Deal Enquiry!');
      onConverted(res);
      onClose();
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Failed to convert email lead.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Convert Email Lead to Customer & Opportunity"
      description="Create or link a verified Customer account and machinery Sales Enquiry record."
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Lead Reference Snippet */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block">
              Inbound Enquiry Source
            </span>
            <p className="font-bold text-slate-900 mt-0.5">{lead?.subject}</p>
            <p className="text-slate-500 text-[11px]">
              Sender: <strong className="text-slate-700">{lead?.sender_name}</strong> &lt;{lead?.sender_email}&gt;
            </p>
          </div>
          {lead?.company && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-semibold text-[11px] self-start sm:self-auto">
              <Building className="w-3 h-3 text-slate-400" />
              <span>{lead.company}</span>
            </span>
          )}
        </div>

        {/* 5A & 5B: Customer Name & Contact Number */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Customer Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. Rajesh Sharma"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Contact Number <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={contactNumber}
              onChange={(e) => {
                setContactNumber(e.target.value);
                if (phoneError) setPhoneError('');
              }}
              onBlur={handlePhoneBlur}
              placeholder="+91 98201 12345"
              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs transition ${
                phoneError
                  ? 'border-rose-400 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500'
                  : 'border-slate-200 focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600'
              }`}
            />
            {phoneError && (
              <p className="mt-1 text-[11px] text-rose-600 font-medium flex items-center gap-1">
                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                <span>{phoneError}</span>
              </p>
            )}
          </div>
        </div>

        {/* 5C: Category & Add Category (+) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Category <span className="text-rose-500">*</span>
            </label>
            <button
              type="button"
              onClick={() => setShowAddCategory(!showAddCategory)}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Category</span>
            </button>
          </div>

          <div className="relative">
            <select
              required
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition bg-white"
            >
              <option value="">Select Business Enquiry Category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Inline Add Category Popover Panel */}
          {showAddCategory && (
            <div className="mt-2.5 p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-200/80 space-y-2.5 animate-in fade-in">
              <div className="flex items-center justify-between">
                <p className="font-bold text-indigo-900 text-xs flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Create New Enquiry Category</span>
                </p>
                <button
                  type="button"
                  onClick={() => setShowAddCategory(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="e.g. Urgent Requirement"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-indigo-200 text-xs bg-white focus:outline-none focus:border-indigo-600"
                />
                <input
                  type="text"
                  placeholder="Category Description (Optional)"
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-indigo-200 text-xs bg-white focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddCategory(false)}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddCategorySubmit}
                  disabled={!newCatName.trim() || creatingCategory}
                  className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition disabled:opacity-50"
                >
                  {creatingCategory ? 'Saving...' : 'Save & Select'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 5D & 5E: Product Interested & Territory */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Product Interested
            </label>
            <input
              type="text"
              list="machinery-products-list"
              value={productInterested}
              onChange={(e) => setProductInterested(e.target.value)}
              placeholder="Search or select machinery..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition bg-white"
            />
            <datalist id="machinery-products-list">
              {MACHINERY_PRODUCTS.map((prod) => (
                <option key={prod} value={prod} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Territory <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={territoryId}
              onChange={(e) => setTerritoryId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition bg-white"
            >
              <option value="">Select Territory</option>
              {territories.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.state_region})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 5F: Assign Sales Representative & Estimated Value */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Assign Sales Representative
            </label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition bg-white"
            >
              <option value="">Unassigned</option>
              {salesUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role.replace('_', ' ')})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Estimated Value (₹) <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="number"
              min="0"
              step="10000"
              value={estimatedValue}
              onChange={(e) => setEstimatedValue(e.target.value)}
              placeholder="e.g. 1500000"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition"
            />
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition disabled:opacity-50"
          >
            {submitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Converting...</span>
              </>
            ) : (
              <>
                <PackageCheck className="w-4 h-4" />
                <span>Complete Conversion</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
