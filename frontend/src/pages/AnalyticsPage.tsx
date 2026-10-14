import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  DollarSign,
  TrendingUp,
  Award,
  Layers,
  MapPin,
  Calendar,
  XCircle,
  RefreshCw
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { analyticsApi, categoriesApi, territoriesApi, usersApi } from '../services/api';
import { AnalyticsMetrics, Category, Territory, User } from '../types';
import { LoadingSpinner } from '../components/common/TableSkeleton';

const PIE_COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

export const AnalyticsPage: React.FC = () => {
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  // Filter options
  const [categories, setCategories] = useState<Category[]>([]);
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [salesUsers, setSalesUsers] = useState<User[]>([]);

  // Filter state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [salesUserId, setSalesUserId] = useState('');
  const [territoryId, setTerritoryId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState('');
  const [source, setSource] = useState('');

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (startDate) params.start_date = new Date(startDate).toISOString();
      if (endDate) params.end_date = new Date(endDate).toISOString();
      if (salesUserId) params.sales_user_id = parseInt(salesUserId);
      if (territoryId) params.territory_id = parseInt(territoryId);
      if (categoryId) params.category_id = parseInt(categoryId);
      if (status) params.status = status;
      if (source) params.source = source;

      const data = await analyticsApi.getReport(params);
      setMetrics(data);
    } catch (e) {
      console.error('Failed to load analytics', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [startDate, endDate, salesUserId, territoryId, categoryId, status, source]);

  useEffect(() => {
    const loadFilters = async () => {
      try {
        const [cList, tList, uList] = await Promise.all([
          categoriesApi.all(),
          territoriesApi.all(),
          usersApi.list({ page_size: 100 }),
        ]);
        setCategories(cList);
        setTerritories(tList);
        setSalesUsers(uList.items);
      } catch (e) {
        console.error(e);
      }
    };
    loadFilters();
  }, []);

  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
    setSalesUserId('');
    setTerritoryId('');
    setCategoryId('');
    setStatus('');
    setSource('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Sales Analytics & Reports
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time pipeline analytics, conversion velocity, and performance breakdown by sales rep and region.
          </p>
        </div>
        <button
          onClick={handleClearFilters}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold shadow-2xs transition"
        >
          <XCircle className="w-3.5 h-3.5" />
          <span>Reset Filters</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 transition"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 transition"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Sales Rep</label>
            <select
              value={salesUserId}
              onChange={(e) => setSalesUserId(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 transition bg-white"
            >
              <option value="">All Reps</option>
              {salesUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Territory</label>
            <select
              value={territoryId}
              onChange={(e) => setTerritoryId(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 transition bg-white"
            >
              <option value="">All Territories</option>
              {territories.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 transition bg-white"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 transition bg-white"
            >
              <option value="">All Statuses</option>
              <option value="NEW">NEW</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="FOLLOW_UP">FOLLOW_UP</option>
              <option value="CONVERTED">CONVERTED</option>
              <option value="LOST">LOST</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Total Enquiries
              </span>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {metrics?.total_enquiries || 0}
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                Converted (Won)
              </span>
              <p className="text-2xl font-black text-emerald-600 mt-1">
                {metrics?.converted || 0}
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
              <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">
                Lost
              </span>
              <p className="text-2xl font-black text-rose-600 mt-1">
                {metrics?.lost || 0}
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
              <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">
                In Pipeline
              </span>
              <p className="text-2xl font-black text-amber-600 mt-1">
                {metrics?.pending || 0}
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                Conversion Rate
              </span>
              <p className="text-2xl font-black text-indigo-600 mt-1">
                {metrics?.conversion_rate || 0}%
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs lg:col-span-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Won Revenue Value
              </span>
              <p className="text-2xl font-black text-slate-900 mt-1">
                ₹{(metrics?.converted_pipeline_value || 0).toLocaleString('en-IN')}
              </p>
            </div>
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Territory Performance */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight mb-1">
                Territory Revenue Breakdown
              </h3>
              <p className="text-xs text-slate-400 mb-4">Pipeline revenue distribution across regions</p>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics?.territory_wise || []} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      formatter={(v: any) => [`₹${Number(v).toLocaleString()}`, 'Pipeline Value']}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                    />
                    <Bar dataKey="value" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={45} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Category Performance */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight mb-1">
                Category Volume Distribution
              </h3>
              <p className="text-xs text-slate-400 mb-4">Enquiries by machinery and product category</p>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics?.category_wise || []} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      formatter={(v: any) => [`${v} Enquiries`, 'Volume']}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                    />
                    <Bar dataKey="count" fill="#06b6d4" radius={[6, 6, 0, 0]} maxBarSize={45} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Charts Row 2: Sales Rep & Sources */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales Rep Comparison */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight mb-1">
                Sales Representative Comparison
              </h3>
              <p className="text-xs text-slate-400 mb-4">Total opportunities handled per team member</p>
              <div className="divide-y divide-slate-100">
                {(metrics?.sales_user_wise || []).map((rep, idx) => (
                  <div key={idx} className="py-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center">
                        {rep.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{rep.name}</p>
                        <p className="text-[11px] text-slate-400">{rep.count} deals assigned</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900">
                        ₹{rep.value.toLocaleString('en-IN')}
                      </p>
                      <p className="text-[10px] text-slate-400">Total Value</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Source Distribution */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight mb-1">
                Acquisition Channel Performance
              </h3>
              <p className="text-xs text-slate-400 mb-4">Source channels driving inbound inquiries</p>
              <div className="divide-y divide-slate-100">
                {(metrics?.source_wise || []).map((src, idx) => (
                  <div key={idx} className="py-3 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">{src.name}</span>
                    <div className="text-right">
                      <span className="font-bold text-indigo-600">{src.count} Enquiries</span>
                      <span className="text-[11px] text-slate-400 ml-3">
                        (₹{src.value.toLocaleString('en-IN')})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AnalyticsPage;
