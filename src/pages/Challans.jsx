import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Trash2, 
  Edit, 
  Eye, 
  Copy, 
  Printer, 
  Download, 
  Plus,
  ArrowUpDown,
  Calendar,
  Ban,
  RotateCcw,
  Archive,
  FileDown,
  X,
  MessageCircle,
  Loader2
} from 'lucide-react';
import { getChallans, deleteChallan, duplicateChallan, updateChallan } from '../utils/storage';
import { formatCurrency } from '../utils/calculations';
import ConfirmDialog from '../components/ConfirmDialog';
import { useAuth } from '../context/AuthContext';
import { downloadCombinedChallansPDF, exportChallansToZip } from '../utils/pdfGenerator';
import { shareViaWhatsApp } from '../utils/shareUtils';

export default function Challans({ companyDetails, triggerDirectPrint, triggerPdfDownload }) {
  const navigate = useNavigate();
  const { currentCompany, isStaff, isAdmin } = useAuth();
  const [challans, setChallans] = useState([]);
  
  // Search, Filter, Sort States
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all'); // all, today, week, month, custom
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [sortBy, setSortBy] = useState('latest');

  // Bulk Selection States
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkExporting, setIsBulkExporting] = useState(false);
  const [bulkExportStatus, setBulkExportStatus] = useState('');
  
  // Modal Delete state
  const [deleteId, setDeleteId] = useState(null);
  const [deleteNo, setDeleteNo] = useState('');
  const [cancelId, setCancelId] = useState(null);
  const [cancelNo, setCancelNo] = useState('');

  const [searchParams] = useSearchParams();

  useEffect(() => {
    const statusParam = searchParams.get('status');
    if (statusParam) {
      if (statusParam.toLowerCase() === 'draft') setStatusFilter('Draft');
      else if (statusParam.toLowerCase() === 'cancelled') setStatusFilter('Cancelled');
      else if (statusParam.toLowerCase() === 'finalized' || statusParam.toLowerCase() === 'active') setStatusFilter('Finalized');
    }
    const dateParam = searchParams.get('date');
    if (dateParam) {
      setDateFilter('custom');
      setCustomStart(dateParam);
      setCustomEnd(dateParam);
    }
    const custParam = searchParams.get('customer');
    if (custParam) {
      setSearchTerm(custParam);
    }
  }, [searchParams]);

  const fetchChallans = async () => {
    const data = await getChallans();
    setChallans(data);
  };

  useEffect(() => {
    fetchChallans();
  }, [currentCompany?.id]);

  const handleDuplicate = async (id) => {
    const newChallan = await duplicateChallan(id);
    if (newChallan) {
      await fetchChallans(); // reload
      alert(`Challan duplicated as ${newChallan.challanNumber}`);
      navigate(`/view/${newChallan.id}`);
    } else {
      alert("Failed to duplicate challan.");
    }
  };

  const handleOpenDelete = (id, dcNo) => {
    setDeleteId(id);
    setDeleteNo(dcNo);
  };

  const handleConfirmDelete = async () => {
    if (deleteId) {
      await deleteChallan(deleteId);
      await fetchChallans();
      setDeleteId(null);
      setDeleteNo('');
    }
  };

  const handleOpenCancel = (id, challanNo) => {
    setCancelId(id);
    setCancelNo(challanNo);
  };

  const handleConfirmCancel = async () => {
    if (cancelId) {
      await updateChallan(cancelId, { status: 'Cancelled' });
      await fetchChallans(); // reload
      setCancelId(null);
      setCancelNo('');
    }
  };

  const handleReactivate = async (id) => {
    await updateChallan(id, { status: 'Active' });
    await fetchChallans(); // reload
  };

  // Filter & Sort implementation
  const filteredChallans = challans
    .filter(c => {
      // 1. Search filter
      const term = searchTerm.toLowerCase().trim();
      if (!term) return true;
      
      const matchNo = (c.challanNumber || '').toLowerCase().includes(term);
      const matchCustomer = (typeof c.customer === 'string' ? c.customer : c.customerDetails?.name || '').toLowerCase().includes(term);
      const matchProducts = (c.products || []).some(p => (p.name || '').toLowerCase().includes(term));
      const matchPo = (c.purchaseOrderNumber || '').toLowerCase().includes(term);
      const matchVeh = (c.vehicleNumber || c.transport?.vehicleNumber || '').toLowerCase().includes(term);
      
      return matchNo || matchCustomer || matchProducts || matchPo || matchVeh;
    })
    .filter(c => {
      // Status filter
      if (statusFilter === 'all') return true;
      if (statusFilter === 'Finalized') return c.status === 'Finalized' || c.status === 'Active';
      return c.status === statusFilter;
    })
    .filter(c => {
      // Challan Type filter
      if (typeFilter === 'all') return true;
      if (typeFilter === 'Returnable') return c.returnable?.isReturnable || c.challanType === 'Returnable Challan';
      return (c.challanType || 'Delivery Challan') === typeFilter;
    })
    .filter(c => {
      // 2. Date filter
      if (dateFilter === 'all') return true;
      if (!c.date) return false;
      
      const today = new Date();
      today.setHours(0,0,0,0);
      const todayStr = today.toISOString().split('T')[0];
      
      const challanDate = new Date(c.date + 'T00:00:00');
      
      switch (dateFilter) {
        case 'today':
          return c.date === todayStr;
        case 'week': {
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(today.getDate() - 7);
          oneWeekAgo.setHours(0,0,0,0);
          return challanDate >= oneWeekAgo && challanDate <= today;
        }
        case 'month': {
          const currentMonthPrefix = todayStr.substring(0, 7); // YYYY-MM
          return c.date.startsWith(currentMonthPrefix);
        }
        case 'custom': {
          if (customStart && customEnd) {
            return c.date >= customStart && c.date <= customEnd;
          }
          if (customStart) {
            return c.date >= customStart;
          }
          if (customEnd) {
            return c.date <= customEnd;
          }
          return true;
        }
        default:
          return true;
      }
    })
    .sort((a, b) => {
      // 3. Sorting implementation
      switch (sortBy) {
        case 'latest':
          return new Date(b.date + 'T00:00:00') - new Date(a.date + 'T00:00:00') || b.challanNumber.localeCompare(a.challanNumber);
        case 'oldest':
          return new Date(a.date + 'T00:00:00') - new Date(b.date + 'T00:00:00') || a.challanNumber.localeCompare(b.challanNumber);
        case 'no-asc':
          return a.challanNumber.localeCompare(b.challanNumber);
        case 'no-desc':
          return b.challanNumber.localeCompare(a.challanNumber);
        case 'amount-desc':
          return b.totalAmount - a.totalAmount;
        case 'amount-asc':
          return a.totalAmount - b.totalAmount;
        default:
          return 0;
      }
    });

  // UI Helpers
  const getCustomerName = (addressText) => {
    return addressText ? addressText.split('\n')[0] : '';
  };

  const getProductsSummary = (products = []) => {
    if (products.length === 0) return 'No items';
    const names = products.map(p => p.name).filter(Boolean);
    if (names.length === 1) return names[0];
    return `${names[0]} (+${names.length - 1} items)`;
  };

  // Bulk Selection Helpers
  const allFilteredSelected = filteredChallans.length > 0 && filteredChallans.every(c => selectedIds.includes(c.id));
  
  const handleToggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredChallans.map(c => c.id));
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const getSelectedChallans = () => {
    return challans.filter(c => selectedIds.includes(c.id));
  };

  const handleExportCombinedPdf = async () => {
    const selected = getSelectedChallans();
    if (selected.length === 0) return;
    setIsBulkExporting(true);
    setBulkExportStatus(`Generating combined PDF for ${selected.length} challans...`);
    try {
      await downloadCombinedChallansPDF(selected, companyDetails);
    } catch (err) {
      console.error("Combined PDF export failed:", err);
      alert("Failed to export combined PDF: " + err.message);
    } finally {
      setIsBulkExporting(false);
      setBulkExportStatus('');
    }
  };

  const handleExportZip = async () => {
    const selected = getSelectedChallans();
    if (selected.length === 0) return;
    setIsBulkExporting(true);
    try {
      await exportChallansToZip(selected, companyDetails, {}, (curr, total, no) => {
        setBulkExportStatus(`Archiving ${curr}/${total}: ${no}...`);
      });
    } catch (err) {
      console.error("ZIP export failed:", err);
      alert("Failed to export ZIP archive: " + err.message);
    } finally {
      setIsBulkExporting(false);
      setBulkExportStatus('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Delivery Challans Archive</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Search, filter, print, duplicate and manage all generated challans.
          </p>
        </div>
        <Link
          to="/new"
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-sm font-semibold shadow-md shadow-blue-700/10 transition-all cursor-pointer"
        >
          <Plus size={16} />
          Create New Challan
        </Link>
      </div>

      {/* Filter and Search Panel */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search box */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3.5 top-3 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search by DC No, Customer, PO, or Item..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-sm font-medium pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-700/10 focus:border-blue-700"
            />
          </div>

          {/* Status filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Finalized">Finalized / Active</option>
              <option value="Dispatched">Dispatched</option>
              <option value="Delivered">Delivered</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* Challan Type filter */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white cursor-pointer"
            >
              <option value="all">All Document Types</option>
              <option value="Delivery Challan">Delivery Challan</option>
              <option value="Job Work Challan">Job Work Challan</option>
              <option value="Returnable">Returnable Goods</option>
              <option value="Stock Transfer Challan">Stock Transfer</option>
              <option value="Approval Challan">Approval / Demo</option>
            </select>
          </div>

          {/* Sort selection */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white cursor-pointer"
            >
              <option value="latest">Sort: Latest First</option>
              <option value="oldest">Sort: Oldest First</option>
              <option value="no-asc">Sort: DC No (Asc)</option>
              <option value="no-desc">Sort: DC No (Desc)</option>
              <option value="amount-desc">Sort: Amount (High-Low)</option>
              <option value="amount-asc">Sort: Amount (Low-High)</option>
            </select>
          </div>
        </div>

        {/* Custom date range boxes (visible only if custom selected) */}
        {dateFilter === 'custom' && (
          <div className="flex flex-wrap items-center gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200 animate-slide-down">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date range:</span>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="text-xs font-semibold px-3 py-1.5 border border-slate-200 rounded-md bg-white"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="text-xs font-semibold px-3 py-1.5 border border-slate-200 rounded-md bg-white"
              />
            </div>
            {(customStart || customEnd) && (
              <button
                onClick={() => { setCustomStart(''); setCustomEnd(''); }}
                className="text-xs font-bold text-red-600 hover:underline cursor-pointer"
              >
                Clear Range
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bulk Operations Toolbar */}
      {selectedIds.length > 0 && (
        <div className="bg-slate-900 text-white px-5 py-3 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-lg border border-slate-700 animate-in fade-in duration-150">
          <div className="flex items-center gap-3">
            <span className="bg-amber-400 text-slate-950 font-black text-xs px-2.5 py-1 rounded-full">
              {selectedIds.length} Selected
            </span>
            <span className="text-xs text-slate-300 font-medium hidden sm:inline">
              Perform batch document operations on selected challans
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isBulkExporting && bulkExportStatus && (
              <span className="text-xs text-amber-400 font-mono flex items-center gap-1.5 mr-2">
                <Loader2 size={13} className="animate-spin" />
                {bulkExportStatus}
              </span>
            )}

            <button
              onClick={handleExportCombinedPdf}
              disabled={isBulkExporting}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-sm disabled:opacity-50"
              title="Combine selected challans into a single PDF file"
            >
              <FileDown size={14} />
              <span>Export Combined PDF</span>
            </button>

            <button
              onClick={handleExportZip}
              disabled={isBulkExporting}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-black transition-colors cursor-pointer shadow-sm disabled:opacity-50"
              title="Download ZIP archive with individual PDFs"
            >
              <Archive size={14} />
              <span>Export ZIP Archive</span>
            </button>

            <button
              onClick={() => setSelectedIds([])}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer ml-1"
              title="Clear selection"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Challans Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredChallans.length === 0 ? (
          <div className="p-16 text-center">
            <Calendar className="mx-auto text-slate-300 mb-4" size={48} />
            <h3 className="text-base font-bold text-slate-800">No delivery challans found</h3>
            <p className="text-sm font-medium text-slate-400 mt-1 max-w-md mx-auto">
              {searchTerm || dateFilter !== 'all' 
                ? "No records matched your search term or date filters. Reset your filters and try again."
                : "Generate your first delivery challan to begin digitising your shipping."}
            </p>
            {!searchTerm && dateFilter === 'all' && (
              <Link
                to="/new"
                className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold shadow-sm transition-all"
              >
                Create New Challan
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[850px]">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <th className="py-3 px-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={handleToggleSelectAll}
                      className="rounded border-slate-300 text-amber-500 focus:ring-amber-400 cursor-pointer w-4 h-4"
                      aria-label="Select all challans"
                    />
                  </th>
                  <th className="py-3 px-6 w-[11%]">Challan No</th>
                  <th className="py-3 px-6 w-[11%]">Date</th>
                  <th className="py-3 px-6 w-[24%]">Customer / Receiver</th>
                  <th className="py-3 px-6 w-[20%]">Products / Items</th>
                  <th className="py-3 px-6 w-[12%] text-right">Total Amount</th>
                  <th className="py-3 px-6 w-[10%] text-center">Status</th>
                  <th className="py-3 px-6 w-[14%] text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-medium">
                {filteredChallans.map((challan) => {
                  const isSelected = selectedIds.includes(challan.id);
                  return (
                    <tr key={challan.id} className={`hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-amber-50/40' : ''}`}>
                      {/* Checkbox */}
                      <td className="py-4 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(challan.id)}
                          className="rounded border-slate-300 text-amber-500 focus:ring-amber-400 cursor-pointer w-4 h-4"
                          aria-label={`Select challan ${challan.challanNumber}`}
                        />
                      </td>

                      {/* Challan No & Type */}
                      <td className="py-4 px-6 font-mono">
                        <div className="font-bold text-blue-900">{challan.challanNumber}</div>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          <span className="text-[10px] font-sans font-semibold text-slate-500">
                            {challan.challanType || 'Delivery Challan'}
                          </span>
                          {(challan.returnable?.isReturnable || challan.challanType === 'Returnable Challan') && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded">
                              Returnable
                            </span>
                          )}
                        </div>
                      </td>
                    
                    {/* Date */}
                    <td className="py-4 px-6 text-slate-500 font-mono text-xs">
                      {challan.date ? challan.date.split('-').reverse().join('/') : ''}
                    </td>
                    
                    {/* Customer */}
                    <td className="py-4 px-6 font-semibold text-slate-800 truncate max-w-[200px]" title={typeof challan.customer === 'string' ? challan.customer : challan.customerDetails?.name}>
                      <div>{challan.customerDetails?.name || getCustomerName(challan.customer)}</div>
                      {challan.purchaseOrderNumber && (
                        <div className="text-[10px] text-slate-400 font-mono">PO: {challan.purchaseOrderNumber}</div>
                      )}
                    </td>
                    
                    {/* Items */}
                    <td className="py-4 px-6 text-slate-600 truncate max-w-[180px]" title={(challan.products || []).map(p => p.name).join(', ')}>
                      {getProductsSummary(challan.products)}
                    </td>
                    
                    {/* Total Amount */}
                    <td className="py-4 px-6 text-right font-bold text-slate-900 font-mono">
                      {challan.isMonetary !== false ? formatCurrency(challan.totalAmount) : (
                        <span className="text-xs text-slate-400 font-sans italic">Goods Movement</span>
                      )}
                    </td>
                    
                    {/* Status */}
                    <td className="py-4 px-6 text-center">
                      {challan.status === 'Cancelled' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-100">
                          Cancelled
                        </span>
                      ) : challan.status === 'Draft' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          Draft
                        </span>
                      ) : challan.status === 'Dispatched' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          Dispatched
                        </span>
                      ) : challan.status === 'Delivered' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          Delivered
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                          Finalized
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4">
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="flex items-center gap-1.5 justify-center">
                          <Link
                            to={`/view/${challan.id}`}
                            className="p-1 text-slate-400 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                            title="View detailed A4"
                          >
                            <Eye size={15} />
                          </Link>
                          <button
                            onClick={() => navigate(`/edit/${challan.id}`)}
                            className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors cursor-pointer"
                            title="Edit details"
                            disabled={!isStaff || challan.status === 'Cancelled'}
                            style={{ opacity: (!isStaff || challan.status === 'Cancelled') ? 0.35 : 1, cursor: (!isStaff || challan.status === 'Cancelled') ? 'not-allowed' : 'pointer' }}
                          >
                            <Edit size={15} />
                          </button>
                          <button
                            onClick={() => handleDuplicate(challan.id)}
                            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors cursor-pointer"
                            title="Duplicate challan"
                            disabled={!isStaff}
                            style={{ opacity: !isStaff ? 0.35 : 1, cursor: !isStaff ? 'not-allowed' : 'pointer' }}
                          >
                            <Copy size={15} />
                          </button>
                          <button
                            onClick={() => triggerDirectPrint(challan)}
                            className="p-1 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                            title="Direct Print"
                          >
                            <Printer size={15} />
                          </button>
                          <button
                            onClick={() => triggerPdfDownload(challan)}
                            className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                            title="Download PDF"
                          >
                            <Download size={15} />
                          </button>
                          <button
                            onClick={() => shareViaWhatsApp(challan, companyDetails)}
                            className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                            title="Share on WhatsApp"
                          >
                            <MessageCircle size={15} />
                          </button>
                        </div>
                        
                        <div className="flex items-center gap-2 border-t border-slate-100 pt-1.5 w-full justify-center">
                          {challan.status === 'Cancelled' ? (
                            <button
                              onClick={() => handleReactivate(challan.id)}
                              className="px-2 py-0.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded border border-emerald-200 transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-extrabold uppercase bg-emerald-50/20"
                              title="Reactivate Challan"
                              disabled={!isAdmin}
                              style={{ opacity: !isAdmin ? 0.35 : 1, cursor: !isAdmin ? 'not-allowed' : 'pointer' }}
                            >
                              <RotateCcw size={11} />
                              <span>Reactivate</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleOpenCancel(challan.id, challan.challanNumber)}
                              className="px-2 py-0.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded border border-red-200 transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-extrabold uppercase bg-red-50/20"
                              title="Cancel Challan"
                              disabled={!isAdmin}
                              style={{ opacity: !isAdmin ? 0.35 : 1, cursor: !isAdmin ? 'not-allowed' : 'pointer' }}
                            >
                              <Ban size={11} />
                              <span>Cancel</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenDelete(challan.id, challan.challanNumber)}
                            className="px-2 py-0.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded border border-red-200 transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-extrabold uppercase bg-red-50/20"
                            title="Delete challan"
                            disabled={!isAdmin}
                            style={{ opacity: !isAdmin ? 0.35 : 1, cursor: !isAdmin ? 'not-allowed' : 'pointer' }}
                          >
                            <Trash2 size={11} />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog 
        isOpen={deleteId !== null}
        title="Move to Recycle Bin?"
        message={`Are you sure you want to delete ${deleteNo}? It will be moved to your company Recycle Bin where it can be restored anytime.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteId(null);
          setDeleteNo('');
        }}
      />

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog 
        isOpen={cancelId !== null}
        title="Cancel Delivery Challan?"
        message={`Are you sure you want to cancel ${cancelNo}? This will mark it as CANCELLED on the document and PDF exports.`}
        confirmText="Cancel Challan"
        cancelText="Back"
        onConfirm={handleConfirmCancel}
        onCancel={() => {
          setCancelId(null);
          setCancelNo('');
        }}
      />
    </div>
  );
}
