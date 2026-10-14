import React, { useState, useEffect } from 'react';
import {
  FolderOpen,
  Upload,
  FileText,
  Download,
  Trash2,
  Building,
  Inbox,
  UserCheck
} from 'lucide-react';
import { documentsApi, customersApi, enquiriesApi } from '../services/api';
import { DocumentItem, Customer, Enquiry } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { Modal } from '../components/common/Modal';
import { TableSkeleton } from '../components/common/TableSkeleton';
import { EmptyState } from '../components/common/EmptyState';
import { ConfirmDialog } from '../components/common/ConfirmDialog';

export const DocumentsPage: React.FC = () => {
  const { success, error: toastError } = useToast();

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [customerFilter, setCustomerFilter] = useState('');
  const [enquiryFilter, setEnquiryFilter] = useState('');

  // Upload Modal
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadCustomerId, setUploadCustomerId] = useState('');
  const [uploadEnquiryId, setUploadEnquiryId] = useState('');
  const [uploading, setUploading] = useState(false);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (customerFilter) params.customer_id = parseInt(customerFilter);
      if (enquiryFilter) params.enquiry_id = parseInt(enquiryFilter);

      const data = await documentsApi.list(params);
      setDocuments(data);
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [customerFilter, enquiryFilter]);

  useEffect(() => {
    const loadDropdowns = async () => {
      try {
        const [cList, eList] = await Promise.all([
          customersApi.all(),
          enquiriesApi.list({ page_size: 100 }),
        ]);
        setCustomers(cList);
        setEnquiries(eList.items);
      } catch (e) {
        console.error(e);
      }
    };
    loadDropdowns();
  }, []);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toastError('Please choose a file to upload');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (uploadCustomerId) formData.append('customer_id', uploadCustomerId);
      if (uploadEnquiryId) formData.append('enquiry_id', uploadEnquiryId);

      await documentsApi.upload(formData);
      success(`Document '${selectedFile.name}' uploaded successfully.`);
      setUploadModalOpen(false);
      setSelectedFile(null);
      fetchDocuments();
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!selectedDoc) return;
    try {
      await documentsApi.delete(selectedDoc.id);
      success('Document removed successfully.');
      fetchDocuments();
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Failed to delete document');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Document Repository & KYC
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Store commercial proposals, technical specs, NDAs, purchase orders, and customer KYC files.
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedFile(null);
            setUploadCustomerId('');
            setUploadEnquiryId('');
            setUploadModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition"
        >
          <Upload className="w-4 h-4" />
          <span>Upload File</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-wrap gap-3 items-center">
        <select
          value={customerFilter}
          onChange={(e) => setCustomerFilter(e.target.value)}
          className="py-2 px-3 rounded-xl border border-slate-200 text-xs text-slate-700 bg-white focus:border-indigo-600 transition"
        >
          <option value="">All Customers</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.company_name}
            </option>
          ))}
        </select>

        <select
          value={enquiryFilter}
          onChange={(e) => setEnquiryFilter(e.target.value)}
          className="py-2 px-3 rounded-xl border border-slate-200 text-xs text-slate-700 bg-white focus:border-indigo-600 transition"
        >
          <option value="">All Enquiries</option>
          {enquiries.map((e) => (
            <option key={e.id} value={e.id}>
              ENQ-#{e.id}: {e.title}
            </option>
          ))}
        </select>
      </div>

      {/* Grid of Documents */}
      {loading ? (
        <TableSkeleton rows={4} cols={4} />
      ) : documents.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No Documents Found"
          description="Upload technical quotations, contracts, or client purchase orders."
          actionText="Upload Document"
          onAction={() => setUploadModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs hover:shadow-md hover:border-indigo-100 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase">
                    {Math.round(doc.file_size / 1024)} KB
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 truncate mb-1">
                  {doc.original_filename}
                </h3>

                <div className="space-y-1 text-xs text-slate-500 mt-2">
                  {doc.customer_name && (
                    <p className="flex items-center gap-1.5 truncate">
                      <Building className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{doc.customer_name}</span>
                    </p>
                  )}
                  {doc.enquiry_title && (
                    <p className="flex items-center gap-1.5 truncate">
                      <Inbox className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{doc.enquiry_title}</span>
                    </p>
                  )}
                  <p className="text-[10px] text-slate-400 mt-1">
                    Uploaded by {doc.uploader_name || 'User'} on{' '}
                    {new Date(doc.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <a
                  href={`/api/v1/documents/${doc.id}/download`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>

                <button
                  onClick={() => {
                    setSelectedDoc(doc);
                    setDeleteConfirmOpen(true);
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                  title="Delete Document"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <Modal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title="Upload Document"
        description="Attach PDF, Word, Excel, or image files up to 10MB."
        maxWidth="md"
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Select File *
            </label>
            <input
              type="file"
              required
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setSelectedFile(e.target.files[0]);
                }
              }}
              className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Attach to Customer Account
            </label>
            <select
              value={uploadCustomerId}
              onChange={(e) => setUploadCustomerId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 transition bg-white"
            >
              <option value="">No Customer Link</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company_name} ({c.customer_name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Attach to Enquiry
            </label>
            <select
              value={uploadEnquiryId}
              onChange={(e) => setUploadEnquiryId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 transition bg-white"
            >
              <option value="">No Enquiry Link</option>
              {enquiries.map((enq) => (
                <option key={enq.id} value={enq.id}>
                  ENQ-#{enq.id}: {enq.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setUploadModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeleteSubmit}
        title="Delete Document"
        message={`Are you sure you want to delete '${selectedDoc?.original_filename}'?`}
        confirmText="Delete"
        isDangerous={true}
      />
    </div>
  );
};

export default DocumentsPage;
