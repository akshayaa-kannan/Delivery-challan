import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  BarChart, 
  Calendar, 
  Hash, 
  Package, 
  Printer, 
  Download, 
  Eye, 
  Filter, 
  Search, 
  RefreshCw, 
  Truck, 
  RotateCcw, 
  Boxes, 
  Users, 
  Scale, 
  FileText,
  ChevronLeft,
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  getReportData, 
  DATE_PRESETS, 
  getDateRangeBounds,
  formatDateISO,
  generateCSVString
} from '../utils/storage';
import { useAuth } from '../context/AuthContext';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

// 6 Structured Report Categories
const REPORT_CATEGORIES = [
  { id: 'challans', label: 'Delivery Challans', icon: FileText },
  { id: 'deliveries', label: 'Delivery Performance', icon: Truck },
  { id: 'returnables', label: 'Returnable Goods', icon: RotateCcw },
  { id: 'inventory', label: 'Inventory & Stock', icon: Boxes },
  { id: 'transport', label: 'Transport & Weight', icon: Scale },
  { id: 'masters', label: 'Customers & Products', icon: Users }
];

// Available Reports Catalog
const REPORT_CATALOG = [
  // Category A: Challans
  { id: 'challan_register', name: 'Delivery Challan Register', category: 'challans', description: 'Complete register of all delivery challans with consignee, item counts, and status' },
  { id: 'challan_status_summary', name: 'Challan Status Summary', category: 'challans', description: 'Aggregated breakdown of challans by current lifecycle status and percentage' },

  // Category B: Deliveries
  { id: 'pending_deliveries', name: 'Pending Deliveries Report', category: 'deliveries', description: 'Dispatched shipments that are in transit or awaiting delivery confirmation' },
  { id: 'overdue_deliveries', name: 'Overdue Deliveries Report', category: 'deliveries', description: 'Active shipments that have passed their expected delivery date' },

  // Category C: Returnables
  { id: 'outstanding_returnables', name: 'Outstanding Returnables', category: 'returnables', description: 'Customer returnable items awaiting physical return to company' },
  { id: 'returnable_aging', name: 'Returnable Aging Analysis', category: 'returnables', description: 'Overdue duration buckets (1-7 days, 8-30 days, >30 days) of returnable goods' },

  // Category D: Inventory
  { id: 'current_stock_summary', name: 'Current Stock Summary', category: 'inventory', description: 'Live physical on-hand stock balances across all registered warehouses' },
  { id: 'low_stock_report', name: 'Low Stock Report', category: 'inventory', description: 'Products at or below their configured minimum reorder threshold' },
  { id: 'inventory_movement_ledger', name: 'Inventory Movement Ledger', category: 'inventory', description: 'Complete audit trail of all inward receipts, issues, transfers and adjustments' },

  // Category E: Transport & Weight
  { id: 'transport_register', name: 'Transport & Dispatch Register', category: 'transport', description: 'Vehicles, LR numbers, weighbridge actual weights, and discrepancy status' },

  // Category F: Customers & Products
  { id: 'customer_activity', name: 'Customer Activity Report', category: 'masters', description: 'Delivery challan frequency, pending shipments, and return positions per customer' },
  { id: 'product_movement', name: 'Product Movement Analysis', category: 'masters', description: 'Dispatched volume and shipment frequency of master catalog items' }
];

export default function Reports() {
  const { currentCompany } = useAuth();

  const [activeCategory, setActiveCategory] = useState('challans');
  const [selectedReportId, setSelectedReportId] = useState('challan_register');

  // Filters
  const [datePreset, setDatePreset] = useState(DATE_PRESETS.THIS_MONTH);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Report Data
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Sorting
  const [sortKey, setSortKey] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');

  const reportContainerRef = useRef(null);

  // Filter available reports by current category
  const categoryReports = useMemo(() => {
    return REPORT_CATALOG.filter(r => r.category === activeCategory);
  }, [activeCategory]);

  // When category changes, select the first report of that category
  const handleCategorySelect = (catId) => {
    setActiveCategory(catId);
    const firstRep = REPORT_CATALOG.find(r => r.category === catId);
    if (firstRep) {
      setSelectedReportId(firstRep.id);
      setCurrentPage(1);
    }
  };

  // Fetch Report Data
  const fetchReport = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await getReportData(selectedReportId, {
        preset: datePreset,
        startDate: customStartDate || undefined,
        endDate: customEndDate || undefined
      });
      setReportData(data);
      setCurrentPage(1);
    } catch (err) {
      console.error("Failed to load report data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [selectedReportId, datePreset, customStartDate, customEndDate, currentCompany?.id]);

  // Filter and sort rows
  const processedRows = useMemo(() => {
    if (!reportData?.rows) return [];
    let rows = [...reportData.rows];

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      rows = rows.filter(r => {
        return Object.values(r).some(val => 
          val !== null && val !== undefined && String(val).toLowerCase().includes(q)
        );
      });
    }

    // Sort
    if (sortKey) {
      rows.sort((a, b) => {
        const valA = a[sortKey];
        const valB = b[sortKey];
        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
        
        const isNum = typeof valA === 'number' && typeof valB === 'number';
        let cmp = 0;
        if (isNum) {
          cmp = valA - valB;
        } else {
          cmp = String(valA).localeCompare(String(valB));
        }
        return sortDirection === 'asc' ? cmp : -cmp;
      });
    }

    return rows;
  }, [reportData?.rows, searchQuery, sortKey, sortDirection]);

  // Paginated rows
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedRows.slice(start, start + pageSize);
  }, [processedRows, currentPage, pageSize]);

  const totalPages = Math.ceil(processedRows.length / pageSize) || 1;

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    if (!reportData || processedRows.length === 0) return;
    const csvStr = generateCSVString(reportData.columns, processedRows);
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Nayaruvi_${selectedReportId}_${formatDateISO(new Date())}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // PDF Export
  const handleExportPDF = async () => {
    const el = document.getElementById('report-printable-area');
    if (!el) return;

    setIsExportingPDF(true);
    try {
      const canvas = await html2canvas(el, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Nayaruvi_${selectedReportId}_${formatDateISO(new Date())}.pdf`);
    } catch (error) {
      console.error('Failed to generate PDF report:', error);
      alert('Failed to generate PDF report. Please try CSV export.');
    } finally {
      setIsExportingPDF(false);
    }
  };

  const activeReportMeta = REPORT_CATALOG.find(r => r.id === selectedReportId);

  return (
    <div className="space-y-6 animate-fade-in font-sans text-slate-800 pb-12">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Reports Centre</h1>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
              Module 7
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500 mt-1">
            Generate, filter, and export audit-ready business reports across all operational modules.
          </p>
        </div>

        {/* Global Export Actions */}
        <div className="flex items-center gap-2.5">
          <button 
            onClick={() => fetchReport(true)}
            disabled={refreshing || loading}
            className="p-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh Report Data"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin text-amber-500' : ''} />
          </button>

          <button 
            onClick={handleExportCSV}
            disabled={loading || processedRows.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>

          <button 
            onClick={handleExportPDF}
            disabled={isExportingPDF || loading || processedRows.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black shadow-sm shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <Printer size={14} />
            <span>{isExportingPDF ? 'Generating...' : 'Print / PDF'}</span>
          </button>
        </div>
      </div>

      {/* 2. Category Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none print:hidden">
        {REPORT_CATEGORIES.map(cat => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => handleCategorySelect(cat.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                isActive 
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black' 
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-slate-950' : 'text-slate-500'} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Sub-Report Selector Buttons */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-100/80 p-2 rounded-2xl border border-slate-200/70 print:hidden">
        {categoryReports.map(rep => {
          const isSelected = selectedReportId === rep.id;
          return (
            <button
              key={rep.id}
              onClick={() => { setSelectedReportId(rep.id); setCurrentPage(1); }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isSelected
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
              }`}
            >
              {rep.name}
            </button>
          );
        })}
      </div>

      {/* 4. Filter & Search Controls Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 print:hidden">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            placeholder={`Search ${reportData?.title || 'report records'}...`}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50 focus:bg-white"
          />
        </div>

        {/* Date Preset Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 p-1 rounded-xl text-xs">
            <Calendar size={13} className="text-slate-400 ml-1.5" />
            <select
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 pr-2 py-1 focus:outline-none cursor-pointer"
            >
              <option value={DATE_PRESETS.TODAY}>Today</option>
              <option value={DATE_PRESETS.LAST_7_DAYS}>Last 7 Days</option>
              <option value={DATE_PRESETS.THIS_MONTH}>This Month</option>
              <option value={DATE_PRESETS.PREV_MONTH}>Previous Month</option>
              <option value={DATE_PRESETS.THIS_QUARTER}>This Quarter</option>
              <option value={DATE_PRESETS.THIS_YEAR}>This Year</option>
              <option value={DATE_PRESETS.CUSTOM}>Custom Range</option>
            </select>
          </div>

          {/* Custom Date Pickers */}
          {datePreset === DATE_PRESETS.CUSTOM && (
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 p-1 rounded-xl">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2 py-1 bg-white border border-slate-200 rounded text-xs font-mono"
              />
              <span className="text-xs text-slate-400 px-1">to</span>
              <input
                type="date"
                value={customEndDate}
                min={customStartDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2 py-1 bg-white border border-slate-200 rounded text-xs font-mono"
              />
            </div>
          )}

          {/* Rows Per Page */}
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <span>Show:</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold font-mono focus:outline-none cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {/* 5. Printable Report Area */}
      <div id="report-printable-area" className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Report Header */}
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                {reportData?.title || activeReportMeta?.name}
              </h2>
              <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                {processedRows.length} record{processedRows.length !== 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {reportData?.description || activeReportMeta?.description}
            </p>
          </div>

          <div className="text-right text-[11px] font-mono text-slate-400 shrink-0">
            <div>Company: <strong className="text-slate-700">{currentCompany?.displayName || currentCompany?.legalName || 'Workspace'}</strong></div>
            <div>Generated: {formatDateISO(new Date())}</div>
          </div>
        </div>

        {/* Report Table */}
        {loading ? (
          <div className="p-16 text-center text-slate-400">
            <div className="animate-spin h-7 w-7 border-2 border-amber-500 border-t-transparent rounded-full mx-auto mb-3" />
            <span className="text-xs font-semibold">Generating report data...</span>
          </div>
        ) : processedRows.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <Filter size={36} className="mx-auto mb-2 opacity-30 text-slate-500" />
            <p className="text-sm font-bold text-slate-700">No Records Found</p>
            <p className="text-xs text-slate-400 mt-1">
              {searchQuery ? 'No records match your active search filter.' : 'No data recorded for the selected period.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] uppercase tracking-wider text-slate-500 font-extrabold select-none">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  {(reportData?.columns || []).map(col => (
                    <th 
                      key={col.key} 
                      onClick={() => handleSort(col.key)}
                      className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{col.label}</span>
                        {sortKey === col.key && (
                          <span className="text-amber-500 text-[10px]">
                            {sortDirection === 'asc' ? '▲' : '▼'}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paginatedRows.map((row, index) => {
                  const rowNumber = (currentPage - 1) * pageSize + index + 1;
                  return (
                    <tr key={row.id || index} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 text-center font-mono text-[11px] text-slate-400">
                        {rowNumber}
                      </td>
                      {(reportData?.columns || []).map(col => {
                        const val = row[col.key];

                        // Special link rendering for challanNumber
                        if (col.key === 'challanNumber' && row.id) {
                          return (
                            <td key={col.key} className="py-3 px-4 font-mono font-bold text-slate-900">
                              <Link 
                                to={`/view/${row.id}`} 
                                className="text-amber-600 hover:text-amber-700 hover:underline"
                              >
                                {val}
                              </Link>
                            </td>
                          );
                        }

                        // Status badges
                        if (col.key === 'status' || col.key === 'deliveryStatus' || col.key === 'stockStatus') {
                          const isSuccess = val === 'DELIVERED' || val === 'Active' || val === 'IN STOCK' || val === 'RETURNED';
                          const isWarning = val === 'LOW STOCK' || val === 'PARTIALLY_DELIVERED' || val === 'AWAITING_RETURN';
                          const isDanger = val === 'DELAYED' || val === 'Cancelled' || val === 'OUT OF STOCK' || val === 'OVERDUE';
                          return (
                            <td key={col.key} className="py-3 px-4">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                isDanger ? 'bg-red-100 text-red-700 border border-red-200' :
                                isWarning ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                                isSuccess ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                                'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}>
                                {val || '—'}
                              </span>
                            </td>
                          );
                        }

                        return (
                          <td key={col.key} className="py-3 px-4 font-medium text-slate-700">
                            {val !== undefined && val !== null ? String(val) : '—'}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 6. Pagination Footer */}
        {processedRows.length > 0 && (
          <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 print:hidden">
            <div>
              Showing <span className="font-bold text-slate-900">{(currentPage - 1) * pageSize + 1}</span> to <span className="font-bold text-slate-900">{Math.min(currentPage * pageSize, processedRows.length)}</span> of <span className="font-bold text-slate-900">{processedRows.length}</span> records
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft size={16} />
              </button>

              <span className="px-2 font-mono text-xs font-bold text-slate-700">
                {currentPage} / {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Next Page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
