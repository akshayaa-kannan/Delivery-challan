import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  FileText, 
  Calendar, 
  TrendingUp, 
  TrendingDown,
  Hash, 
  Plus, 
  Eye, 
  Edit, 
  Printer, 
  Download, 
  Trash2,
  Ban,
  RotateCcw,
  Users,
  Building,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  Truck,
  Boxes,
  Clock,
  CheckCircle2,
  RefreshCw,
  ArrowUpRight,
  Package,
  ChevronRight,
  Filter,
  BarChart,
  ArrowRight
} from 'lucide-react';
import { 
  getChallans, 
  deleteChallan, 
  updateChallan,
  getDashboardAnalytics,
  DATE_PRESETS,
  getDateRangeBounds,
  formatDateISO,
  generateCSVString
} from '../utils/storage';
import { formatCurrency } from '../utils/calculations';
import { useAuth } from '../context/AuthContext';
import ConfirmDialog from '../components/ConfirmDialog';

export default function Dashboard({ triggerDirectPrint, triggerPdfDownload, onOpenSubscription }) {
  const navigate = useNavigate();
  const { currentCompany, role, isStaff, isAdmin, subscription, isSubscriptionActive } = useAuth();
  
  // Date filter state (persists in session)
  const [datePreset, setDatePreset] = useState(() => {
    return sessionStorage.getItem('nayaruvi_dash_preset') || DATE_PRESETS.THIS_MONTH;
  });
  const [customStartDate, setCustomStartDate] = useState(() => {
    return sessionStorage.getItem('nayaruvi_dash_start') || '';
  });
  const [customEndDate, setCustomEndDate] = useState(() => {
    return sessionStorage.getItem('nayaruvi_dash_end') || '';
  });

  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Dialog states
  const [deleteId, setDeleteId] = useState(null);
  const [deleteNo, setDeleteNo] = useState('');

  // Tooltip state for chart hover
  const [activeTooltip, setActiveTooltip] = useState(null);

  // Load Dashboard Data
  const loadDashboard = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const data = await getDashboardAnalytics({
        preset: datePreset,
        startDate: customStartDate || undefined,
        endDate: customEndDate || undefined
      });
      setAnalytics(data);
      setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.error("Error loading dashboard analytics:", err);
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [datePreset, customStartDate, customEndDate, currentCompany?.id]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Persist date preset
  const handlePresetChange = (newPreset) => {
    setDatePreset(newPreset);
    sessionStorage.setItem('nayaruvi_dash_preset', newPreset);
  };

  const handleCustomStartChange = (val) => {
    setCustomStartDate(val);
    sessionStorage.setItem('nayaruvi_dash_start', val);
  };

  const handleCustomEndChange = (val) => {
    setCustomEndDate(val);
    sessionStorage.setItem('nayaruvi_dash_end', val);
  };

  // Export Dashboard Summary CSV
  const handleExportCSV = () => {
    if (!analytics) return;
    const kpi = analytics.kpi;
    const columns = [
      { key: 'metric', label: 'Dashboard Metric' },
      { key: 'value', label: 'Value' },
      { key: 'notes', label: 'Period / Scope' }
    ];
    const rows = [
      { metric: 'Date Range', value: analytics.range.label, notes: `${analytics.range.startDate} to ${analytics.range.endDate}` },
      { metric: 'Total Challans Created', value: kpi.totalChallans, notes: `Change: ${kpi.totalChallansChange}% vs prev period` },
      { metric: 'Draft Challans', value: kpi.draftsCount, notes: 'Saved unfinalized drafts' },
      { metric: 'Pending Deliveries', value: kpi.pendingDeliveries, notes: 'Dispatched & in-transit shipments' },
      { metric: 'Delivered Challans', value: kpi.deliveredChallans, notes: `Completion Rate: ${kpi.deliveryCompletionRate}%` },
      { metric: 'Overdue Deliveries', value: kpi.overdueDeliveries, notes: 'Shipments past expected delivery date' },
      { metric: 'Outstanding Returnable Challans', value: kpi.outstandingReturnablesCount, notes: 'Challans with pending returns' },
      { metric: 'Overdue Returnable Items', value: kpi.overdueReturnItemsCount, notes: 'Items past expected return date' },
      { metric: 'Tracked Inventory Products', value: kpi.inventoryTrackedProducts, notes: 'Catalog products' },
      { metric: 'Low Stock Products', value: kpi.lowStockCount, notes: 'At or below reorder threshold' },
      { metric: 'Out of Stock Products', value: kpi.outOfStockCount, notes: 'Zero on-hand balance' },
      { metric: 'Active Customers', value: kpi.activeCustomers, notes: `New in period: ${kpi.newCustomers}` },
      { metric: 'Active Products', value: kpi.activeProducts, notes: `New in period: ${kpi.newProducts}` }
    ];

    const csvContent = generateCSVString(columns, rows);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Nayaruvi_Dashboard_Summary_${formatDateISO(new Date())}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleEdit = (id) => {
    navigate(`/edit/${id}`);
  };

  const handleOpenDelete = (id, challanNo) => {
    setDeleteId(id);
    setDeleteNo(challanNo);
  };

  const handleConfirmDelete = async () => {
    if (deleteId) {
      await deleteChallan(deleteId);
      await loadDashboard(true);
      setDeleteId(null);
      setDeleteNo('');
    }
  };

  const getCustomerName = (custString) => {
    if (!custString) return '';
    return custString.split('\n')[0];
  };

  const kpi = analytics?.kpi;
  const range = analytics?.range;

  // Chart data calculations
  const maxTrendCount = useMemo(() => {
    if (!analytics?.creationTrend || analytics.creationTrend.length === 0) return 1;
    return Math.max(1, ...analytics.creationTrend.map(t => t.count));
  }, [analytics?.creationTrend]);

  return (
    <div className="space-y-6 animate-fade-in font-sans text-slate-800 pb-12">
      {/* 1. Subscription Alert Banner if expired */}
      {!isSubscriptionActive && (
        <div className="p-4 bg-amber-500/15 border border-amber-500/40 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle size={22} className="text-amber-500 shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-slate-800">Subscription Required</h4>
              <p className="text-xs text-slate-600">Your free trial has ended. Subscribe to maintain real-time cloud sync and create new delivery challans.</p>
            </div>
          </div>
          <button
            onClick={onOpenSubscription}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md cursor-pointer shrink-0"
          >
            Renew Now (₹500/mo)
          </button>
        </div>
      )}

      {/* 2. Workspace & Operational Summary Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {currentCompany?.displayName || currentCompany?.legalName || "Delivery Challan Dashboard"}
            </h1>
            <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              {subscription?.planName || "Trial"}
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500 mt-1 flex flex-wrap items-center gap-2">
            <span>Operational overview for <strong className="text-slate-700">{range?.label || 'This Month'}</strong></span>
            <span>•</span>
            <span>GSTIN: <span className="font-semibold text-slate-700">{currentCompany?.gstin || "N/A"}</span></span>
            {lastUpdated && (
              <>
                <span>•</span>
                <span className="text-slate-400">Updated: {lastUpdated}</span>
              </>
            )}
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          <button
            onClick={() => loadDashboard(true)}
            disabled={refreshing || loading}
            className="p-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh Dashboard"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin text-amber-500' : ''} />
          </button>

          <button
            onClick={handleExportCSV}
            disabled={loading || !analytics}
            className="flex items-center gap-1.5 px-3.5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-50"
            title="Export Summary CSV"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>

          <Link
            to="/reports"
            className="flex items-center gap-1.5 px-3.5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs transition-colors"
          >
            <BarChart size={14} />
            <span>Reports Centre</span>
          </Link>

          {isStaff && (
            <Link
              to="/new"
              className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md shadow-amber-500/10 cursor-pointer"
            >
              <Plus size={16} />
              <span>Create Challan</span>
            </Link>
          )}
        </div>
      </div>

      {/* 3. Date-Range Filter Control Bar */}
      <div className="bg-slate-900 text-white p-3.5 sm:p-4 rounded-2xl border border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0 flex items-center gap-1.5 mr-1">
            <Calendar size={13} className="text-amber-400" /> Period:
          </span>
          {[
            { id: DATE_PRESETS.TODAY, label: 'Today' },
            { id: DATE_PRESETS.LAST_7_DAYS, label: 'Last 7 Days' },
            { id: DATE_PRESETS.THIS_MONTH, label: 'This Month' },
            { id: DATE_PRESETS.PREV_MONTH, label: 'Prev Month' },
            { id: DATE_PRESETS.THIS_QUARTER, label: 'Quarter' },
            { id: DATE_PRESETS.THIS_YEAR, label: 'This Year' },
            { id: DATE_PRESETS.CUSTOM, label: 'Custom' }
          ].map(p => (
            <button
              key={p.id}
              onClick={() => handlePresetChange(p.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                datePreset === p.id 
                  ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/20' 
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom Date Pickers */}
        {datePreset === DATE_PRESETS.CUSTOM && (
          <div className="flex items-center gap-2 shrink-0 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700/60">
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => handleCustomStartChange(e.target.value)}
              className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              value={customEndDate}
              min={customStartDate}
              onChange={(e) => handleCustomEndChange(e.target.value)}
              className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        )}

        <div className="text-[11px] font-mono text-slate-400 shrink-0 text-right">
          Active: <span className="text-amber-400 font-bold">{range?.startDate || '—'}</span> to <span className="text-amber-400 font-bold">{range?.endDate || '—'}</span>
        </div>
      </div>

      {/* 4. Actionable Alerts / "Needs Attention" Banner */}
      {analytics?.alerts && analytics.alerts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <AlertTriangle size={14} className="text-amber-500" /> Operational Attention Required
            </h3>
            <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
              {analytics.alerts.length} Action Item{analytics.alerts.length > 1 ? 's' : ''}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {analytics.alerts.map((alert) => (
              <div 
                key={alert.id}
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                  alert.type === 'critical'
                    ? 'bg-red-50/70 border-red-200/80 text-red-950'
                    : alert.type === 'warning'
                    ? 'bg-amber-50/70 border-amber-200/80 text-amber-950'
                    : 'bg-blue-50/70 border-blue-200/80 text-blue-950'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs font-bold leading-tight flex items-center gap-1.5">
                      {alert.type === 'critical' ? (
                        <AlertCircle size={14} className="text-red-600 shrink-0" />
                      ) : (
                        <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                      )}
                      <span>{alert.title}</span>
                    </h4>
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded font-mono ${
                      alert.type === 'critical' ? 'bg-red-200 text-red-900' : 'bg-amber-200 text-amber-900'
                    }`}>
                      {alert.count}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                    {alert.description}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-medium">Click to resolve</span>
                  <Link
                    to={alert.actionUrl}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 hover:underline"
                  >
                    <span>{alert.actionText}</span>
                    <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Key Performance Indicator Cards (8 Actionable Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Challans */}
        <div 
          onClick={() => navigate('/challans')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Total Challans</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileText size={18} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 font-mono tracking-tight">
                {kpi ? kpi.totalChallans : '—'}
              </span>
              {kpi && kpi.totalChallansChange !== undefined && (
                <span className={`text-[11px] font-bold flex items-center gap-0.5 ${
                  kpi.totalChallansChange >= 0 ? 'text-emerald-600' : 'text-red-500'
                }`}>
                  {kpi.totalChallansChange >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  <span>{kpi.totalChallansChange > 0 ? `+${kpi.totalChallansChange}%` : `${kpi.totalChallansChange}%`}</span>
                </span>
              )}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Drafts: <strong className="text-slate-800">{kpi?.draftsCount || 0}</strong></span>
            <span className="text-blue-600 font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
              View All <ArrowUpRight size={12} />
            </span>
          </div>
        </div>

        {/* Card 2: Pending Deliveries */}
        <div 
          onClick={() => navigate('/deliveries?status=DISPATCHED')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Pending Deliveries</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Truck size={18} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 font-mono tracking-tight">
                {kpi ? kpi.pendingDeliveries : '—'}
              </span>
              <span className="text-[11px] font-semibold text-slate-500">in transit</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Active Shipments</span>
            <span className="text-amber-600 font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
              Track <ArrowUpRight size={12} />
            </span>
          </div>
        </div>

        {/* Card 3: Delivered Challans */}
        <div 
          onClick={() => navigate('/deliveries?status=DELIVERED')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Delivered</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <CheckCircle2 size={18} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 font-mono tracking-tight">
                {kpi ? kpi.deliveredChallans : '—'}
              </span>
              {kpi && (
                <span className="text-[11px] font-bold text-emerald-600">
                  {kpi.deliveryCompletionRate}% rate
                </span>
              )}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Completed deliveries</span>
            <span className="text-emerald-600 font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
              Review <ArrowUpRight size={12} />
            </span>
          </div>
        </div>

        {/* Card 4: Overdue Deliveries */}
        <div 
          onClick={() => navigate('/deliveries?status=DELAYED')}
          className={`p-5 rounded-2xl border shadow-sm transition-all cursor-pointer group flex flex-col justify-between ${
            kpi?.overdueDeliveries > 0
              ? 'bg-red-50/50 border-red-300 hover:border-red-500 hover:shadow-md'
              : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Overdue Deliveries</span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform ${
                kpi?.overdueDeliveries > 0 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'
              }`}>
                <Clock size={18} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className={`text-3xl font-black font-mono tracking-tight ${
                kpi?.overdueDeliveries > 0 ? 'text-red-600' : 'text-slate-900'
              }`}>
                {kpi ? kpi.overdueDeliveries : '—'}
              </span>
              <span className="text-[11px] font-semibold text-slate-500">past expected date</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>{kpi?.overdueDeliveries > 0 ? 'Requires attention' : 'All on schedule'}</span>
            <span className="text-red-600 font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
              Details <ArrowUpRight size={12} />
            </span>
          </div>
        </div>

        {/* Card 5: Outstanding Returnable Goods */}
        <div 
          onClick={() => navigate('/returnable-goods?status=AWAITING_RETURN')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:border-purple-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Returnable Goods</span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <RotateCcw size={18} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 font-mono tracking-tight">
                {kpi ? kpi.outstandingReturnablesCount : '—'}
              </span>
              <span className="text-[11px] font-semibold text-slate-500">challans pending</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Overdue: <strong className={kpi?.overdueReturnItemsCount > 0 ? 'text-red-600' : 'text-slate-700'}>{kpi?.overdueReturnItemsCount || 0}</strong></span>
            <span className="text-purple-600 font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
              Track <ArrowUpRight size={12} />
            </span>
          </div>
        </div>

        {/* Card 6: Inventory Status */}
        <div 
          onClick={() => navigate('/inventory?filter=LOW_STOCK')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Inventory Status</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Boxes size={18} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 font-mono tracking-tight">
                {kpi ? kpi.inventoryTrackedProducts : '—'}
              </span>
              <span className="text-[11px] font-semibold text-slate-500">products</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Low Stock: <strong className={kpi?.lowStockCount > 0 ? 'text-amber-600' : 'text-slate-700'}>{kpi?.lowStockCount || 0}</strong></span>
            <span className="text-indigo-600 font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
              Stock <ArrowUpRight size={12} />
            </span>
          </div>
        </div>

        {/* Card 7: Registered Customers */}
        <div 
          onClick={() => navigate('/customers')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:border-slate-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Customers</span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users size={18} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 font-mono tracking-tight">
                {kpi ? kpi.activeCustomers : '—'}
              </span>
              <span className="text-[11px] font-semibold text-slate-500">active</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>New in period: <strong className="text-slate-800">{kpi?.newCustomers || 0}</strong></span>
            <span className="text-slate-700 font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
              Directory <ArrowUpRight size={12} />
            </span>
          </div>
        </div>

        {/* Card 8: Product Master */}
        <div 
          onClick={() => navigate('/products')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:border-slate-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Catalog Products</span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Package size={18} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 font-mono tracking-tight">
                {kpi ? kpi.activeProducts : '—'}
              </span>
              <span className="text-[11px] font-semibold text-slate-500">items</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>New in period: <strong className="text-slate-800">{kpi?.newProducts || 0}</strong></span>
            <span className="text-slate-700 font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
              Catalog <ArrowUpRight size={12} />
            </span>
          </div>
        </div>
      </div>

      {/* 6. Challan Analytics: Trend & Status Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Bar Chart */}
        <div className="lg:col-span-2 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800">Challan Creation Trend</h3>
              <p className="text-xs text-slate-400">Number of challans generated across selected period</p>
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              Total: {kpi?.totalChallans || 0}
            </span>
          </div>

          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <div className="animate-spin h-6 w-6 border-2 border-amber-500 border-t-transparent rounded-full" />
            </div>
          ) : !analytics?.creationTrend || analytics.creationTrend.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-slate-400 text-xs">
              <Calendar size={28} className="opacity-20 mb-1" />
              <span>No activity recorded in this period</span>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="h-48 flex items-end gap-1 sm:gap-2 pt-6 px-2 relative">
                {analytics.creationTrend.map((t, idx) => {
                  const heightPercent = maxTrendCount > 0 ? (t.count / maxTrendCount) * 100 : 0;
                  return (
                    <div 
                      key={idx}
                      className="flex-1 flex flex-col items-center h-full justify-end group relative"
                      onMouseEnter={() => setActiveTooltip(t)}
                      onMouseLeave={() => setActiveTooltip(null)}
                      onClick={() => navigate(`/challans?date=${t.date}`)}
                    >
                      {/* Bar */}
                      <div 
                        style={{ height: `${Math.max(4, heightPercent)}%` }}
                        className={`w-full rounded-t transition-all cursor-pointer ${
                          t.count > 0 ? 'bg-amber-500 group-hover:bg-amber-600 shadow-sm' : 'bg-slate-100'
                        }`}
                      />
                      {/* X-axis label */}
                      <span className="text-[9px] font-mono text-slate-400 truncate w-full text-center mt-1">
                        {t.label}
                      </span>

                      {/* Tooltip */}
                      {activeTooltip?.date === t.date && (
                        <div className="absolute -top-10 z-20 bg-slate-900 text-white text-[10px] py-1 px-2 rounded shadow-lg whitespace-nowrap pointer-events-none font-sans">
                          <strong className="text-amber-400">{t.count}</strong> challan(s) on {t.date}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-100">
                <span>Click any day to filter challans</span>
                <span>Peak: {maxTrendCount} challans/day</span>
              </div>
            </div>
          )}
        </div>

        {/* Status Distribution Donut Chart */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800">Status Distribution</h3>
                <p className="text-xs text-slate-400">Lifecycle state breakdown</p>
              </div>
            </div>

            {/* Status Bars */}
            <div className="space-y-3 mt-4">
              {(analytics?.statusDistribution || []).map((s) => {
                const total = kpi?.totalChallans || 1;
                const percent = total > 0 ? Math.round((s.count / total) * 100) : 0;
                return (
                  <div 
                    key={s.status}
                    onClick={() => navigate(`/challans?status=${encodeURIComponent(s.status)}`)}
                    className="p-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                        <span className="font-semibold text-slate-700 group-hover:text-slate-900">{s.label}</span>
                      </div>
                      <span className="font-mono font-bold text-slate-900">{s.count} <span className="text-slate-400 font-normal">({percent}%)</span></span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500" 
                        style={{ width: `${percent}%`, backgroundColor: s.color }} 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Challan Type Breakdown */}
          <div className="mt-5 pt-4 border-t border-slate-100">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Challan Types</div>
            <div className="grid grid-cols-3 gap-1.5 text-center">
              {(analytics?.typeDistribution || []).map(t => (
                <div key={t.type} className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-base font-black font-mono text-slate-900">{t.count}</div>
                  <div className="text-[9px] font-medium text-slate-500 truncate" title={t.type}>{t.type}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 7. Operational Activity & Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Customers */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Users size={14} className="text-blue-500" /> Top Active Customers
              </h3>
              <Link to="/customers" className="text-[11px] font-bold text-blue-600 hover:underline">
                View all
              </Link>
            </div>

            {analytics?.topCustomers && analytics.topCustomers.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {analytics.topCustomers.map((cust, i) => (
                  <div 
                    key={i}
                    onClick={() => navigate(cust.customerId ? `/customers/${cust.customerId}` : `/challans?customer=${encodeURIComponent(cust.name)}`)}
                    className="py-2.5 flex items-center justify-between text-xs hover:bg-slate-50 px-1 rounded-lg transition-colors cursor-pointer group"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-bold text-slate-800 truncate group-hover:text-blue-600">{cust.name}</div>
                      <div className="text-[10px] text-slate-400">Last: {cust.lastDate || '—'}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-slate-900">{cust.challans} DC{cust.challans > 1 ? 's' : ''}</div>
                      <div className="text-[10px] text-slate-500">{cust.itemsCount} item(s)</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                No customer challans in this period
              </div>
            )}
          </div>
        </div>

        {/* Top Dispatched Products */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Package size={14} className="text-amber-500" /> Dispatched Products
              </h3>
              <Link to="/products" className="text-[11px] font-bold text-amber-600 hover:underline">
                Catalog
              </Link>
            </div>

            {analytics?.topProducts && analytics.topProducts.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {analytics.topProducts.map((prod, i) => (
                  <div key={i} className="py-2.5 flex items-center justify-between text-xs px-1">
                    <div className="min-w-0 pr-2">
                      <div className="font-bold text-slate-800 truncate">{prod.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">SKU: {prod.sku}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono font-black text-amber-600">
                        {prod.dispatchedQty} <span className="text-[10px] font-bold text-slate-600">{prod.unit}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">{prod.challanCount} dispatch(es)</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                No dispatched items in this period
              </div>
            )}
          </div>
        </div>

        {/* Recent Operational Timeline */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Clock size={14} className="text-emerald-500" /> Recent Activity Timeline
              </h3>
            </div>

            {analytics?.recentActivity && analytics.recentActivity.length > 0 ? (
              <div className="space-y-3">
                {analytics.recentActivity.slice(0, 5).map((act) => (
                  <div 
                    key={act.id}
                    onClick={() => act.link && navigate(act.link)}
                    className="flex items-start gap-2.5 text-xs hover:bg-slate-50 p-1.5 rounded-lg transition-colors cursor-pointer group"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-800 group-hover:text-amber-600 truncate">{act.title}</div>
                      <div className="text-[11px] text-slate-500 truncate">{act.description}</div>
                      <div className="text-[9px] font-mono text-slate-400 mt-0.5">
                        {act.timestamp?.split('T')[0]} • {act.actor}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                No recent activity logged
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 8. Recent Delivery Challans Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-slate-800">Recent Delivery Challans</h2>
            <p className="text-xs text-slate-400">Latest business deliveries generated during selected period</p>
          </div>
          <Link to="/challans" className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1">
            <span>View all in Challans</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="animate-spin h-6 w-6 border-2 border-amber-500 border-t-transparent rounded-full mx-auto mb-2" />
            <span className="text-xs font-semibold">Loading tenant records...</span>
          </div>
        ) : !analytics?.recentChallans || analytics.recentChallans.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <FileText size={42} className="mx-auto mb-3 opacity-20" />
            <h3 className="text-sm font-bold text-slate-700">No Delivery Challans in this Period</h3>
            <p className="text-xs text-slate-400 mt-1">Change the date range or create your first delivery challan.</p>
            {isStaff && (
              <Link
                to="/new"
                className="inline-flex items-center gap-1.5 px-4 py-2 mt-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs"
              >
                <Plus size={14} />
                Create Challan
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] uppercase tracking-wider text-slate-500 font-extrabold">
                  <th className="py-3 px-5">Challan No</th>
                  <th className="py-3 px-5">Date</th>
                  <th className="py-3 px-5">Customer</th>
                  <th className="py-3 px-5 text-right">Items</th>
                  <th className="py-3 px-5 text-right">Amount</th>
                  <th className="py-3 px-5 text-center">Status</th>
                  <th className="py-3 px-5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {analytics.recentChallans.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-5 font-bold font-mono text-slate-900">
                      <Link to={`/view/${c.id}`} className="hover:text-amber-600 transition-colors">
                        {c.challanNumber}
                      </Link>
                    </td>
                    <td className="py-3.5 px-5 text-slate-500 font-medium font-mono">
                      {c.date}
                    </td>
                    <td className="py-3.5 px-5 font-semibold text-slate-800 max-w-[200px] truncate" title={c.customer}>
                      {getCustomerName(c.customerDetails?.name || c.customer)}
                    </td>
                    <td className="py-3.5 px-5 text-right font-mono text-slate-600">
                      {c.totalQuantity || (c.items || c.products || []).reduce((s, p) => s + (parseFloat(p.quantity) || 0), 0)}
                    </td>
                    <td className="py-3.5 px-5 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(c.totalAmount || 0)}
                    </td>
                    <td className="py-3.5 px-5 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        c.status === 'Cancelled'
                          ? 'bg-red-100 text-red-700 border border-red-200'
                          : c.status === 'Draft'
                          ? 'bg-slate-100 text-slate-700 border border-slate-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}>
                        {c.status || 'Active'}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Link
                          to={`/view/${c.id}`}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                          title="View Challan"
                        >
                          <Eye size={15} />
                        </Link>
                        {isStaff && c.status !== 'Cancelled' && (
                          <button
                            onClick={() => handleEdit(c.id)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Challan"
                          >
                            <Edit size={15} />
                          </button>
                        )}
                        <button
                          onClick={() => triggerDirectPrint(c)}
                          className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Print"
                        >
                          <Printer size={15} />
                        </button>
                        <button
                          onClick={() => triggerPdfDownload(c)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          title="Download PDF"
                        >
                          <Download size={15} />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleOpenDelete(c.id, c.challanNumber)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Move to Recycle Bin"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleConfirmDelete}
        title="Move Challan to Recycle Bin"
        message={`Are you sure you want to delete ${deleteNo}? It will be moved to the company Recycle Bin where it can be restored anytime.`}
        confirmText="Move to Recycle Bin"
        isDanger={true}
      />
    </div>
  );
}
