import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  ShieldCheck, 
  Check, 
  Zap, 
  ArrowUpRight, 
  Users, 
  Building2, 
  Warehouse, 
  FileText, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  Clock,
  Sparkles,
  Download,
  Database,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  PLAN_TIERS, 
  PLAN_LIMITS, 
  getUsageMetrics, 
  updateCompany, 
  recordAuditLog,
  getCompanySubscription,
  updateCompanySubscription,
  exportTenantBackupArchive,
  reconcileStockLedger,
  createSafeObjectURL,
  revokeSafeObjectURL
} from '../utils/storage';

export default function SubscriptionBilling({ onOpenUpgradeModal }) {
  const { currentCompany, currentUser, role, isAdmin } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upgradingTier, setUpgradingTier] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [exportingBackup, setExportingBackup] = useState(false);
  const [reconcilingLedger, setReconcilingLedger] = useState(false);
  const [reconcileResult, setReconcileResult] = useState(null);

  useEffect(() => {
    loadBillingData();
  }, [currentCompany?.id]);

  const loadBillingData = async () => {
    if (!currentCompany?.id) return;
    try {
      setLoading(true);
      const [usageData, subData] = await Promise.all([
        getUsageMetrics(),
        getCompanySubscription(currentCompany.id)
      ]);
      setMetrics(usageData);
      setSubscription(subData);
    } catch (err) {
      console.error('Error loading billing data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async (tierKey) => {
    if (tierKey === currentPlanTier) return;
    const planConfig = PLAN_LIMITS[tierKey];
    if (!window.confirm(`Switch workspace to ${planConfig.name}? This will instantly update your resource limits.`)) {
      return;
    }

    try {
      setUpgradingTier(tierKey);

      // Update company plan
      await updateCompany(currentCompany.id, {
        plan: tierKey,
        planName: planConfig.name
      });

      // Update subscription record
      await updateCompanySubscription(currentCompany.id, {
        status: tierKey === PLAN_TIERS.FREE ? 'FREE' : 'ACTIVE',
        planTier: tierKey,
        planName: planConfig.name,
        planId: tierKey.toLowerCase()
      });

      await recordAuditLog('SUBSCRIPTION_PLAN_CHANGED', {
        previousPlan: currentPlanTier,
        newPlan: tierKey,
        details: `Updated subscription plan to ${planConfig.name}`
      }, currentUser);

      setToastMessage({
        type: 'success',
        text: `Workspace plan updated to ${planConfig.name}! All feature quotas have been updated.`
      });

      await loadBillingData();
    } catch (err) {
      console.error('Plan upgrade error:', err);
      setToastMessage({ type: 'error', text: err.message || 'Error changing plan.' });
    } finally {
      setUpgradingTier(null);
    }
  };

  const handleExportBackup = async () => {
    if (!currentCompany?.id) return;
    try {
      setExportingBackup(true);
      const backup = await exportTenantBackupArchive(currentCompany.id);
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = createSafeObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Nayaruvi_Backup_${(currentCompany.displayName || 'workspace').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      revokeSafeObjectURL(url);

      setToastMessage({
        type: 'success',
        text: 'Full workspace backup archive downloaded successfully.'
      });
    } catch (err) {
      console.error('Backup error:', err);
      setToastMessage({ type: 'error', text: 'Failed to generate backup archive.' });
    } finally {
      setExportingBackup(false);
    }
  };

  const handleReconcileLedger = async () => {
    if (!currentCompany?.id) return;
    try {
      setReconcilingLedger(true);
      const result = await reconcileStockLedger(currentCompany.id);
      setReconcileResult(result);
      setToastMessage({
        type: result.isBalanced ? 'success' : 'error',
        text: result.isBalanced 
          ? `Stock ledger is 100% mathematically balanced across ${result.totalMovements} historical movements.` 
          : `Discrepancies detected in ${result.discrepancies.length} inventory records.`
      });
    } catch (err) {
      console.error('Reconciliation error:', err);
      setToastMessage({ type: 'error', text: 'Error executing ledger audit.' });
    } finally {
      setReconcilingLedger(false);
    }
  };

  const currentPlanTier = metrics?.planTier || PLAN_TIERS.FREE;
  const currentLimits = PLAN_LIMITS[currentPlanTier] || PLAN_LIMITS[PLAN_TIERS.FREE];
  const usage = metrics?.usage || {
    members: { current: 1, max: 3 },
    branches: { current: 1, max: 1 },
    warehouses: { current: 1, max: 1 },
    monthlyChallans: { current: 0, max: 30 }
  };

  const calcPercentage = (current, max) => {
    if (!max) return 0;
    return Math.min(100, Math.round((current / max) * 100));
  };

  const planFeatures = {
    [PLAN_TIERS.FREE]: [
      'Up to 3 Team Members',
      '1 Operating Branch',
      '1 Warehouse',
      '30 Delivery Challans / month',
      'Standard A4 / A5 Challan Formats',
      'Basic Email Support'
    ],
    [PLAN_TIERS.PRO]: [
      'Up to 10 Team Members',
      '5 Operating Branches',
      '5 Warehouses',
      '300 Delivery Challans / month',
      'POS Thermal Printing (80mm & 58mm)',
      'Warehouse Stock Transfers & Ledger',
      'Returnable Goods Aging Reports',
      'Priority Support'
    ],
    [PLAN_TIERS.ENTERPRISE]: [
      'Up to 100 Team Members',
      '50 Operating Branches',
      '50 Warehouses',
      '10,000 Delivery Challans / month',
      'Full Enterprise Audit Trail & CSV Export',
      'Granular Role-Based Access Scoping',
      'Bulk Data Operations & Deduplication',
      'Dedicated Account Manager'
    ]
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <CreditCard className="text-amber-500" size={28} />
            Subscription & Enterprise Billing
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            View resource utilization, entitlement limits, and upgrade your plan to scale your business.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Tier:</span>
          <span className="px-3 py-1 bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-black uppercase tracking-wider">
            {currentLimits.name}
          </span>
        </div>
      </div>

      {/* Toast Alert */}
      {toastMessage && (
        <div className={`p-4 rounded-xl flex items-center justify-between text-sm ${
          toastMessage.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
            : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          <div className="flex items-center gap-2">
            {toastMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>
      )}

      {/* Real-time Resource Usage Cards */}
      <div>
        <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Zap size={18} className="text-amber-500" />
          Live Resource Utilization
        </h2>

        {loading ? (
          <div className="h-32 flex items-center justify-center bg-white rounded-2xl border border-slate-200">
            <Loader2 className="animate-spin text-amber-500" size={28} />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Team Seats */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Team Members</span>
                <Users size={18} className="text-slate-400" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900">{usage.members.current}</span>
                <span className="text-xs font-bold text-slate-400">/ {usage.members.max} seats</span>
              </div>
              <div className="mt-3 w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all rounded-full ${
                    calcPercentage(usage.members.current, usage.members.max) >= 90 ? 'bg-rose-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${calcPercentage(usage.members.current, usage.members.max)}%` }}
                />
              </div>
              <div className="mt-1 text-[11px] text-right font-bold text-slate-400">
                {calcPercentage(usage.members.current, usage.members.max)}% utilized
              </div>
            </div>

            {/* 2. Branches */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Active Branches</span>
                <Building2 size={18} className="text-slate-400" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900">{usage.branches.current}</span>
                <span className="text-xs font-bold text-slate-400">/ {usage.branches.max} locs</span>
              </div>
              <div className="mt-3 w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all rounded-full ${
                    calcPercentage(usage.branches.current, usage.branches.max) >= 90 ? 'bg-rose-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${calcPercentage(usage.branches.current, usage.branches.max)}%` }}
                />
              </div>
              <div className="mt-1 text-[11px] text-right font-bold text-slate-400">
                {calcPercentage(usage.branches.current, usage.branches.max)}% utilized
              </div>
            </div>

            {/* 3. Warehouses */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Warehouses</span>
                <Warehouse size={18} className="text-slate-400" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900">{usage.warehouses.current}</span>
                <span className="text-xs font-bold text-slate-400">/ {usage.warehouses.max} sheds</span>
              </div>
              <div className="mt-3 w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all rounded-full ${
                    calcPercentage(usage.warehouses.current, usage.warehouses.max) >= 90 ? 'bg-rose-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${calcPercentage(usage.warehouses.current, usage.warehouses.max)}%` }}
                />
              </div>
              <div className="mt-1 text-[11px] text-right font-bold text-slate-400">
                {calcPercentage(usage.warehouses.current, usage.warehouses.max)}% utilized
              </div>
            </div>

            {/* 4. Monthly Challans */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Monthly Challans</span>
                <FileText size={18} className="text-slate-400" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900">{usage.monthlyChallans.current}</span>
                <span className="text-xs font-bold text-slate-400">/ {usage.monthlyChallans.max} docs</span>
              </div>
              <div className="mt-3 w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all rounded-full ${
                    calcPercentage(usage.monthlyChallans.current, usage.monthlyChallans.max) >= 90 ? 'bg-rose-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${calcPercentage(usage.monthlyChallans.current, usage.monthlyChallans.max)}%` }}
                />
              </div>
              <div className="mt-1 text-[11px] text-right font-bold text-slate-400">
                {calcPercentage(usage.monthlyChallans.current, usage.monthlyChallans.max)}% this month
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Plan Tiers Grid */}
      <div>
        <div className="text-center max-w-xl mx-auto mb-8">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Available Subscription Plans</h2>
          <p className="text-xs text-slate-500 mt-1">
            Choose the tier matching your organization size. Upgrading adjusts your branch, member, and challan capacity immediately.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(PLAN_LIMITS).map(([key, plan]) => {
            const isCurrent = key === currentPlanTier;
            const isPopular = key === PLAN_TIERS.PRO;

            return (
              <div 
                key={key}
                className={`relative bg-white rounded-3xl p-6 border transition-all flex flex-col justify-between ${
                  isCurrent 
                    ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-lg' 
                    : isPopular
                      ? 'border-slate-300 shadow-md'
                      : 'border-slate-200 shadow-xs'
                }`}
              >
                {isPopular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] uppercase tracking-widest shadow-sm">
                    Most Popular
                  </span>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-lg text-slate-900">{plan.name}</h3>
                    {isCurrent && (
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Active Plan
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-black text-slate-900">
                      {key === PLAN_TIERS.FREE ? '₹0' : key === PLAN_TIERS.PRO ? '₹999' : '₹3,499'}
                    </span>
                    <span className="text-xs text-slate-500 font-semibold">/ month</span>
                  </div>

                  <p className="mt-2 text-xs text-slate-500">
                    {key === PLAN_TIERS.FREE ? 'Essential tools for single-location businesses.' :
                     key === PLAN_TIERS.PRO ? 'For growing distributors and multi-location businesses.' :
                     'High-volume enterprises with extensive warehouse networks.'}
                  </p>

                  <ul className="mt-6 space-y-2.5 text-xs text-slate-700">
                    {planFeatures[key]?.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => handleSelectPlan(key)}
                    disabled={isCurrent || upgradingTier !== null}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                      isCurrent 
                        ? 'bg-slate-100 text-slate-400 cursor-default'
                        : isPopular
                          ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md shadow-amber-500/20 active:scale-95'
                          : 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs active:scale-95'
                    }`}
                  >
                    {upgradingTier === key && <Loader2 size={14} className="animate-spin" />}
                    {isCurrent ? 'Current Plan' : `Switch to ${plan.name}`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Invoice Receipts & Billing Information */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h3 className="font-bold text-base text-slate-900 mb-2">Billing Details & Organization Settings</h3>
        <p className="text-xs text-slate-500 mb-4">
          All subscriptions are billed to {currentCompany?.displayName || currentCompany?.legalName || 'your organization'}. GSTIN details on invoices are sourced from your legal profile.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <span className="text-slate-400 font-semibold block">Legal Entity Name</span>
            <span className="font-bold text-slate-800">{currentCompany?.legalName || '—'}</span>
          </div>
          <div>
            <span className="text-slate-400 font-semibold block">GSTIN / Tax ID</span>
            <span className="font-mono font-bold text-slate-800">{currentCompany?.gstin || 'Not registered'}</span>
          </div>
          <div>
            <span className="text-slate-400 font-semibold block">Primary Billing Email</span>
            <span className="font-bold text-slate-800">{currentCompany?.businessEmail || currentUser?.email || '—'}</span>
          </div>
        </div>
      </div>

      {/* Disaster Recovery & Ledger Audit */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <Database size={18} className="text-amber-500" />
              Disaster Recovery & Ledger Integrity
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Generate portable encrypted backup archives and audit warehouse ledger reconciliation.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleReconcileLedger}
              disabled={reconcilingLedger}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={reconcilingLedger ? 'animate-spin' : ''} />
              {reconcilingLedger ? 'Auditing Ledger...' : 'Audit Stock Ledger'}
            </button>

            <button
              onClick={handleExportBackup}
              disabled={exportingBackup}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-colors disabled:opacity-50"
            >
              {exportingBackup ? <Loader2 size={14} className="animate-spin text-amber-400" /> : <Download size={14} className="text-amber-400" />}
              {exportingBackup ? 'Exporting...' : 'Export Full Backup JSON'}
            </button>
          </div>
        </div>

        {reconcileResult && (
          <div className={`mt-4 p-4 rounded-xl text-xs flex items-start gap-2.5 ${
            reconcileResult.isBalanced 
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-900' 
              : 'bg-rose-50 border border-rose-200 text-rose-900'
          }`}>
            <ShieldCheck size={18} className={reconcileResult.isBalanced ? 'text-emerald-600 shrink-0 mt-0.5' : 'text-rose-600 shrink-0 mt-0.5'} />
            <div>
              <div className="font-bold">
                {reconcileResult.isBalanced ? 'Stock Ledger 100% Balanced' : 'Discrepancies Detected'}
              </div>
              <div className="mt-0.5">
                Reconciliation verified {reconcileResult.totalMovements} historical movements against {reconcileResult.balanceRecordsChecked} warehouse stock balances at {new Date(reconcileResult.reconciledAt).toLocaleTimeString('en-IN')}.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
