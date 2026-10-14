import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Inbox,
  FileText,
  Clock,
  Send,
  Plus,
  History,
  Download,
  CheckCircle2
} from 'lucide-react';
import { customersApi, followUpsApi, enquiriesApi } from '../services/api';
import { CustomerDetail } from '../types';
import { StatusBadge, PriorityBadge } from '../components/common/Badge';
import { LoadingSpinner } from '../components/common/TableSkeleton';
import { EmptyState } from '../components/common/EmptyState';
import { useToast } from '../components/common/Toast';

export const CustomerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'enquiries' | 'follow_ups' | 'documents' | 'emails' | 'activity'>('overview');

  const fetchCustomer = async () => {
    if (!id) return;
    try {
      const data = await customersApi.get(parseInt(id));
      setCustomer(data);
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Failed to load customer details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomer();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!customer) {
    return (
      <EmptyState
        icon={Building}
        title="Customer Not Found"
        description="The customer you are looking for does not exist or was removed."
        actionText="Back to Customers"
        onAction={() => navigate('/customers')}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
        <button
          onClick={() => navigate('/customers')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 mb-4 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Customers</span>
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 font-extrabold text-xl flex items-center justify-center">
              {customer.company_name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {customer.company_name}
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {customer.industry || 'Client'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Primary Contact: <span className="font-semibold text-slate-700">{customer.customer_name}</span> • Territory: <span className="font-semibold text-indigo-600">{customer.territory_name || 'General'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => navigate(`/enquiries?customer_id=${customer.id}`)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Enquiry</span>
            </button>
            <button
              onClick={() => navigate(`/emails`)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Email</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-6 border-t border-slate-100 pt-4 overflow-x-auto">
          {[
            { key: 'overview', label: 'Overview', icon: Building },
            { key: 'enquiries', label: `Enquiries (${customer.enquiries.length})`, icon: Inbox },
            { key: 'follow_ups', label: `Follow-ups (${customer.follow_ups.length})`, icon: Calendar },
            { key: 'documents', label: `Documents (${customer.documents.length})`, icon: FileText },
            { key: 'emails', label: `Emails (${customer.email_history.length})`, icon: Mail },
            { key: 'activity', label: 'Activity Trail', icon: History },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  active
                    ? 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Contact & Location Info */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Mail className="w-4 h-4 text-indigo-600" />
              <span>Contact & Address</span>
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400 font-semibold">Email:</span>
                <span className="font-semibold text-slate-800">{customer.email}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400 font-semibold">Phone:</span>
                <span className="font-semibold text-slate-800">{customer.phone}</span>
              </div>
              {customer.alternate_phone && (
                <div className="flex justify-between py-1.5 border-b border-slate-50">
                  <span className="text-slate-400 font-semibold">Alt Phone:</span>
                  <span className="font-semibold text-slate-800">{customer.alternate_phone}</span>
                </div>
              )}
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400 font-semibold">City:</span>
                <span className="font-semibold text-slate-800">{customer.city || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400 font-semibold">State / Region:</span>
                <span className="font-semibold text-slate-800">{customer.state || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400 font-semibold">Country:</span>
                <span className="font-semibold text-slate-800">{customer.country || 'India'}</span>
              </div>
              {customer.address && (
                <div className="py-1.5">
                  <span className="text-slate-400 font-semibold block mb-1">Full Address:</span>
                  <p className="text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    {customer.address}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* CRM Account Details */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Building className="w-4 h-4 text-indigo-600" />
              <span>CRM Classification</span>
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400 font-semibold">Industry:</span>
                <span className="font-semibold text-slate-800">{customer.industry || 'General Industry'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400 font-semibold">Lead Source:</span>
                <span className="font-semibold text-slate-800">{customer.source || 'Website'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400 font-semibold">Sales Territory:</span>
                <span className="font-semibold text-indigo-600">{customer.territory_name || 'Unassigned'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400 font-semibold">Created By:</span>
                <span className="font-semibold text-slate-800">{customer.creator_name || 'System / Admin'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400 font-semibold">Registered Date:</span>
                <span className="font-semibold text-slate-800">{new Date(customer.created_at).toLocaleDateString()}</span>
              </div>
              {customer.notes && (
                <div className="py-1.5">
                  <span className="text-slate-400 font-semibold block mb-1">Account Notes:</span>
                  <p className="text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    {customer.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Enquiries Tab */}
      {activeTab === 'enquiries' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
          {customer.enquiries.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No enquiries recorded for this customer yet.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-400 font-bold uppercase">
                <tr>
                  <th className="py-3 px-6">Enquiry Title</th>
                  <th className="py-3 px-6">Category</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6">Priority</th>
                  <th className="py-3 px-6">Est. Value</th>
                  <th className="py-3 px-6">Assigned To</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customer.enquiries.map((e) => (
                  <tr
                    key={e.id}
                    onClick={() => navigate(`/enquiries/${e.id}`)}
                    className="hover:bg-slate-50 cursor-pointer"
                  >
                    <td className="py-3.5 px-6 font-bold text-slate-900">{e.title}</td>
                    <td className="py-3.5 px-6 text-slate-600">{e.category_name || 'N/A'}</td>
                    <td className="py-3.5 px-6">
                      <StatusBadge status={e.status} />
                    </td>
                    <td className="py-3.5 px-6">
                      <PriorityBadge priority={e.priority} />
                    </td>
                    <td className="py-3.5 px-6 font-bold text-slate-900">
                      ₹{e.estimated_value.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-6 text-slate-600">{e.assigned_to_name || 'Unassigned'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Follow-ups Tab */}
      {activeTab === 'follow_ups' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6">
          {customer.follow_ups.length === 0 ? (
            <div className="text-center text-xs text-slate-500 py-6">
              No follow-ups scheduled for this customer.
            </div>
          ) : (
            <div className="space-y-3">
              {customer.follow_ups.map((f) => (
                <div
                  key={f.id}
                  className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xs">
                      {f.follow_up_type}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{f.notes || 'Routine Follow-up'}</p>
                      <p className="text-[11px] text-slate-400">
                        Date: {new Date(f.follow_up_date).toLocaleString()} • Assigned: {f.assigned_to_name || 'Sales Rep'}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={f.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Documents Tab */}
      {activeTab === 'documents' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6">
          {customer.documents.length === 0 ? (
            <div className="text-center text-xs text-slate-500 py-6">
              No documents or KYC uploaded for this customer.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {customer.documents.map((d) => (
                <div
                  key={d.id}
                  className="p-4 rounded-xl border border-slate-100 bg-slate-50/60 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 truncate">
                    <FileText className="w-6 h-6 text-indigo-600 flex-shrink-0" />
                    <div className="truncate">
                      <p className="text-xs font-bold text-slate-900 truncate">{d.original_filename}</p>
                      <p className="text-[10px] text-slate-400">{Math.round(d.file_size / 1024)} KB</p>
                    </div>
                  </div>
                  <a
                    href={`/api/v1/documents/${d.id}/download`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Emails Tab */}
      {activeTab === 'emails' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6">
          {customer.email_history.length === 0 ? (
            <div className="text-center text-xs text-slate-500 py-6">
              No email communications logged for this account.
            </div>
          ) : (
            <div className="space-y-3">
              {customer.email_history.map((em) => (
                <div key={em.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/40">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-bold text-slate-900">{em.subject}</p>
                    <span className="text-[11px] text-slate-400">{new Date(em.sent_at).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2">{em.body}</p>
                  <div className="mt-2 text-[10px] text-slate-400 font-semibold">
                    To: {em.recipient} • Status: {em.status}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Activity Tab */}
      {activeTab === 'activity' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6">
          {customer.activity.length === 0 ? (
            <div className="text-center text-xs text-slate-500 py-6">
              No activity logs recorded.
            </div>
          ) : (
            <div className="space-y-4">
              {customer.activity.map((act) => (
                <div key={act.id} className="flex items-start gap-3 text-xs">
                  <div className="w-2 h-2 rounded-full bg-indigo-600 mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-slate-800">{act.description}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      By {act.user_name} on {new Date(act.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
