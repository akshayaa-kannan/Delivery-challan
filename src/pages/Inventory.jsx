import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Package,
  Boxes, 
  Warehouse, 
  ArrowRightLeft, 
  Sliders, 
  FileText, 
  BarChart, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Truck, 
  ArrowDownLeft, 
  MoreVertical, 
  Eye, 
  Edit, 
  Trash2, 
  ExternalLink,
  ChevronRight,
  TrendingDown,
  Building,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Send
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  getWarehouses, 
  getStockBalances, 
  getInventorySummary, 
  getInventoryMovements, 
  getStockAdjustments, 
  getWarehouseTransfers, 
  getGoodsReceipts, 
  dispatchWarehouseTransfer, 
  deleteWarehouse, 
  updateWarehouseStatus,
  saveWarehouse,
  MOVEMENT_TYPES,
  TRANSFER_STATUSES
} from '../utils/tenantStorage';

// Modals
import WarehouseModal from '../components/WarehouseModal';
import StockAdjustmentModal from '../components/StockAdjustmentModal';
import GoodsReceiptModal from '../components/GoodsReceiptModal';
import TransferModal from '../components/TransferModal';
import ReceiveTransferModal from '../components/ReceiveTransferModal';

export default function Inventory() {
  const { currentCompany, currentUser, isAdmin } = useAuth();
  const companyId = currentCompany?.id;

  // Active Tab: 'overview' | 'warehouses' | 'transfers' | 'adjustments' | 'ledger' | 'reports'
  const [activeTab, setActiveTab] = useState('overview');

  // Loading & Error States
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Primary Data
  const [summary, setSummary] = useState({
    totalActiveProducts: 0,
    totalWarehouses: 0,
    stockByUnit: [],
    lowStockCount: 0,
    outOfStockCount: 0,
    inTransitCount: 0,
    pendingTransfersCount: 0,
    recentMovements: []
  });
  const [stockBalances, setStockBalances] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [movements, setMovements] = useState([]);

  // Modals state
  const [warehouseModalOpen, setWarehouseModalOpen] = useState(false);
  const [selectedWarehouseForEdit, setSelectedWarehouseForEdit] = useState(null);

  const [adjustmentModalOpen, setAdjustmentModalOpen] = useState(false);
  const [adjustmentModalMode, setAdjustmentModalMode] = useState('ADJUSTMENT');
  const [preselectedProdId, setPreselectedProdId] = useState(null);
  const [preselectedWhId, setPreselectedWhId] = useState(null);

  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [selectedTransferForReceive, setSelectedTransferForReceive] = useState(null);

  // Filters
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [stockStatusFilter, setStockStatusFilter] = useState('ALL');

  useEffect(() => {
    const filterParam = searchParams.get('filter');
    if (filterParam) {
      if (filterParam === 'LOW_STOCK') {
        setActiveTab('overview');
        setStockStatusFilter('LOW STOCK');
      } else if (filterParam === 'OUT_OF_STOCK') {
        setActiveTab('overview');
        setStockStatusFilter('OUT OF STOCK');
      }
    }
  }, [searchParams]);

  // Ledger filters
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState('ALL');
  const [ledgerWhFilter, setLedgerWhFilter] = useState('ALL');
  const [ledgerStartDate, setLedgerStartDate] = useState('');
  const [ledgerEndDate, setLedgerEndDate] = useState('');

  // Report subtab filter
  const [reportType, setReportType] = useState('STOCK_SUMMARY');

  // Pagination for stock summary
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Load All Inventory Data
  const loadData = async () => {
    if (!companyId) return;
    setLoading(true);
    setActionError('');
    try {
      const [sum, balances, whs, trfs, adjs, rcpts, movs] = await Promise.all([
        getInventorySummary(companyId),
        getStockBalances(companyId),
        getWarehouses(companyId),
        getWarehouseTransfers(companyId),
        getStockAdjustments(companyId),
        getGoodsReceipts(companyId),
        getInventoryMovements(companyId)
      ]);

      setSummary(sum || {});
      setStockBalances(balances || []);
      setWarehouses(whs || []);
      setTransfers(trfs || []);
      setAdjustments(adjs || []);
      setReceipts(rcpts || []);
      setMovements(movs || []);
    } catch (err) {
      console.error('Error loading inventory data:', err);
      setActionError('Failed to load inventory records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [companyId]);

  // Extract unique categories for filter dropdown
  const categoriesList = useMemo(() => {
    const set = new Set();
    stockBalances.forEach(b => {
      if (b.category) set.add(b.category);
    });
    return Array.from(set).sort();
  }, [stockBalances]);

  // Filtered Stock Balances
  const filteredBalances = useMemo(() => {
    return stockBalances.filter(item => {
      if (warehouseFilter !== 'ALL' && item.warehouseId !== warehouseFilter) {
        return false;
      }
      if (categoryFilter !== 'ALL' && item.category !== categoryFilter) {
        return false;
      }
      if (stockStatusFilter !== 'ALL' && item.stockStatus !== stockStatusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (item.productName || '').toLowerCase().includes(q);
        const matchSku = (item.sku || '').toLowerCase().includes(q);
        const matchWh = (item.warehouseName || '').toLowerCase().includes(q);
        if (!matchName && !matchSku && !matchWh) return false;
      }
      return true;
    });
  }, [stockBalances, warehouseFilter, categoryFilter, stockStatusFilter, searchQuery]);

  // Paginated Balances
  const paginatedBalances = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredBalances.slice(start, start + itemsPerPage);
  }, [filteredBalances, currentPage]);

  const totalPages = Math.ceil(filteredBalances.length / itemsPerPage) || 1;

  // Filtered Movements for Ledger
  const filteredMovements = useMemo(() => {
    return movements.filter(m => {
      if (ledgerWhFilter !== 'ALL' && m.warehouseId !== ledgerWhFilter) {
        return false;
      }
      if (ledgerTypeFilter !== 'ALL' && m.movementType !== ledgerTypeFilter) {
        return false;
      }
      if (ledgerStartDate && (m.effectiveDate || m.timestamp.split('T')[0]) < ledgerStartDate) {
        return false;
      }
      if (ledgerEndDate && (m.effectiveDate || m.timestamp.split('T')[0]) > ledgerEndDate) {
        return false;
      }
      if (searchQuery.trim() && activeTab === 'ledger') {
        const q = searchQuery.toLowerCase().trim();
        const match = 
          (m.productName || '').toLowerCase().includes(q) ||
          (m.productSku || '').toLowerCase().includes(q) ||
          (m.warehouseName || '').toLowerCase().includes(q) ||
          (m.transactionNumber || '').toLowerCase().includes(q) ||
          (m.referenceNumber || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [movements, ledgerWhFilter, ledgerTypeFilter, ledgerStartDate, ledgerEndDate, searchQuery, activeTab]);

  // Handle Dispatch Transfer from list
  const handleDispatchTransfer = async (transferId) => {
    setActionError('');
    try {
      await dispatchWarehouseTransfer(companyId, transferId, currentUser);
      setActionSuccess('Transfer dispatched successfully and stock moved to In Transit.');
      loadData();
    } catch (err) {
      setActionError(err.message || 'Failed to dispatch transfer.');
    }
  };

  // Handle Warehouse Deletion
  const handleDeleteWarehouse = async (warehouseId) => {
    if (!window.confirm('Are you sure you want to delete this warehouse?')) return;
    setActionError('');
    try {
      const res = await deleteWarehouse(companyId, warehouseId);
      if (!res.success) {
        setActionError(res.message);
      } else {
        setActionSuccess('Warehouse deleted successfully.');
        loadData();
      }
    } catch (err) {
      setActionError(err.message || 'Failed to delete warehouse.');
    }
  };

  // CSV Export Helpers
  const exportStockCSV = () => {
    const headers = ['Product Name', 'SKU / Code', 'Category', 'Warehouse', 'On Hand', 'In Transit', 'Available', 'Unit', 'Reorder Level', 'Stock Status', 'Last Movement'];
    const rows = filteredBalances.map(b => [
      `"${b.productName.replace(/"/g, '""')}"`,
      `"${b.sku}"`,
      `"${b.category}"`,
      `"${b.warehouseName}"`,
      b.onHandQuantity,
      b.inTransitQuantity,
      b.availableQuantity,
      b.unit,
      b.reorderLevel,
      b.stockStatus,
      b.lastMovementDate || 'Never'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `inventory_summary_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportLedgerCSV = () => {
    const headers = ['Transaction #', 'Date', 'Product', 'SKU', 'Warehouse', 'Movement Type', 'Direction', 'Quantity', 'Balance After', 'Unit', 'Reference Type', 'Reference #', 'Reason', 'User'];
    const rows = filteredMovements.map(m => [
      `"${m.transactionNumber}"`,
      `"${m.effectiveDate || m.timestamp.split('T')[0]}"`,
      `"${m.productName.replace(/"/g, '""')}"`,
      `"${m.productSku || ''}"`,
      `"${m.warehouseName}"`,
      `"${m.movementType}"`,
      `"${m.movementDirection}"`,
      m.quantity,
      m.newBalance,
      `"${m.unit}"`,
      `"${m.referenceType}"`,
      `"${m.referenceNumber || ''}"`,
      `"${(m.reason || '').replace(/"/g, '""')}"`,
      `"${m.createdBy}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `inventory_ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans select-none pb-16">
      
      {/* Top Banner / Navigation */}
      <div className="bg-slate-900/90 border-b border-slate-800 sticky top-0 z-20 backdrop-blur-md px-4 sm:px-8 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Boxes size={22} />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  Inventory & Warehouses
                  <span className="text-[10px] uppercase font-bold tracking-widest bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                    Module 6
                  </span>
                </h1>
                <p className="text-xs text-slate-400">
                  Track multi-warehouse stock, ledger movements, challan issues, and goods transfers
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setPreselectedProdId(null);
                setPreselectedWhId(null);
                setAdjustmentModalMode('OPENING_STOCK');
                setAdjustmentModalOpen(true);
              }}
              className="px-3 py-1.5 text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <Plus size={14} className="text-amber-400" /> Opening Stock
            </button>
            <button
              onClick={() => setReceiptModalOpen(true)}
              className="px-3 py-1.5 text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <ArrowDownLeft size={14} className="text-emerald-400" /> Goods Receipt
            </button>
            <button
              onClick={() => {
                setPreselectedProdId(null);
                setPreselectedWhId(null);
                setAdjustmentModalMode('ADJUSTMENT');
                setAdjustmentModalOpen(true);
              }}
              className="px-3 py-1.5 text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <Sliders size={14} className="text-amber-400" /> Adjust Stock
            </button>
            <button
              onClick={() => setTransferModalOpen(true)}
              className="px-3 py-1.5 text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <ArrowRightLeft size={14} className="text-blue-400" /> Transfer Stock
            </button>
            <button
              onClick={() => {
                setSelectedWarehouseForEdit(null);
                setWarehouseModalOpen(true);
              }}
              className="px-3.5 py-1.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all shadow-md shadow-amber-400/20 flex items-center gap-1.5"
            >
              <Warehouse size={14} /> New Warehouse
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto scrollbar-none gap-2 mt-4 pt-2 border-t border-slate-800/80">
          {[
            { id: 'overview', label: 'Overview & Stock Summary', icon: Boxes },
            { id: 'warehouses', label: 'Warehouse Directory', icon: Warehouse },
            { id: 'transfers', label: 'Stock Transfers', icon: ArrowRightLeft, badge: summary.pendingTransfersCount },
            { id: 'adjustments', label: 'Adjustments & Receipts', icon: Sliders },
            { id: 'ledger', label: 'Movement Ledger', icon: FileText },
            { id: 'reports', label: 'Inventory Reports', icon: BarChart }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setActionError('');
                  setActionSuccess('');
                }}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
                {tab.badge > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    isActive ? 'bg-slate-950 text-amber-300' : 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Container */}
      <div className="px-4 sm:px-8 pt-6 max-w-7xl mx-auto w-full flex-1">
        
        {/* Success / Error Alerts */}
        {actionError && (
          <div className="mb-4 flex items-center justify-between p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-xs sm:text-sm font-medium">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="shrink-0 text-rose-400" />
              <span>{actionError}</span>
            </div>
            <button onClick={() => setActionError('')} className="text-rose-400 hover:text-white">
              <XCircle size={18} />
            </button>
          </div>
        )}
        {actionSuccess && (
          <div className="mb-4 flex items-center justify-between p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs sm:text-sm font-medium">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
              <span>{actionSuccess}</span>
            </div>
            <button onClick={() => setActionSuccess('')} className="text-emerald-400 hover:text-white">
              <XCircle size={18} />
            </button>
          </div>
        )}

        {/* TAB 1: OVERVIEW & STOCK SUMMARY */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            
            {/* Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              <div className="p-3.5 bg-slate-800/80 border border-slate-700/60 rounded-2xl">
                <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Active Products</span>
                <div className="text-lg sm:text-xl font-black text-white mt-1">
                  {summary.totalActiveProducts}
                </div>
              </div>

              <div className="p-3.5 bg-slate-800/80 border border-slate-700/60 rounded-2xl">
                <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Warehouses</span>
                <div className="text-lg sm:text-xl font-black text-white mt-1">
                  {summary.totalWarehouses}
                </div>
              </div>

              <div className="p-3.5 bg-slate-800/80 border border-slate-700/60 rounded-2xl col-span-2">
                <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Stock by Compatible Units</span>
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  {summary.stockByUnit.length > 0 ? (
                    summary.stockByUnit.map(u => (
                      <span key={u.unit} className="px-2 py-0.5 rounded-lg bg-amber-400/10 text-amber-300 border border-amber-400/20 text-xs font-mono font-bold">
                        {u.quantity} {u.unit}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500">0 Stock recorded</span>
                  )}
                </div>
              </div>

              <div className="p-3.5 bg-slate-800/80 border border-slate-700/60 rounded-2xl">
                <span className="text-[10px] font-bold tracking-wider text-amber-400 uppercase">Low Stock</span>
                <div className="text-lg sm:text-xl font-black text-amber-400 mt-1">
                  {summary.lowStockCount}
                </div>
              </div>

              <div className="p-3.5 bg-slate-800/80 border border-slate-700/60 rounded-2xl">
                <span className="text-[10px] font-bold tracking-wider text-rose-400 uppercase">Out of Stock</span>
                <div className="text-lg sm:text-xl font-black text-rose-400 mt-1">
                  {summary.outOfStockCount}
                </div>
              </div>

              <div className="p-3.5 bg-slate-800/80 border border-slate-700/60 rounded-2xl">
                <span className="text-[10px] font-bold tracking-wider text-blue-400 uppercase">In Transit</span>
                <div className="text-lg sm:text-xl font-black text-blue-400 mt-1">
                  {summary.inTransitCount}
                </div>
              </div>
            </div>

            {/* Filters & Search Toolbar */}
            <div className="p-4 bg-slate-800/60 border border-slate-700/60 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="relative w-full md:w-80">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  placeholder="Search product, SKU, warehouse..."
                  className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <select
                  value={warehouseFilter}
                  onChange={(e) => { setWarehouseFilter(e.target.value); setCurrentPage(1); }}
                  className="px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="ALL">All Warehouses</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>

                <select
                  value={categoryFilter}
                  onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
                  className="px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="ALL">All Categories</option>
                  {categoriesList.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>

                <select
                  value={stockStatusFilter}
                  onChange={(e) => { setStockStatusFilter(e.target.value); setCurrentPage(1); }}
                  className="px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="In Stock">In Stock</option>
                  <option value="Low Stock">Low Stock</option>
                  <option value="Out of Stock">Out of Stock</option>
                </select>

                <button
                  onClick={exportStockCSV}
                  className="px-3 py-2 text-xs font-bold text-slate-300 bg-slate-900 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <Download size={14} /> Export CSV
                </button>
              </div>
            </div>

            {/* Stock Summary Table */}
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-700/60">
                    <tr>
                      <th className="py-3 px-4">Product Name</th>
                      <th className="py-3 px-3">SKU / Code</th>
                      <th className="py-3 px-3">Category</th>
                      <th className="py-3 px-3">Warehouse</th>
                      <th className="py-3 px-3 text-right">On Hand</th>
                      <th className="py-3 px-3 text-right">In Transit</th>
                      <th className="py-3 px-3 text-right">Available</th>
                      <th className="py-3 px-2 text-center">Unit</th>
                      <th className="py-3 px-3 text-center">Status</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {paginatedBalances.length > 0 ? (
                      paginatedBalances.map((item, idx) => {
                        const isLow = item.stockStatus === 'Low Stock';
                        const isOut = item.stockStatus === 'Out of Stock';

                        return (
                          <tr key={`${item.productId}_${item.warehouseId}_${idx}`} className="hover:bg-slate-700/30 transition-colors">
                            <td className="py-3 px-4 font-bold text-white">
                              {item.productName}
                            </td>
                            <td className="py-3 px-3 font-mono font-semibold text-slate-400">
                              {item.sku || '-'}
                            </td>
                            <td className="py-3 px-3 text-slate-300">
                              {item.category}
                            </td>
                            <td className="py-3 px-3 font-medium text-slate-300">
                              {item.warehouseName}
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-extrabold text-white">
                              {item.onHandQuantity}
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-semibold text-blue-400">
                              {item.inTransitQuantity > 0 ? item.inTransitQuantity : '-'}
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-extrabold text-emerald-400">
                              {item.availableQuantity}
                            </td>
                            <td className="py-3 px-2 text-center font-mono font-bold text-slate-400">
                              {item.unit}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                isOut
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : isLow
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              }`}>
                                {item.stockStatus}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <button
                                onClick={() => {
                                  setPreselectedProdId(item.productId);
                                  setPreselectedWhId(item.warehouseId);
                                  setAdjustmentModalMode('ADJUSTMENT');
                                  setAdjustmentModalOpen(true);
                                }}
                                className="px-2.5 py-1 text-[11px] font-bold text-amber-300 hover:text-white bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/20 rounded-lg transition-colors"
                              >
                                Adjust
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-slate-400">
                          <Package size={32} className="mx-auto mb-2 text-slate-600 opacity-60" />
                          <p className="font-semibold">No stock balances matching current filters</p>
                          <p className="text-xs text-slate-500 mt-1">Record an opening stock or goods receipt to establish inventory</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-4 py-3 bg-slate-950 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
                  <div>
                    Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredBalances.length)} of {filteredBalances.length} records
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 font-bold"
                    >
                      Prev
                    </button>
                    <span className="font-mono px-2 font-bold text-white">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 font-bold"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: WAREHOUSE DIRECTORY */}
        {activeTab === 'warehouses' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Warehouse Directory</h2>
                <p className="text-xs text-slate-400">Manage plant storage, branch warehouses, and project site depots</p>
              </div>
              <button
                onClick={() => {
                  setSelectedWarehouseForEdit(null);
                  setWarehouseModalOpen(true);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all shadow-md shadow-amber-400/20 flex items-center gap-1.5"
              >
                <Plus size={15} /> Add Warehouse
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {warehouses.map(wh => (
                <div 
                  key={wh.id}
                  className="p-5 bg-slate-800/80 border border-slate-700/60 rounded-2xl flex flex-col justify-between hover:border-slate-600 transition-all shadow-lg"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                            {wh.warehouseCode}
                          </span>
                          {wh.isDefault && (
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                              Default
                            </span>
                          )}
                        </div>
                        <h3 className="text-base font-bold text-white mt-1.5">{wh.name}</h3>
                        <p className="text-xs text-slate-400">{wh.warehouseType}</p>
                      </div>

                      <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded-full ${
                        wh.status === 'Active' 
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                          : 'bg-slate-700 text-slate-400'
                      }`}>
                        {wh.status}
                      </span>
                    </div>

                    {/* Address & Contact */}
                    <div className="space-y-1.5 text-xs text-slate-300 pt-2 border-t border-slate-700/40">
                      {(wh.city || wh.state) && (
                        <div className="flex items-center gap-2 text-slate-400">
                          <MapPin size={13} className="shrink-0 text-amber-400" />
                          <span>{[wh.city, wh.state, wh.pinCode].filter(Boolean).join(', ')}</span>
                        </div>
                      )}
                      {wh.contactPerson && (
                        <div className="flex items-center gap-2 text-slate-400">
                          <User size={13} className="shrink-0 text-amber-400" />
                          <span>{wh.contactPerson}</span>
                        </div>
                      )}
                      {wh.phone && (
                        <div className="flex items-center gap-2 text-slate-400">
                          <Phone size={13} className="shrink-0 text-amber-400" />
                          <span>{wh.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-700/50">
                    <button
                      onClick={() => {
                        setSelectedWarehouseForEdit(wh);
                        setWarehouseModalOpen(true);
                      }}
                      className="px-2.5 py-1 text-xs font-semibold text-slate-300 hover:text-white bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Edit size={13} /> Edit
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={async () => {
                          const nextStatus = wh.status === 'Active' ? 'Inactive' : 'Active';
                          await updateWarehouseStatus(companyId, wh.id, nextStatus);
                          loadData();
                        }}
                        className="px-2.5 py-1 text-xs font-semibold text-slate-400 hover:text-white rounded-lg transition-colors"
                      >
                        {wh.status === 'Active' ? 'Deactivate' : 'Reactivate'}
                      </button>

                      <button
                        onClick={() => handleDeleteWarehouse(wh.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Delete Warehouse"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: STOCK TRANSFERS */}
        {activeTab === 'transfers' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Multi-Warehouse Transfers</h2>
                <p className="text-xs text-slate-400">Audit transfers between locations with in-transit reconciliation</p>
              </div>
              <button
                onClick={() => setTransferModalOpen(true)}
                className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all shadow-md shadow-amber-400/20 flex items-center gap-1.5"
              >
                <Plus size={15} /> New Transfer
              </button>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-700/60">
                  <tr>
                    <th className="py-3 px-4">Transfer #</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">From (Source)</th>
                    <th className="py-3 px-3">To (Destination)</th>
                    <th className="py-3 px-4">Items Summary</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {transfers.length > 0 ? (
                    transfers.map(trf => {
                      const isInTransit = trf.status === TRANSFER_STATUSES.IN_TRANSIT;
                      const isDraft = trf.status === TRANSFER_STATUSES.DRAFT;
                      const isPartial = trf.status === TRANSFER_STATUSES.PARTIALLY_RECEIVED;
                      const isReceived = trf.status === TRANSFER_STATUSES.RECEIVED;

                      return (
                        <tr key={trf.id} className="hover:bg-slate-700/30 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-amber-400">
                            {trf.transferNumber}
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-300">
                            {trf.transferDate}
                          </td>
                          <td className="py-3 px-3 font-medium text-white">
                            {trf.sourceWarehouseName}
                          </td>
                          <td className="py-3 px-3 font-medium text-white">
                            {trf.destinationWarehouseName}
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            {(trf.items || []).map(i => `${i.productName} (${i.requestedQuantity} ${i.unit})`).join(', ')}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              isReceived
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : isInTransit
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                : isPartial
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-slate-700 text-slate-300'
                            }`}>
                              {trf.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            {isDraft && (
                              <button
                                onClick={() => handleDispatchTransfer(trf.id)}
                                className="px-3 py-1 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors inline-flex items-center gap-1"
                              >
                                <Send size={12} /> Dispatch
                              </button>
                            )}
                            {(isInTransit || isPartial) && (
                              <button
                                onClick={() => {
                                  setSelectedTransferForReceive(trf);
                                  setReceiveModalOpen(true);
                                }}
                                className="px-3 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors inline-flex items-center gap-1"
                              >
                                <CheckCircle2 size={12} /> Receive
                              </button>
                            )}
                            {isReceived && (
                              <span className="text-[11px] font-medium text-slate-500">Completed</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        No warehouse transfers recorded yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: ADJUSTMENTS & RECEIPTS */}
        {activeTab === 'adjustments' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Goods Receipts (GRN) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <ArrowDownLeft size={18} className="text-emerald-400" /> Goods Receipts (GRN)
                    </h3>
                    <p className="text-xs text-slate-400">Purchases and supplier inwards</p>
                  </div>
                  <button
                    onClick={() => setReceiptModalOpen(true)}
                    className="px-3 py-1.5 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-all"
                  >
                    + New Receipt
                  </button>
                </div>

                <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl overflow-hidden shadow-lg">
                  <div className="overflow-x-auto max-h-96">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-700/60 sticky top-0">
                        <tr>
                          <th className="py-2.5 px-3">GRN #</th>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Destination</th>
                          <th className="py-2.5 px-3">Supplier / Ref</th>
                          <th className="py-2.5 px-3">Items</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/50">
                        {receipts.length > 0 ? (
                          receipts.map(r => (
                            <tr key={r.id} className="hover:bg-slate-700/30">
                              <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">
                                {r.receiptNumber}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-400">
                                {r.receiptDate}
                              </td>
                              <td className="py-2.5 px-3 text-white font-medium">
                                {r.destinationWarehouseName}
                              </td>
                              <td className="py-2.5 px-3 text-slate-300">
                                {r.supplierName || r.referenceNumber || '-'}
                              </td>
                              <td className="py-2.5 px-3 text-slate-400">
                                {(r.items || []).map(i => `${i.productName} (${i.quantity} ${i.unit})`).join(', ')}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-slate-500">
                              No goods receipts posted yet
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Stock Adjustments Register */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Sliders size={18} className="text-amber-400" /> Stock Adjustments
                    </h3>
                    <p className="text-xs text-slate-400">Count variances, damage, and audit corrections</p>
                  </div>
                  <button
                    onClick={() => {
                      setAdjustmentModalMode('ADJUSTMENT');
                      setAdjustmentModalOpen(true);
                    }}
                    className="px-3 py-1.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all"
                  >
                    + New Adjustment
                  </button>
                </div>

                <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl overflow-hidden shadow-lg">
                  <div className="overflow-x-auto max-h-96">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-700/60 sticky top-0">
                        <tr>
                          <th className="py-2.5 px-3">Adj #</th>
                          <th className="py-2.5 px-3">Product</th>
                          <th className="py-2.5 px-3">Type</th>
                          <th className="py-2.5 px-3 text-right">Change</th>
                          <th className="py-2.5 px-3">Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/50">
                        {adjustments.length > 0 ? (
                          adjustments.map(a => (
                            <tr key={a.id} className="hover:bg-slate-700/30">
                              <td className="py-2.5 px-3 font-mono font-bold text-amber-400">
                                {a.adjustmentNumber}
                              </td>
                              <td className="py-2.5 px-3 text-white font-medium">
                                {a.productName}
                              </td>
                              <td className="py-2.5 px-3 text-slate-400">
                                {a.adjustmentType}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                                {a.direction === 'IN' ? `+${a.quantity}` : `-${a.quantity}`} {a.unit}
                              </td>
                              <td className="py-2.5 px-3 text-slate-400 truncate max-w-xs" title={a.reason}>
                                {a.reason}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-slate-500">
                              No stock adjustments posted yet
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 5: AUDIT MOVEMENT LEDGER */}
        {activeTab === 'ledger' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">Authoritative Inventory Ledger</h2>
                <p className="text-xs text-slate-400">Chronological, append-only audit trail of every stock transaction</p>
              </div>
              <button
                onClick={exportLedgerCSV}
                className="px-3.5 py-2 text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Download size={15} /> Export Ledger CSV
              </button>
            </div>

            {/* Ledger Filters */}
            <div className="p-4 bg-slate-800/60 border border-slate-700/60 rounded-2xl flex flex-wrap items-center gap-3">
              <div className="w-full sm:w-60">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter product, SKU, transaction..."
                  className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <select
                value={ledgerWhFilter}
                onChange={(e) => setLedgerWhFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="ALL">All Warehouses</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>

              <select
                value={ledgerTypeFilter}
                onChange={(e) => setLedgerTypeFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="ALL">All Movement Types</option>
                {Object.values(MOVEMENT_TYPES).map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>

              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400">From:</span>
                <input
                  type="date"
                  value={ledgerStartDate}
                  onChange={(e) => setLedgerStartDate(e.target.value)}
                  className="px-2.5 py-1 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400">To:</span>
                <input
                  type="date"
                  value={ledgerEndDate}
                  onChange={(e) => setLedgerEndDate(e.target.value)}
                  className="px-2.5 py-1 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                />
              </div>
            </div>

            {/* Ledger Table */}
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-700/60">
                    <tr>
                      <th className="py-3 px-4">Transaction #</th>
                      <th className="py-3 px-3">Date & Time</th>
                      <th className="py-3 px-4">Product Name</th>
                      <th className="py-3 px-3">Warehouse</th>
                      <th className="py-3 px-3">Movement Type</th>
                      <th className="py-3 px-3 text-right">In / Out</th>
                      <th className="py-3 px-3 text-right">Balance After</th>
                      <th className="py-3 px-3">Reference</th>
                      <th className="py-3 px-4">Reason / Notes</th>
                      <th className="py-3 px-3">User</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {filteredMovements.length > 0 ? (
                      filteredMovements.map(m => {
                        const isIn = m.movementDirection === 'IN';
                        return (
                          <tr key={m.id} className="hover:bg-slate-700/30 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-amber-400">
                              {m.transactionNumber}
                            </td>
                            <td className="py-3 px-3 font-mono text-slate-400">
                              {m.effectiveDate || m.timestamp.split('T')[0]}
                            </td>
                            <td className="py-3 px-4 font-bold text-white">
                              {m.productName}
                              {m.productSku && (
                                <span className="block text-[10px] font-mono text-slate-500 font-normal">
                                  {m.productSku}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-slate-300">
                              {m.warehouseName}
                            </td>
                            <td className="py-3 px-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                m.movementType === MOVEMENT_TYPES.CHALLAN_ISSUE
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : m.movementType === MOVEMENT_TYPES.CUSTOMER_RETURN_ACCEPTED
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : m.movementType === MOVEMENT_TYPES.GOODS_RECEIPT
                                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                  : m.movementType === MOVEMENT_TYPES.OPENING_STOCK
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              }`}>
                                {m.movementType}
                              </span>
                            </td>
                            <td className={`py-3 px-3 text-right font-mono font-extrabold ${
                              isIn ? 'text-emerald-400' : 'text-rose-400'
                            }`}>
                              {isIn ? `+${m.quantity}` : `-${m.quantity}`} {m.unit}
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-extrabold text-white">
                              {m.newBalance} {m.unit}
                            </td>
                            <td className="py-3 px-3 font-mono text-slate-400">
                              {m.referenceNumber || m.referenceType}
                            </td>
                            <td className="py-3 px-4 text-slate-400 truncate max-w-xs" title={m.reason}>
                              {m.reason}
                            </td>
                            <td className="py-3 px-3 text-slate-400 text-[11px]">
                              {m.createdBy}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-slate-500">
                          No stock movements match current filter criteria
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: INVENTORY REPORTS */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">Inventory Reports</h2>
                <p className="text-xs text-slate-400">Exportable analytical reports across stock, returns, and transfer operations</p>
              </div>
              <button
                onClick={exportStockCSV}
                className="px-3.5 py-2 text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Download size={15} /> Export Report CSV
              </button>
            </div>

            {/* Report Selector Pills */}
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'STOCK_SUMMARY', label: 'Stock Summary Report' },
                { id: 'LOW_STOCK', label: 'Low Stock & Replenishment' },
                { id: 'CHALLAN_ISSUES', label: 'Challan Issue Report' },
                { id: 'RETURNS', label: 'Returns Accepted Report' },
                { id: 'TRANSFERS', label: 'Warehouse Transfers Report' },
                { id: 'ADJUSTMENTS', label: 'Stock Adjustments Audit' }
              ].map(rep => (
                <button
                  key={rep.id}
                  onClick={() => setReportType(rep.id)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                    reportType === rep.id
                      ? 'bg-amber-400 text-slate-950 font-black'
                      : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                  }`}
                >
                  {rep.label}
                </button>
              ))}
            </div>

            {/* Report Render */}
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl overflow-hidden shadow-xl p-4">
              {reportType === 'STOCK_SUMMARY' && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-white">Consolidated Stock Summary</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider">
                        <tr>
                          <th className="py-2.5 px-3">Product</th>
                          <th className="py-2.5 px-3">Warehouse</th>
                          <th className="py-2.5 px-3 text-right">On Hand</th>
                          <th className="py-2.5 px-3 text-right">In Transit</th>
                          <th className="py-2.5 px-3 text-right">Available</th>
                          <th className="py-2.5 px-3 text-center">Unit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/50">
                        {stockBalances.map((b, i) => (
                          <tr key={i} className="hover:bg-slate-700/30">
                            <td className="py-2.5 px-3 font-semibold text-white">{b.productName}</td>
                            <td className="py-2.5 px-3 text-slate-300">{b.warehouseName}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-white">{b.onHandQuantity}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-blue-400">{b.inTransitQuantity}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">{b.availableQuantity}</td>
                            <td className="py-2.5 px-3 text-center font-mono">{b.unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {reportType === 'LOW_STOCK' && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-amber-400">Products At or Below Reorder Threshold</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider">
                        <tr>
                          <th className="py-2.5 px-3">Product</th>
                          <th className="py-2.5 px-3">Warehouse</th>
                          <th className="py-2.5 px-3 text-right">Current Stock</th>
                          <th className="py-2.5 px-3 text-right">Reorder Level</th>
                          <th className="py-2.5 px-3 text-center">Deficit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/50">
                        {stockBalances.filter(b => b.reorderLevel > 0 && b.onHandQuantity <= b.reorderLevel).map((b, i) => (
                          <tr key={i} className="hover:bg-slate-700/30">
                            <td className="py-2.5 px-3 font-semibold text-white">{b.productName}</td>
                            <td className="py-2.5 px-3 text-slate-300">{b.warehouseName}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-400">{b.onHandQuantity} {b.unit}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-amber-400">{b.reorderLevel} {b.unit}</td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-rose-300">
                              {Math.max(0, b.reorderLevel - b.onHandQuantity)} {b.unit}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {reportType === 'CHALLAN_ISSUES' && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-white">Stock Deductions against Delivery Challans</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider">
                        <tr>
                          <th className="py-2.5 px-3">Challan Ref</th>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Product</th>
                          <th className="py-2.5 px-3">Warehouse</th>
                          <th className="py-2.5 px-3 text-right">Quantity Issued</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/50">
                        {movements.filter(m => m.movementType === MOVEMENT_TYPES.CHALLAN_ISSUE).map((m, i) => (
                          <tr key={i} className="hover:bg-slate-700/30">
                            <td className="py-2.5 px-3 font-mono font-bold text-amber-400">{m.referenceNumber}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-400">{m.effectiveDate || m.timestamp.split('T')[0]}</td>
                            <td className="py-2.5 px-3 font-medium text-white">{m.productName}</td>
                            <td className="py-2.5 px-3 text-slate-300">{m.warehouseName}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-400">-{m.quantity} {m.unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {reportType === 'RETURNS' && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-white">Customer Returns Credited into Usable Stock</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider">
                        <tr>
                          <th className="py-2.5 px-3">Original DC #</th>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Product</th>
                          <th className="py-2.5 px-3">Warehouse</th>
                          <th className="py-2.5 px-3 text-right">Accepted Quantity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/50">
                        {movements.filter(m => m.movementType === MOVEMENT_TYPES.CUSTOMER_RETURN_ACCEPTED).map((m, i) => (
                          <tr key={i} className="hover:bg-slate-700/30">
                            <td className="py-2.5 px-3 font-mono font-bold text-amber-400">{m.referenceNumber}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-400">{m.effectiveDate || m.timestamp.split('T')[0]}</td>
                            <td className="py-2.5 px-3 font-medium text-white">{m.productName}</td>
                            <td className="py-2.5 px-3 text-slate-300">{m.warehouseName}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">+{m.quantity} {m.unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {reportType === 'TRANSFERS' && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-white">Warehouse Transfers History</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider">
                        <tr>
                          <th className="py-2.5 px-3">Transfer #</th>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Source</th>
                          <th className="py-2.5 px-3">Destination</th>
                          <th className="py-2.5 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/50">
                        {transfers.map((t, i) => (
                          <tr key={i} className="hover:bg-slate-700/30">
                            <td className="py-2.5 px-3 font-mono font-bold text-amber-400">{t.transferNumber}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-400">{t.transferDate}</td>
                            <td className="py-2.5 px-3 text-white">{t.sourceWarehouseName}</td>
                            <td className="py-2.5 px-3 text-white">{t.destinationWarehouseName}</td>
                            <td className="py-2.5 px-3 font-bold text-slate-300">{t.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {reportType === 'ADJUSTMENTS' && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-white">Stock Adjustments Audit Log</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider">
                        <tr>
                          <th className="py-2.5 px-3">Adj #</th>
                          <th className="py-2.5 px-3">Product</th>
                          <th className="py-2.5 px-3">Warehouse</th>
                          <th className="py-2.5 px-3">Type</th>
                          <th className="py-2.5 px-3 text-right">Change</th>
                          <th className="py-2.5 px-3">Reason</th>
                          <th className="py-2.5 px-3">Recorded By</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/50">
                        {adjustments.map((a, i) => (
                          <tr key={i} className="hover:bg-slate-700/30">
                            <td className="py-2.5 px-3 font-mono font-bold text-amber-400">{a.adjustmentNumber}</td>
                            <td className="py-2.5 px-3 font-medium text-white">{a.productName}</td>
                            <td className="py-2.5 px-3 text-slate-300">{a.warehouseName}</td>
                            <td className="py-2.5 px-3 text-slate-400">{a.adjustmentType}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                              {a.direction === 'IN' ? `+${a.quantity}` : `-${a.quantity}`} {a.unit}
                            </td>
                            <td className="py-2.5 px-3 text-slate-300">{a.reason}</td>
                            <td className="py-2.5 px-3 text-slate-400">{a.recordedBy}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Modals */}
      {warehouseModalOpen && (
        <WarehouseModal
          isOpen={warehouseModalOpen}
          onClose={() => setWarehouseModalOpen(false)}
          warehouse={selectedWarehouseForEdit}
          companyId={companyId}
          onSave={() => {
            setActionSuccess('Warehouse saved successfully.');
            loadData();
          }}
        />
      )}

      {adjustmentModalOpen && (
        <StockAdjustmentModal
          isOpen={adjustmentModalOpen}
          onClose={() => setAdjustmentModalOpen(false)}
          companyId={companyId}
          currentUser={currentUser}
          preselectedProductId={preselectedProdId}
          preselectedWarehouseId={preselectedWhId}
          initialMode={adjustmentModalMode}
          onSuccess={() => {
            setActionSuccess(adjustmentModalMode === 'OPENING_STOCK' ? 'Opening stock saved.' : 'Adjustment posted successfully.');
            loadData();
          }}
        />
      )}

      {receiptModalOpen && (
        <GoodsReceiptModal
          isOpen={receiptModalOpen}
          onClose={() => setReceiptModalOpen(false)}
          companyId={companyId}
          currentUser={currentUser}
          onSuccess={() => {
            setActionSuccess('Goods receipt recorded successfully.');
            loadData();
          }}
        />
      )}

      {transferModalOpen && (
        <TransferModal
          isOpen={transferModalOpen}
          onClose={() => setTransferModalOpen(false)}
          companyId={companyId}
          currentUser={currentUser}
          onSuccess={() => {
            setActionSuccess('Warehouse transfer saved successfully.');
            loadData();
          }}
        />
      )}

      {receiveModalOpen && selectedTransferForReceive && (
        <ReceiveTransferModal
          isOpen={receiveModalOpen}
          onClose={() => {
            setReceiveModalOpen(false);
            setSelectedTransferForReceive(null);
          }}
          transfer={selectedTransferForReceive}
          companyId={companyId}
          currentUser={currentUser}
          onSuccess={() => {
            setActionSuccess('Transfer receipt confirmed into warehouse.');
            loadData();
          }}
        />
      )}

    </div>
  );
}
