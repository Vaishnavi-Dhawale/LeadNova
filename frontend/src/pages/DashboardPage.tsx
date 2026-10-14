import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Inbox,
  Sparkles,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  AlertCircle,
  Users,
  Mail,
  UserCheck,
  TrendingUp,
  MapPin,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { analyticsApi } from '../services/api';
import { DashboardStats } from '../types';
import { LoadingSpinner } from '../components/common/TableSkeleton';
const STATUS_COLORS: Record<string, string> = {
  NEW: '#3b82f6',
  IN_PROGRESS: '#f59e0b',
  FOLLOW_UP: '#8b5cf6',
  CONVERTED: '#10b981',
  LOST: '#ef4444',
  CLOSED: '#64748b',
};

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      const data = await analyticsApi.getDashboard();
      setStats(data);
    } catch (err) {
      console.error('Failed to load dashboard metrics', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Enquiries',
      value: stats?.total_enquiries || 0,
      icon: Inbox,
      color: 'bg-indigo-50 text-indigo-600 border-indigo-100',
      action: () => navigate('/enquiries'),
    },
    {
      label: 'New Leads',
      value: stats?.new_leads || 0,
      icon: Sparkles,
      color: 'bg-sky-50 text-sky-600 border-sky-100',
      action: () => navigate('/enquiries?status=NEW'),
    },
    {
      label: 'In Progress',
      value: stats?.in_progress || 0,
      icon: Clock,
      color: 'bg-amber-50 text-amber-600 border-amber-100',
      action: () => navigate('/enquiries?status=IN_PROGRESS'),
    },
    {
      label: 'Converted',
      value: stats?.converted || 0,
      icon: CheckCircle2,
      color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      action: () => navigate('/enquiries?status=CONVERTED'),
    },
    {
      label: 'Lost',
      value: stats?.lost || 0,
      icon: XCircle,
      color: 'bg-rose-50 text-rose-600 border-rose-100',
      action: () => navigate('/enquiries?status=LOST'),
    },
    {
      label: 'Pending Follow-ups',
      value: stats?.pending_follow_ups || 0,
      icon: Calendar,
      color: 'bg-purple-50 text-purple-600 border-purple-100',
      action: () => navigate('/follow-ups?status=PENDING'),
    },
    {
      label: 'Overdue Follow-ups',
      value: stats?.overdue_follow_ups || 0,
      icon: AlertCircle,
      color: 'bg-red-50 text-red-600 border-red-100',
      badge: stats?.overdue_follow_ups ? 'Requires Action' : undefined,
      action: () => navigate('/follow-ups?filter_preset=overdue'),
    },
    {
      label: 'Active Customers',
      value: stats?.active_customers || 0,
      icon: Users,
      color: 'bg-blue-50 text-blue-600 border-blue-100',
      action: () => navigate('/customers'),
    },
    {
      label: 'Email Leads',
      value: stats?.email_leads || 0,
      icon: Mail,
      color: 'bg-teal-50 text-teal-600 border-teal-100',
      action: () => navigate('/email-leads'),
    },
    {
      label: 'Active Sales Reps',
      value: stats?.active_sales_users || 0,
      icon: UserCheck,
      color: 'bg-violet-50 text-violet-600 border-violet-100',
      action: () => navigate('/users'),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Executive Sales Dashboard
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time pipeline metrics aggregated directly from PostgreSQL database.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh Data</span>
          </button>
          <button
            onClick={() => navigate('/enquiries')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm shadow-indigo-600/20 transition"
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>View All Enquiries</span>
          </button>
        </div>
      </div>

      {/* 10 Stat Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              onClick={card.action}
              className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs hover:shadow-md hover:border-indigo-100 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  {card.label}
                </span>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${card.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight group-hover:text-indigo-600 transition">
                  {card.value}
                </span>
                {card.badge && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-600 border border-rose-200">
                    {card.badge}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Required Quick Navigation Section */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 rounded-2xl text-white shadow-sm border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-white">Action Required</h3>
              <p className="text-xs text-slate-300">Urgent operational priorities requiring immediate sales rep action</p>
            </div>
          </div>
          <span className="text-[11px] font-medium text-slate-300 bg-white/10 px-2.5 py-1 rounded-full w-fit">
            Live Telemetry
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3.5">
          <div
            onClick={() => navigate('/email-leads?status=NEW')}
            className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-sky-500/40 transition cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white group-hover:text-sky-300 transition">New Email Leads</p>
                <p className="text-[11px] text-slate-400">Unprocessed incoming leads</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-base font-extrabold ${(stats?.new_email_leads || 0) > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                {stats?.new_email_leads ?? 0}
              </span>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 group-hover:text-white transition" />
            </div>
          </div>

          <div
            onClick={() => navigate('/follow-ups?filter_preset=overdue')}
            className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-rose-500/40 transition cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white group-hover:text-rose-300 transition">Overdue Follow-ups</p>
                <p className="text-[11px] text-slate-400">Past scheduled contact date</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-base font-extrabold ${(stats?.overdue_follow_ups || 0) > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                {stats?.overdue_follow_ups ?? 0}
              </span>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 group-hover:text-white transition" />
            </div>
          </div>

          <div
            onClick={() => navigate('/enquiries')}
            className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-500/40 transition cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white group-hover:text-amber-300 transition">High Priority Enquiries</p>
                <p className="text-[11px] text-slate-400">High & Urgent active pipeline</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-base font-extrabold ${(stats?.high_priority_enquiries || 0) > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                {stats?.high_priority_enquiries ?? 0}
              </span>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 group-hover:text-white transition" />
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Enquiry Volume & Pipeline Value */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Monthly Enquiry Volume & Pipeline Value
            </h3>
            <p className="text-xs text-slate-400">Total enquiries created month-over-month</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-indigo-600 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
              Enquiries
            </span>
          </div>
        </div>
        <div className="h-64 sm:h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={stats?.monthly_enquiry_trend || []}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(value: any, name: any) => [
                  name === 'enquiries' ? `${value} Enquiries` : `₹${Number(value).toLocaleString()}`,
                  name === 'enquiries' ? 'Volume' : 'Value',
                ]}
                contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="enquiries" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={45} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Secondary Tables & Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Rep Performance */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                Sales User Performance
              </h3>
              <p className="text-xs text-slate-400">Assigned enquiries and closed conversions</p>
            </div>
            <button
              onClick={() => navigate('/users')}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
            >
              Manage Users
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {(stats?.sales_user_performance || []).map((user) => (
              <div key={user.user_id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 font-bold text-xs flex items-center justify-center">
                    {user.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">{user.name}</p>
                    <p className="text-[11px] text-slate-400">{user.enquiries} Enquiries assigned</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-emerald-600">
                    {user.converted} Converted
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium">
                    ₹{user.revenue.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Territory Performance */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <MapPin className="w-4 h-4 text-indigo-600" />
                Territory Breakdown
              </h3>
              <p className="text-xs text-slate-400">Regional demand distribution</p>
            </div>
            <button
              onClick={() => navigate('/territories')}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
            >
              View Territories
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {(stats?.territory_performance || []).map((t) => (
              <div key={t.territory_id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 text-slate-600 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">{t.name}</p>
                    <p className="text-[11px] text-slate-400">{t.enquiries} total enquiries</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-900">
                    ₹{t.total_value.toLocaleString('en-IN')}
                  </p>
                  <p className="text-[10px] text-slate-400">Pipeline Value</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
