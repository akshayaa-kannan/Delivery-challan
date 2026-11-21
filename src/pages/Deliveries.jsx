import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  Truck, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  PackageCheck, 
  Navigation, 
  RotateCcw, 
  Eye, 
  ChevronLeft, 
  ChevronRight,
  ArrowUpDown,
  Calendar,
  Building,
  MapPin,
  FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  getChallans, 
  getDeliveryStats, 
  DELIVERY_STATUSES, 
  normalizeDeliveryStatus 
} from '../utils/tenantStorage';
import { formatDate } from '../utils/indianBusiness';
import DispatchModal from '../components/DispatchModal';
import DeliveryTrackingModal from '../components/DeliveryTrackingModal';
import DeliveryConfirmModal from '../components/DeliveryConfirmModal';

export default function Deliveries() {
  const { currentCompany, isStaff } = useAuth();

  const [challans, setChallans] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    readyForDispatch: 0,
    dispatched: 0,
    inTransit: 0,
    partiallyDelivered: 0,
    delivered: 0,
    deliveryFailed: 0,
    delayed: 0,
    cancelled: 0
  });
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [delayedOnly, setDelayedOnly] = useState(false);
  const [returnableOnly, setReturnableOnly] = useState(false);

  useEffect(() => {
    const statusParam = searchParams.get('status');
    if (statusParam) {
      if (statusParam === 'DELAYED') {
        setStatusFilter('DELAYED');
        setDelayedOnly(true);
      } else {
        setStatusFilter(statusParam);
        setDelayedOnly(false);
      }
    }
  }, [searchParams]);

  // Sorting & Pagination
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Active modal targets
  const [dispatchChallan, setDispatchChallan] = useState(null);
  const [trackingChallan, setTrackingChallan] = useState(null);
  const [confirmChallan, setConfirmChallan] = useState(null);
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
      const list = await getChallans(currentCompany.id);
      const deliveryStats = await getDeliveryStats(currentCompany.id);
      setChallans(list);
      setStats(deliveryStats);
    } catch (err) {
      console.error('Error loading deliveries:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter & Sort
  const todayStr = new Date().toISOString().split('T')[0];

  const filteredChallans = useMemo(() => {
    return challans.filter(ch => {
      const dStatus = normalizeDeliveryStatus(ch);

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchNo = (ch.challanNumber || ch.id || '').toLowerCase().includes(q);
        const matchCust = (ch.customerDetails?.name || (typeof ch.customer === 'string' ? ch.customer : '')).toLowerCase().includes(q);
        const matchVehicle = (ch.transportDetails?.vehicleNumber || ch.vehicleNumber || '').toLowerCase().includes(q);
        const matchTransporter = (ch.transportDetails?.transporterName || '').toLowerCase().includes(q);
        const matchDest = (ch.customerDetails?.deliveryAddress || '').toLowerCase().includes(q);
        if (!matchNo && !matchCust && !matchVehicle && !matchTransporter && !matchDest) return false;
      }

      // Status Filter
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'DELAYED') {
          const expected = ch.dispatchDetails?.expectedDeliveryDate || ch.transportDetails?.expectedDeliveryDate;
          if (!expected || expected >= todayStr || dStatus === DELIVERY_STATUSES.DELIVERED || dStatus === DELIVERY_STATUSES.CANCELLED) {
            return false;
          }
        } else if (dStatus !== statusFilter) {
          return false;
        }
      }

      // Delayed Only Filter
      if (delayedOnly) {
        const expected = ch.dispatchDetails?.expectedDeliveryDate || ch.transportDetails?.expectedDeliveryDate;
        if (!expected || expected >= todayStr || dStatus === DELIVERY_STATUSES.DELIVERED || dStatus === DELIVERY_STATUSES.CANCELLED) {
          return false;
        }
      }

      // Returnable Only Filter
      if (returnableOnly) {
        const isReturnable = ch.challanType === 'Returnable Challan' || 
          ch.returnable?.isReturnable || 
          (ch.items || ch.products || []).some(i => i.isReturnable);
        if (!isReturnable) return false;
      }

      return true;
    }).sort((a, b) => {
      let valA = a[sortBy] || '';
      let valB = b[sortBy] || '';

      if (sortBy === 'customer') {
        valA = a.customerDetails?.name || a.customer || '';
        valB = b.customerDetails?.name || b.customer || '';
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [challans, searchQuery, statusFilter, delayedOnly, returnableOnly, sortBy, sortOrder]);

  // Pagination
  const totalItems = filteredChallans.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedChallans = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredChallans.slice(start, start + pageSize);
  }, [filteredChallans, currentPage, pageSize]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const getStatusBadge = (dStatus, ch) => {
    const expected = ch.dispatchDetails?.expectedDeliveryDate || ch.transportDetails?.expectedDeliveryDate;
    const isDelayed = expected && expected < todayStr && dStatus !== DELIVERY_STATUSES.DELIVERED && dStatus !== DELIVERY_STATUSES.CANCELLED;

    switch (dStatus) {
      case DELIVERY_STATUSES.READY_FOR_DISPATCH:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-200">
            <Clock size={11} /> Ready
          </span>
        );
      case DELIVERY_STATUSES.DISPATCHED:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-900 border border-blue-200">
            <Truck size={11} /> Dispatched {isDelayed ? '• Delayed' : ''}
          </span>
        );
      case DELIVERY_STATUSES.IN_TRANSIT:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-900 border border-indigo-200">
            <Navigation size={11} /> In Transit {isDelayed ? '• Delayed' : ''}
          </span>
        );
      case DELIVERY_STATUSES.PARTIALLY_DELIVERED:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-900 border border-purple-200">
            <PackageCheck size={11} /> Partial Delivery
          </span>
        );
      case DELIVERY_STATUSES.DELIVERED:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-200">
            <CheckCircle2 size={11} /> Delivered
          </span>
        );
      case DELIVERY_STATUSES.DELIVERY_FAILED:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-900 border border-rose-200">
            <AlertCircle size={11} /> Failed
          </span>
        );
      case DELIVERY_STATUSES.CANCELLED:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-700">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
            Draft
          </span>
        );
    }
  };

  const calculateProgress = (ch) => {
    const items = ch.items || ch.products || [];
    if (items.length === 0) return 0;
    const totalExpected = items.reduce((acc, it) => acc + (parseFloat(it.quantity) || 0), 0);
    if (totalExpected === 0) return 0;
    const totalDelivered = items.reduce((acc, it) => acc + (parseFloat(it.deliveredQuantity) || 0), 0);
    return Math.min(100, Math.round((totalDelivered / totalExpected) * 100));
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
            <Truck className="text-amber-500" size={24} />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Delivery Status & Movement</h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Track dispatches, active transit milestones, partial completions, and delivery proofs
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/returnable-goods"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <RotateCcw size={14} /> Returnable Goods Hub
          </Link>
          <Link
            to="/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold shadow-md shadow-amber-500/20 transition-all"
          >
            Create New Challan
          </Link>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div 
          onClick={() => setStatusFilter('ALL')}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            statusFilter === 'ALL' && !delayedOnly
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400' 
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[10px] uppercase font-bold text-slate-400">Total</div>
          <div className="text-xl font-black text-slate-900 mt-0.5">{stats.total}</div>
        </div>

        <div 
          onClick={() => { setStatusFilter(DELIVERY_STATUSES.READY_FOR_DISPATCH); setDelayedOnly(false); }}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            statusFilter === DELIVERY_STATUSES.READY_FOR_DISPATCH 
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400' 
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[10px] uppercase font-bold text-amber-600">Ready</div>
          <div className="text-xl font-black text-amber-600 mt-0.5">{stats.readyForDispatch}</div>
        </div>

        <div 
          onClick={() => { setStatusFilter(DELIVERY_STATUSES.DISPATCHED); setDelayedOnly(false); }}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            statusFilter === DELIVERY_STATUSES.DISPATCHED 
              ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-400' 
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[10px] uppercase font-bold text-blue-600">Dispatched</div>
          <div className="text-xl font-black text-blue-600 mt-0.5">{stats.dispatched}</div>
        </div>

        <div 
          onClick={() => { setStatusFilter(DELIVERY_STATUSES.IN_TRANSIT); setDelayedOnly(false); }}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            statusFilter === DELIVERY_STATUSES.IN_TRANSIT 
              ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-400' 
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[10px] uppercase font-bold text-indigo-600">In Transit</div>
          <div className="text-xl font-black text-indigo-600 mt-0.5">{stats.inTransit}</div>
        </div>

        <div 
          onClick={() => { setStatusFilter(DELIVERY_STATUSES.PARTIALLY_DELIVERED); setDelayedOnly(false); }}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            statusFilter === DELIVERY_STATUSES.PARTIALLY_DELIVERED 
              ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-400' 
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[10px] uppercase font-bold text-purple-600">Partial</div>
          <div className="text-xl font-black text-purple-600 mt-0.5">{stats.partiallyDelivered}</div>
        </div>

        <div 
          onClick={() => { setStatusFilter(DELIVERY_STATUSES.DELIVERED); setDelayedOnly(false); }}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            statusFilter === DELIVERY_STATUSES.DELIVERED 
              ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400' 
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[10px] uppercase font-bold text-emerald-600">Delivered</div>
          <div className="text-xl font-black text-emerald-600 mt-0.5">{stats.delivered}</div>
        </div>

        <div 
          onClick={() => { setStatusFilter('DELAYED'); setDelayedOnly(true); }}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            statusFilter === 'DELAYED' || delayedOnly 
              ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-400' 
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[10px] uppercase font-bold text-rose-600">Delayed</div>
          <div className="text-xl font-black text-rose-600 mt-0.5">{stats.delayed}</div>
        </div>

        <div 
          onClick={() => { setStatusFilter(DELIVERY_STATUSES.CANCELLED); setDelayedOnly(false); }}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            statusFilter === DELIVERY_STATUSES.CANCELLED 
              ? 'bg-slate-100 border-slate-300 ring-2 ring-slate-400' 
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[10px] uppercase font-bold text-slate-500">Cancelled</div>
          <div className="text-xl font-black text-slate-600 mt-0.5">{stats.cancelled}</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Search by challan #, customer, transporter, vehicle..."
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
              <option value="ALL">All Delivery Statuses</option>
              <option value={DELIVERY_STATUSES.READY_FOR_DISPATCH}>Ready for Dispatch</option>
              <option value={DELIVERY_STATUSES.DISPATCHED}>Dispatched</option>
              <option value={DELIVERY_STATUSES.IN_TRANSIT}>In Transit</option>
              <option value={DELIVERY_STATUSES.PARTIALLY_DELIVERED}>Partially Delivered</option>
              <option value={DELIVERY_STATUSES.DELIVERED}>Delivered</option>
              <option value={DELIVERY_STATUSES.DELIVERY_FAILED}>Delivery Failed</option>
              <option value="DELAYED">Delayed Deliveries</option>
              <option value={DELIVERY_STATUSES.CANCELLED}>Cancelled</option>
            </select>
          </div>

          <div className="md:col-span-4 flex items-center justify-end gap-3 text-xs">
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
              <input
                type="checkbox"
                checked={returnableOnly}
                onChange={(e) => { setReturnableOnly(e.target.checked); setCurrentPage(1); }}
                className="rounded text-amber-500 focus:ring-amber-500 h-3.5 w-3.5"
              />
              <span>Returnable Items</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-rose-700 font-semibold">
              <input
                type="checkbox"
                checked={delayedOnly}
                onChange={(e) => { setDelayedOnly(e.target.checked); setCurrentPage(1); }}
                className="rounded text-rose-500 focus:ring-rose-500 h-3.5 w-3.5"
              />
              <span>Delayed Only</span>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 text-slate-500">
          <div>
            Showing <span className="font-bold text-slate-900">{filteredChallans.length}</span> of {challans.length} delivery challans
          </div>
          <div>
            {stats.delayed > 0 && (
              <span className="text-rose-600 font-bold">⚠️ {stats.delayed} deliveries past expected delivery date</span>
            )}
          </div>
        </div>
      </div>

      {/* Deliveries Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto mb-2"></div>
            <p className="text-xs text-slate-400">Loading delivery tracking data...</p>
          </div>
        ) : filteredChallans.length === 0 ? (
          <div className="p-12 text-center">
            <Truck className="mx-auto text-slate-300 mb-3" size={44} />
            <h3 className="text-sm font-bold text-slate-800">No Delivery Challans Found</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4 max-w-sm mx-auto">
              No delivery records match your current filter and search criteria.
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
                      <span>Challan No / Date</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th 
                    className="py-3 px-4 cursor-pointer hover:text-slate-800"
                    onClick={() => handleSort('customer')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Customer & Destination</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="py-3 px-4">Transport & Vehicle</th>
                  <th className="py-3 px-4">Schedule</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Progress</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paginatedChallans.map((ch) => {
                  const dStatus = normalizeDeliveryStatus(ch);
                  const progress = calculateProgress(ch);
                  const isReturnable = ch.challanType === 'Returnable Challan' || 
                    ch.returnable?.isReturnable || 
                    (ch.items || ch.products || []).some(i => i.isReturnable);

                  const dispatchDate = ch.dispatchDetails?.dispatchDate || ch.transportDetails?.dispatchDate;
                  const expectedDate = ch.dispatchDetails?.expectedDeliveryDate || ch.transportDetails?.expectedDeliveryDate;
                  const vehicle = ch.dispatchDetails?.vehicleNumber || ch.transportDetails?.vehicleNumber || ch.vehicleNumber;
                  const transporter = ch.dispatchDetails?.transporterName || ch.transportDetails?.transporterName;

                  return (
                    <tr key={ch.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900">
                          <Link to={`/view/${ch.id}`} className="hover:text-amber-600 hover:underline">
                            {ch.challanNumber || ch.id}
                          </Link>
                          {isReturnable && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-blue-100 text-blue-800" title="Returnable Challan">
                              Ret
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Calendar size={11} /> {formatDate(ch.challanDate || ch.date)}
                        </div>
                      </td>

                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-semibold text-slate-900 truncate">
                          {ch.customerDetails?.name || (typeof ch.customer === 'string' ? ch.customer.split('\n')[0] : 'Consignee')}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate flex items-center gap-1 mt-0.5" title={ch.customerDetails?.deliveryAddress || ''}>
                          <MapPin size={11} className="shrink-0 text-slate-400" />
                          <span className="truncate">{ch.customerDetails?.deliveryAddress || 'Address on record'}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-700">
                        {vehicle || transporter ? (
                          <div>
                            {vehicle && <div className="font-mono font-bold text-xs uppercase">{vehicle}</div>}
                            {transporter && <div className="text-[11px] text-slate-500 truncate">{transporter}</div>}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Self / Unassigned</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-600 text-[11px]">
                        {dispatchDate ? (
                          <div>
                            <div>Disp: <span className="font-semibold text-slate-800">{formatDate(dispatchDate)}</span></div>
                            {expectedDate && (
                              <div className={expectedDate < todayStr && dStatus !== DELIVERY_STATUSES.DELIVERED ? 'text-rose-600 font-bold' : ''}>
                                Due: {formatDate(expectedDate)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">Not Dispatched</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        {getStatusBadge(dStatus, ch)}
                      </td>

                      <td className="py-3 px-4">
                        <div className="w-24">
                          <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                            <span>{progress}%</span>
                            <span>{dStatus === DELIVERY_STATUSES.DELIVERED ? '100%' : 'Delivered'}</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className={`h-1.5 rounded-full transition-all ${
                                progress === 100 ? 'bg-emerald-500' : progress > 0 ? 'bg-purple-500' : 'bg-slate-300'
                              }`} 
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isStaff && dStatus === DELIVERY_STATUSES.READY_FOR_DISPATCH && (
                            <button
                              type="button"
                              onClick={() => setDispatchChallan(ch)}
                              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded text-[11px] shadow-sm transition-colors"
                              title="Record physical dispatch"
                            >
                              Dispatch
                            </button>
                          )}

                          {isStaff && (dStatus === DELIVERY_STATUSES.DISPATCHED || dStatus === DELIVERY_STATUSES.IN_TRANSIT) && (
                            <button
                              type="button"
                              onClick={() => setTrackingChallan(ch)}
                              className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded transition-colors"
                              title="Record tracking milestone"
                            >
                              <Navigation size={14} />
                            </button>
                          )}

                          {isStaff && dStatus !== DELIVERY_STATUSES.DELIVERED && dStatus !== DELIVERY_STATUSES.CANCELLED && dStatus !== DELIVERY_STATUSES.DRAFT && (
                            <button
                              type="button"
                              onClick={() => setConfirmChallan(ch)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-[11px] shadow-sm transition-colors"
                              title="Confirm delivery (partial or full)"
                            >
                              Confirm
                            </button>
                          )}

                          <Link
                            to={`/view/${ch.id}`}
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
        {filteredChallans.length > 0 && (
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

      {/* Dispatch Modal */}
      {dispatchChallan && (
        <DispatchModal
          isOpen={Boolean(dispatchChallan)}
          onClose={() => setDispatchChallan(null)}
          challan={dispatchChallan}
          onSuccess={() => {
            loadData();
            showToast('Goods dispatch recorded successfully.');
          }}
        />
      )}

      {/* Tracking Update Modal */}
      {trackingChallan && (
        <DeliveryTrackingModal
          isOpen={Boolean(trackingChallan)}
          onClose={() => setTrackingChallan(null)}
          challan={trackingChallan}
          onSuccess={() => {
            loadData();
            showToast('Tracking milestone updated.');
          }}
        />
      )}

      {/* Delivery Confirmation Modal */}
      {confirmChallan && (
        <DeliveryConfirmModal
          isOpen={Boolean(confirmChallan)}
          onClose={() => setConfirmChallan(null)}
          challan={confirmChallan}
          onSuccess={() => {
            loadData();
            showToast('Delivery confirmation recorded.');
          }}
        />
      )}
    </div>
  );
}
