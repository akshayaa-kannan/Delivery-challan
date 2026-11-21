import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  RotateCcw, 
  Search, 
  Filter, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Eye, 
  Calendar, 
  User, 
  Package, 
  ClipboardCheck, 
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  getReturnableStats, 
  getReturnableItemsList, 
  RETURN_STATUSES,
  getChallanById 
} from '../utils/tenantStorage';
import { formatDate } from '../utils/indianBusiness';
import RecordReturnModal from '../components/RecordReturnModal';
import ReturnInspectionModal from '../components/ReturnInspectionModal';

export default function ReturnableGoods() {
  const { currentCompany, isStaff } = useAuth();

  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({
    totalReturnableChallans: 0,
    awaitingReturn: 0,
    partiallyReturned: 0,
    overdue: 0,
    returned: 0,
    underInspection: 0,
    disputed: 0
  });
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [overdueOnly, setOverdueOnly] = useState(false);

  useEffect(() => {
    const statusParam = searchParams.get('status');
    if (statusParam) {
      if (statusParam === 'OVERDUE') {
        setStatusFilter('OVERDUE');
        setOverdueOnly(true);
      } else {
        setStatusFilter(statusParam);
        setOverdueOnly(false);
      }
    }
  }, [searchParams]);

  // Sorting & Pagination
  const [sortBy, setSortBy] = useState('daysOverdue');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Active modal targets
  const [activeReturnChallan, setActiveReturnChallan] = useState(null);
  const [inspectionTarget, setInspectionTarget] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    loadData();
  }, [currentCompany]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = async () => {
    if (!currentCompany?.id) return;
    setLoading(true);
    try {
      const statsData = await getReturnableStats(currentCompany.id);
      const itemsList = await getReturnableItemsList(currentCompany.id);
      setStats(statsData);
      setItems(itemsList);
    } catch (err) {
      console.error('Error loading returnable goods:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter(it => {
      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchChallan = (it.challanNumber || '').toLowerCase().includes(q);
        const matchCust = (it.customerName || '').toLowerCase().includes(q);
        const matchProd = (it.productName || '').toLowerCase().includes(q);
        const matchSku = (it.sku || '').toLowerCase().includes(q);
        if (!matchChallan && !matchCust && !matchProd && !matchSku) return false;
      }

      // Status Filter
      if (statusFilter !== 'ALL' && it.status !== statusFilter) {
        return false;
      }

      // Overdue Only
      if (overdueOnly && (it.daysOverdue <= 0 || it.outstandingQty <= 0)) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      let valA = a[sortBy] !== undefined ? a[sortBy] : '';
      let valB = b[sortBy] !== undefined ? b[sortBy] : '';

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [items, searchQuery, statusFilter, overdueOnly, sortBy, sortOrder]);

  // Pagination
  const totalItems = filteredItems.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleOpenRecordReturn = async (challanId) => {
    const ch = await getChallanById(currentCompany.id, challanId);
    if (ch) setActiveReturnChallan(ch);
  };

  const handleOpenInspection = async (challanId, transaction) => {
    const ch = await getChallanById(currentCompany.id, challanId);
    if (ch) {
      setInspectionTarget({ challan: ch, transaction });
    }
  };

  const getStatusBadge = (status, daysOverdue) => {
    switch (status) {
      case RETURN_STATUSES.OVERDUE:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-900 border border-rose-200">
            <AlertCircle size={11} /> Overdue ({daysOverdue}d)
          </span>
        );
      case RETURN_STATUSES.PARTIALLY_RETURNED:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-900 border border-purple-200">
            <RotateCcw size={11} /> Partial Return
          </span>
        );
      case RETURN_STATUSES.RETURNED:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-200">
            <CheckCircle2 size={11} /> Fully Returned
          </span>
        );
      case RETURN_STATUSES.RETURN_DISPUTED:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-200">
            <ShieldAlert size={11} /> Disputed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-900 border border-blue-200">
            <Clock size={11} /> Awaiting Return
          </span>
        );
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-4 rounded-xl flex items-center gap-2 text-sm font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
          <CheckCircle2 size={18} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <RotateCcw className="text-amber-500" size={24} />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Returnable Goods Hub</h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Track tools, equipment, processing materials, and demo units issued temporarily
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/deliveries"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Delivery Status Dashboard
          </Link>
          <Link
            to="/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold shadow-md shadow-amber-500/20 transition-all"
          >
            Issue Returnable Challan
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div 
          onClick={() => { setStatusFilter('ALL'); setOverdueOnly(false); }}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            statusFilter === 'ALL' && !overdueOnly
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400' 
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[10px] uppercase font-bold text-slate-400">Challans</div>
          <div className="text-xl font-black text-slate-900 mt-0.5">{stats.totalReturnableChallans}</div>
        </div>

        <div 
          onClick={() => { setStatusFilter(RETURN_STATUSES.AWAITING_RETURN); setOverdueOnly(false); }}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            statusFilter === RETURN_STATUSES.AWAITING_RETURN 
              ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-400' 
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[10px] uppercase font-bold text-blue-600">Awaiting Return</div>
          <div className="text-xl font-black text-blue-600 mt-0.5">{stats.awaitingReturn}</div>
        </div>

        <div 
          onClick={() => { setStatusFilter(RETURN_STATUSES.PARTIALLY_RETURNED); setOverdueOnly(false); }}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            statusFilter === RETURN_STATUSES.PARTIALLY_RETURNED 
              ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-400' 
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[10px] uppercase font-bold text-purple-600">Partial Return</div>
          <div className="text-xl font-black text-purple-600 mt-0.5">{stats.partiallyReturned}</div>
        </div>

        <div 
          onClick={() => { setStatusFilter(RETURN_STATUSES.OVERDUE); setOverdueOnly(true); }}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            statusFilter === RETURN_STATUSES.OVERDUE || overdueOnly 
              ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-400' 
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[10px] uppercase font-bold text-rose-600">Overdue Returns</div>
          <div className="text-xl font-black text-rose-600 mt-0.5">{stats.overdue}</div>
        </div>

        <div 
          onClick={() => { setStatusFilter(RETURN_STATUSES.RETURNED); setOverdueOnly(false); }}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            statusFilter === RETURN_STATUSES.RETURNED 
              ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400' 
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[10px] uppercase font-bold text-emerald-600">Fully Returned</div>
          <div className="text-xl font-black text-emerald-600 mt-0.5">{stats.returned}</div>
        </div>

        <div 
          onClick={() => { setStatusFilter(RETURN_STATUSES.RETURN_DISPUTED); setOverdueOnly(false); }}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            statusFilter === RETURN_STATUSES.RETURN_DISPUTED 
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400' 
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[10px] uppercase font-bold text-amber-600">Disputed</div>
          <div className="text-xl font-black text-amber-600 mt-0.5">{stats.disputed}</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-6 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Search by challan #, customer, product name, SKU..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                Clear
              </button>
            )}
          </div>

          <div className="md:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
            >
              <option value="ALL">All Return Statuses</option>
              <option value={RETURN_STATUSES.AWAITING_RETURN}>Awaiting Return</option>
              <option value={RETURN_STATUSES.PARTIALLY_RETURNED}>Partially Returned</option>
              <option value={RETURN_STATUSES.OVERDUE}>Overdue Returns</option>
              <option value={RETURN_STATUSES.RETURNED}>Fully Returned</option>
              <option value={RETURN_STATUSES.RETURN_DISPUTED}>Disputed / Damaged</option>
            </select>
          </div>

          <div className="md:col-span-3 flex items-center justify-end">
            <label className="flex items-center gap-1.5 cursor-pointer text-rose-700 font-bold text-xs">
              <input
                type="checkbox"
                checked={overdueOnly}
                onChange={(e) => { setOverdueOnly(e.target.checked); setCurrentPage(1); }}
                className="rounded text-rose-500 focus:ring-rose-500 h-3.5 w-3.5"
              />
              <span>Show Overdue Only</span>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 text-slate-500">
          <div>
            Tracking <span className="font-bold text-slate-900">{filteredItems.length}</span> returnable line items
          </div>
          <div>
            {stats.overdue > 0 && (
              <span className="text-rose-600 font-bold">⚠️ {stats.overdue} returnable consignments past expected return date</span>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto mb-2"></div>
            <p className="text-xs text-slate-400">Loading returnable items...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center">
            <RotateCcw className="mx-auto text-slate-300 mb-3" size={44} />
            <h3 className="text-sm font-bold text-slate-800">No Returnable Items Found</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4 max-w-sm mx-auto">
              No items currently match your returnable goods filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider select-none">
                  <th 
                    className="py-3 px-4 cursor-pointer hover:text-slate-800"
                    onClick={() => handleSort('challanNumber')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Challan / Date</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Product / SKU</th>
                  <th className="py-3 px-4 text-center">Issued</th>
                  <th className="py-3 px-4 text-center">Returned</th>
                  <th className="py-3 px-4 text-center">Outstanding</th>
                  <th 
                    className="py-3 px-4 cursor-pointer hover:text-slate-800"
                    onClick={() => handleSort('expectedReturnDate')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Due Return Date</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paginatedItems.map((it) => {
                  const hasPendingInspection = (it.returnTransactions || []).some(t => !t.inspection && t.condition === 'Under Inspection');
                  const uninspectedTx = (it.returnTransactions || []).find(t => !t.inspection);

                  return (
                    <tr key={it.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <Link 
                          to={`/view/${it.challanId}`}
                          className="font-mono font-bold text-slate-900 hover:text-amber-600 hover:underline"
                        >
                          {it.challanNumber}
                        </Link>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Calendar size={11} /> {formatDate(it.challanDate)}
                        </div>
                      </td>

                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-semibold text-slate-900 truncate">{it.customerName}</div>
                        {it.customerPhone && (
                          <div className="text-[11px] text-slate-500">{it.customerPhone}</div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{it.productName}</div>
                        {it.sku && <div className="text-[11px] text-slate-400 font-mono">SKU: {it.sku}</div>}
                      </td>

                      <td className="py-3 px-4 text-center font-mono font-medium">
                        {it.issuedQty} {it.unit}
                      </td>

                      <td className="py-3 px-4 text-center font-mono text-emerald-600 font-medium">
                        {it.returnedQty} {it.unit}
                      </td>

                      <td className="py-3 px-4 text-center font-mono font-bold">
                        <span className={it.outstandingQty > 0 ? (it.daysOverdue > 0 ? 'text-rose-600' : 'text-amber-600') : 'text-slate-400'}>
                          {it.outstandingQty} {it.unit}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {it.expectedReturnDate ? (
                          <div>
                            <div className={it.daysOverdue > 0 ? 'text-rose-600 font-bold' : 'text-slate-700'}>
                              {formatDate(it.expectedReturnDate)}
                            </div>
                            {it.daysOverdue > 0 && (
                              <div className="text-[10px] text-rose-500 font-bold">
                                {it.daysOverdue} days overdue
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No date specified</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        {getStatusBadge(it.status, it.daysOverdue)}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isStaff && it.outstandingQty > 0 && (
                            <button
                              type="button"
                              onClick={() => handleOpenRecordReturn(it.challanId)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded text-[11px] shadow-sm transition-colors"
                              title="Record return of this item"
                            >
                              <RotateCcw size={11} /> Return
                            </button>
                          )}

                          {isStaff && hasPendingInspection && uninspectedTx && (
                            <button
                              type="button"
                              onClick={() => handleOpenInspection(it.challanId, uninspectedTx)}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-[11px] shadow-sm transition-colors"
                              title="Inspect returned goods"
                            >
                              <ClipboardCheck size={11} /> Inspect
                            </button>
                          )}

                          <Link
                            to={`/view/${it.challanId}`}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
                            title="View Challan Details"
                          >
                            <Eye size={15} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {filteredItems.length > 0 && (
          <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span>Show</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="px-2 py-1 bg-slate-50 border border-slate-300 rounded text-slate-800"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span>per page</span>
            </div>

            <div className="flex items-center gap-2">
              <span>Page {currentPage} of {totalPages}</span>
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="p-1.5 rounded border border-slate-300 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded border border-slate-300 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Record Return Modal */}
      {activeReturnChallan && (
        <RecordReturnModal
          isOpen={Boolean(activeReturnChallan)}
          onClose={() => setActiveReturnChallan(null)}
          challan={activeReturnChallan}
          onSuccess={() => {
            loadData();
            showToast('Goods return recorded successfully.');
          }}
        />
      )}

      {/* Inspection Modal */}
      {inspectionTarget && (
        <ReturnInspectionModal
          isOpen={Boolean(inspectionTarget)}
          onClose={() => setInspectionTarget(null)}
          challan={inspectionTarget.challan}
          transaction={inspectionTarget.transaction}
          onSuccess={() => {
            loadData();
            showToast('Return inspection saved.');
          }}
        />
      )}
    </div>
  );
}
