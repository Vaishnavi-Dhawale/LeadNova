import React, { useState, useEffect } from 'react';
import {
  Send,
  FileText,
  History,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Copy,
  Users,
  Inbox
} from 'lucide-react';
import { emailsApi, customersApi, enquiriesApi } from '../services/api';
import { EmailTemplate, EmailHistory, Customer, Enquiry } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { Modal } from '../components/common/Modal';
import { Pagination } from '../components/common/Pagination';
import { TableSkeleton } from '../components/common/TableSkeleton';
import { EmptyState } from '../components/common/EmptyState';

export const EmailsPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const { success, error: toastError } = useToast();

  const [activeTab, setActiveTab] = useState<'compose' | 'templates' | 'history'>('compose');

  // Templates
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [templateFormData, setTemplateFormData] = useState({
    name: '',
    subject: '',
    body: '',
    category: 'General',
  });

  // Compose State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [composeData, setComposeData] = useState({
    recipient: '',
    subject: '',
    body: '',
    customer_id: '',
    enquiry_id: '',
    template_id: '',
  });
  const [sending, setSending] = useState(false);

  // History State
  const [historyList, setHistoryList] = useState<EmailHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);

  const fetchTemplates = async () => {
    try {
      const data = await emailsApi.getTemplates();
      setTemplates(data);
    } catch (e) {
      console.error('Failed to load templates', e);
    }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const data = await emailsApi.getHistory({ page: historyPage, page_size: 10 });
      setHistoryList(data.items);
      setHistoryTotal(data.total);
      setHistoryTotalPages(data.total_pages);
    } catch (e) {
      console.error('Failed to load history', e);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
    const loadDropdowns = async () => {
      try {
        const [cList, eList] = await Promise.all([
          customersApi.all(),
          enquiriesApi.list({ page_size: 100 }),
        ]);
        setCustomers(cList);
        setEnquiries(eList.items);
      } catch (err) {
        console.error(err);
      }
    };
    loadDropdowns();
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab, historyPage]);

  // Handle template selection in compose
  const handleSelectTemplate = (templateId: string) => {
    const tmpl = templates.find((t) => String(t.id) === templateId);
    if (tmpl) {
      setComposeData((prev) => ({
        ...prev,
        template_id: templateId,
        subject: tmpl.subject,
        body: tmpl.body,
      }));
    } else {
      setComposeData((prev) => ({ ...prev, template_id: '' }));
    }
  };

  // Handle customer selection in compose
  const handleSelectCustomer = (customerId: string) => {
    const cust = customers.find((c) => String(c.id) === customerId);
    if (cust) {
      setComposeData((prev) => ({
        ...prev,
        customer_id: customerId,
        recipient: cust.email,
        body: prev.body
          .replace(/{{customer_name}}/g, cust.customer_name)
          .replace(/{{company_name}}/g, cust.company_name),
        subject: prev.subject.replace(/{{company_name}}/g, cust.company_name),
      }));
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const payload: any = {
        recipient: composeData.recipient,
        subject: composeData.subject,
        body: composeData.body,
        customer_id: composeData.customer_id ? parseInt(composeData.customer_id) : null,
        enquiry_id: composeData.enquiry_id ? parseInt(composeData.enquiry_id) : null,
        template_id: composeData.template_id ? parseInt(composeData.template_id) : null,
      };

      await emailsApi.sendEmail(payload);
      success(`Email sent to ${composeData.recipient} successfully.`);
      setComposeData({
        recipient: '',
        subject: '',
        body: '',
        customer_id: '',
        enquiry_id: '',
        template_id: '',
      });
      if (activeTab === 'history') fetchHistory();
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  const handleOpenTemplateModal = (t?: EmailTemplate) => {
    if (t) {
      setSelectedTemplate(t);
      setTemplateFormData({
        name: t.name,
        subject: t.subject,
        body: t.body,
        category: t.category || 'General',
      });
    } else {
      setSelectedTemplate(null);
      setTemplateFormData({
        name: '',
        subject: '',
        body: '',
        category: 'General',
      });
    }
    setTemplateModalOpen(true);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedTemplate) {
        await emailsApi.updateTemplate(selectedTemplate.id, templateFormData);
        success('Template updated successfully.');
      } else {
        await emailsApi.createTemplate(templateFormData);
        success('Template created successfully.');
      }
      setTemplateModalOpen(false);
      fetchTemplates();
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Failed to save template');
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    try {
      await emailsApi.deleteTemplate(id);
      success('Template deleted.');
      fetchTemplates();
    } catch (err: any) {
      toastError('Failed to delete template');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Email Communications & Templates
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Compose client emails with dynamic templates, dispatch quotations, and inspect sent history.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('compose')}
          className={`pb-3 px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 ${
            activeTab === 'compose'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <Send className="w-3.5 h-3.5" />
          <span>Compose Email</span>
        </button>

        <button
          onClick={() => setActiveTab('templates')}
          className={`pb-3 px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 ${
            activeTab === 'templates'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Email Templates ({templates.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 ${
            activeTab === 'history'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Sent History</span>
        </button>
      </div>

      {/* Tab 1: Compose */}
      {activeTab === 'compose' && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-100 shadow-xs max-w-3xl">
          <form onSubmit={handleSendEmail} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Load Template (Optional)
                </label>
                <select
                  value={composeData.template_id}
                  onChange={(e) => handleSelectTemplate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 transition bg-white"
                >
                  <option value="">Select a Template</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Associate Customer
                </label>
                <select
                  value={composeData.customer_id}
                  onChange={(e) => handleSelectCustomer(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 transition bg-white"
                >
                  <option value="">Select Customer Account</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company_name} ({c.customer_name})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Recipient Email *
              </label>
              <input
                type="email"
                required
                value={composeData.recipient}
                onChange={(e) => setComposeData({ ...composeData, recipient: e.target.value })}
                placeholder="client@company.com"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Subject Line *
              </label>
              <input
                type="text"
                required
                value={composeData.subject}
                onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })}
                placeholder="e.g. Official Proposal for CNC Equipment"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Message Body *
              </label>
              <textarea
                rows={8}
                required
                value={composeData.body}
                onChange={(e) => setComposeData({ ...composeData, body: e.target.value })}
                placeholder="Compose your message here..."
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:border-indigo-600 transition"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Placeholders supported: <code>{"{{customer_name}}"}</code>, <code>{"{{company_name}}"}</code>, <code>{"{{title}}"}</code>
              </p>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-100">
              <button
                type="submit"
                disabled={sending}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{sending ? 'Sending...' : 'Send Email'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 2: Templates */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-xs text-slate-500">
              Reusable templates for commercial quotations, customer thank-yous, and automated follow-ups.
            </p>
            {isAdmin && (
              <button
                onClick={() => handleOpenTemplateModal()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Template</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((tmpl) => (
              <div
                key={tmpl.id}
                className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <span className="text-xs font-bold text-slate-900">{tmpl.name}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {tmpl.category}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-700 mb-2">{tmpl.subject}</p>
                  <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100 line-clamp-4 font-mono">
                    {tmpl.body}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <button
                    onClick={() => {
                      setComposeData((prev) => ({
                        ...prev,
                        template_id: String(tmpl.id),
                        subject: tmpl.subject,
                        body: tmpl.body,
                      }));
                      setActiveTab('compose');
                    }}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Use in Compose</span>
                  </button>

                  {isAdmin && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenTemplateModal(tmpl)}
                        className="p-1 rounded text-slate-400 hover:text-indigo-600"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(tmpl.id)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: History */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
          {historyLoading ? (
            <TableSkeleton rows={5} cols={5} />
          ) : historyList.length === 0 ? (
            <EmptyState
              icon={History}
              title="No Email History"
              description="Emails sent through LeadNova will appear in this log."
            />
          ) : (
            <div>
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-400 font-bold uppercase">
                  <tr>
                    <th className="py-3 px-6">Recipient & Subject</th>
                    <th className="py-3 px-6">Associated Customer</th>
                    <th className="py-3 px-6">Status</th>
                    <th className="py-3 px-6">Sent At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {historyList.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-50/80">
                      <td className="py-3.5 px-6">
                        <p className="font-bold text-slate-900">{h.subject}</p>
                        <p className="text-[11px] text-slate-400">To: {h.recipient}</p>
                      </td>
                      <td className="py-3.5 px-6 font-semibold text-slate-800">
                        {h.customer_name || 'N/A'}
                      </td>
                      <td className="py-3.5 px-6">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{h.status}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-slate-500">
                        {new Date(h.sent_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <Pagination
                currentPage={historyPage}
                totalPages={historyTotalPages}
                totalItems={historyTotal}
                pageSize={10}
                onPageChange={(p) => setHistoryPage(p)}
              />
            </div>
          )}
        </div>
      )}

      {/* Template Modal */}
      <Modal
        isOpen={templateModalOpen}
        onClose={() => setTemplateModalOpen(false)}
        title={selectedTemplate ? 'Edit Template' : 'Create Email Template'}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveTemplate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Template Name *
            </label>
            <input
              type="text"
              required
              value={templateFormData.name}
              onChange={(e) => setTemplateFormData({ ...templateFormData, name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Category
              </label>
              <select
                value={templateFormData.category}
                onChange={(e) => setTemplateFormData({ ...templateFormData, category: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 transition bg-white"
              >
                <option value="Quotation">Quotation</option>
                <option value="Follow-up">Follow-up</option>
                <option value="Thank You">Thank You</option>
                <option value="Enquiry Response">Enquiry Response</option>
                <option value="General">General</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Default Subject Line *
              </label>
              <input
                type="text"
                required
                value={templateFormData.subject}
                onChange={(e) => setTemplateFormData({ ...templateFormData, subject: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Body Template *
            </label>
            <textarea
              rows={6}
              required
              value={templateFormData.body}
              onChange={(e) => setTemplateFormData({ ...templateFormData, body: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:border-indigo-600 transition"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setTemplateModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition"
            >
              Save Template
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
