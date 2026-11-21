import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Truck, 
  Scale, 
  Search, 
  Filter, 
  Plus, 
  Download, 
  AlertTriangle, 
  CheckCircle2, 
  FileText, 
  Edit2, 
  Trash2, 
  ExternalLink, 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  User, 
  Info,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  ArrowUpDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  getChallans, 
  getTransporters, 
  saveTransporter, 
  deleteTransporter, 
  updateTransporterStatus, 
  recordActualWeight, 
  getTransportStats, 
  getTransportRegister 
} from '../utils/tenantStorage';
import { formatDate } from '../utils/indianBusiness';
import TransporterModal from '../components/TransporterModal';
import ActualWeightModal from '../components/ActualWeightModal';

export default function TransportHub() {
  const { currentCompany, isStaff, user } = useAuth();

  const [activeTab, setActiveTab] = useState('shipments'); // 'shipments' | 'transporters' | 'weighbridge' | 'reports'
  const [challans, setChallans] = useState([]);
  const [transporters, setTransporters] = useState([]);
  const [stats, setStats] = useState({
    totalShipments: 0,
    awaitingDispatch: 0,
    dispatched: 0,
    inTransit: 0,
    delivered: 0,
    delayed: 0,
    missingTransportInfo: 0,
    incompleteWeights: 0,
    weightDiscrepancies: 0,
    totalTransporters: 0,
    activeTransporters: 0
  });
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [transporterFilter, setTransporterFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [discrepancyOnly, setDiscrepancyOnly] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals
  const [isTransporterModalOpen, setIsTransporterModalOpen] = useState(false);
  const [editingTransporter, setEditingTransporter] = useState(null);
  const [weighingChallan, setWeighingChallan] = useState(null);
  const [deleteConfirmTransporter, setDeleteConfirmTransporter] = useState(null);
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
      const [chList, trList, st] = await Promise.all([
        getChallans(currentCompany.id),
        getTransporters(currentCompany.id),
        getTransportStats(currentCompany.id)
      ]);
      setChallans(chList || []);
      setTransporters(trList || []);
      setStats(st || {});
    } catch (err) {
      console.error('Failed to load transport data', err);
      showToast('Error loading transport data');
    } finally {
      setLoading(false);
    }
  };

  // Transporter Handlers
  const handleSaveTransporter = async (payload) => {
    try {
      await saveTransporter(currentCompany.id, payload);
      showToast(`Carrier "${payload.name}" saved successfully`);
      loadData();
    } catch (err) {
      showToast(`Error: ${err.message}`);
    }
  };

  const handleDeleteTransporter = async (transporter) => {
    try {
      const res = await deleteTransporter(currentCompany.id, transporter.id);
      if (!res.success) {
        showToast(res.message || 'Cannot delete transporter');
      } else {
        showToast(`Carrier "${transporter.name}" deleted successfully`);
        loadData();
      }
    } catch (err) {
      showToast(`Error: ${err.message}`);
    } finally {
      setDeleteConfirmTransporter(null);
    }
  };

  const handleToggleTransporterStatus = async (transporter) => {
    try {
      const newStatus = transporter.status === 'Active' ? 'Inactive' : 'Active';
      await updateTransporterStatus(currentCompany.id, transporter.id, newStatus);
      showToast(`Carrier status updated to ${newStatus}`);
      loadData();
    } catch (err) {
      showToast(`Error: ${err.message}`);
    }
  };

  // Weighbridge Handler
  const handleSaveWeighing = async (payload) => {
    if (!weighingChallan) return;
    try {
      await recordActualWeight(currentCompany.id, weighingChallan.id, payload, user);
      showToast(`Weighbridge record saved for Challan ${weighingChallan.challanNumber}`);
      loadData();
    } catch (err) {
      showToast(`Error: ${err.message}`);
    }
  };

  // Filtered shipments
  const filteredShipments = useMemo(() => {
    return challans.filter(ch => {
      const tr = ch.transport || ch.transportDetails || {};
      const carrierName = tr.transporterName || (tr.isSelfDelivery ? 'Self Delivery' : '');
      const vehicle = tr.vehicleNumber || ch.vehicleNumber || '';
      const lr = tr.lrNumber || tr.consignmentNoteNumber || '';
      const eway = tr.ewayBillNumber || ch.ewayBillNumber || '';
      const chNum = ch.challanNumber || '';
      const cusName = ch.customer?.name || ch.customerName || '';

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches = chNum.toLowerCase().includes(q) ||
          cusName.toLowerCase().includes(q) ||
          carrierName.toLowerCase().includes(q) ||
          vehicle.toLowerCase().includes(q) ||
          lr.toLowerCase().includes(q) ||
          eway.toLowerCase().includes(q);
        if (!matches) return false;
      }

      if (transporterFilter !== 'ALL') {
        if (transporterFilter === 'SELF' && !tr.isSelfDelivery) return false;
        if (transporterFilter === 'NONE' && (tr.transporterName || tr.isSelfDelivery)) return false;
        if (transporterFilter !== 'SELF' && transporterFilter !== 'NONE' && tr.transporterId !== transporterFilter && tr.transporterName !== transporterFilter) return false;
      }

      if (statusFilter !== 'ALL' && ch.deliveryStatus !== statusFilter && ch.status !== statusFilter) {
        return false;
      }

      if (discrepancyOnly) {
        const diff = ch.weights?.actual?.differenceKg || 0;
        const hasDisc = ch.weights?.actual?.verifiedStatus === 'Discrepancy Detected' || Math.abs(diff) > 0.5;
        if (!hasDisc) return false;
      }

      return true;
    });
  }, [challans, searchQuery, transporterFilter, statusFilter, discrepancyOnly]);

  // Filtered transporters
  const filteredTransporters = useMemo(() => {
    return transporters.filter(t => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (t.name || '').toLowerCase().includes(q) ||
        (t.transporterCode || '').toLowerCase().includes(q) ||
        (t.contactPerson || '').toLowerCase().includes(q) ||
        (t.phone || '').toLowerCase().includes(q) ||
        (t.gstin || '').toLowerCase().includes(q) ||
        (t.city || '').toLowerCase().includes(q);
    });
  }, [transporters, searchQuery]);

  // CSV Export utilities
  const exportShipmentsCsv = () => {
    const headers = [
      'Challan No',
      'Date',
      'Customer',
      'Transporter',
      'Vehicle Number',
      'Driver Name',
      'Driver Phone',
      'LR/GR Number',
      'E-Way Bill Number',
      'Total Packages',
      'Packaging Type',
      'Net Weight (Kg)',
      'Gross Weight (Kg)',
      'Actual Gross Weight (Kg)',
      'Weight Discrepancy (Kg)',
      'Weighbridge Slip',
      'Delivery Status'
    ];

    const rows = filteredShipments.map(ch => {
      const tr = ch.transport || ch.transportDetails || {};
      const w = ch.weights || {};
      const act = w.actual || {};
      return [
        `"${ch.challanNumber || ''}"`,
        `"${ch.challanDate || ''}"`,
        `"${(ch.customer?.name || ch.customerName || '').replace(/"/g, '""')}"`,
        `"${(tr.isSelfDelivery ? 'Self Delivery' : tr.transporterName || '').replace(/"/g, '""')}"`,
        `"${tr.vehicleNumber || ch.vehicleNumber || ''}"`,
        `"${tr.driverName || ''}"`,
        `"${tr.driverPhone || ''}"`,
        `"${tr.lrNumber || tr.consignmentNoteNumber || ''}"`,
        `"${tr.ewayBillNumber || ch.ewayBillNumber || ''}"`,
        `"${ch.totalPackages || w.totalPackages || ''}"`,
        `"${ch.packagingType || w.packagingType || ''}"`,
        `"${w.totalNetWeight !== undefined ? w.totalNetWeight : (ch.totalNetWeight || '')}"`,
        `"${w.totalGrossWeight !== undefined ? w.totalGrossWeight : (ch.totalGrossWeight || '')}"`,
        `"${act.grossWeight !== undefined ? act.grossWeight : ''}"`,
        `"${act.differenceKg !== undefined ? act.differenceKg : ''}"`,
        `"${act.weighbridgeReceiptNo || ''}"`,
        `"${ch.deliveryStatus || ch.status || ''}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Transport_Register_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportTransportersCsv = () => {
    const headers = ['Transporter Code', 'Name', 'Type', 'Contact Person', 'Phone', 'Email', 'City', 'State', 'GSTIN', 'Status'];
    const rows = transporters.map(t => [
      `"${t.transporterCode || ''}"`,
      `"${(t.name || '').replace(/"/g, '""')}"`,
      `"${t.transporterType || ''}"`,
      `"${t.contactPerson || ''}"`,
      `"${t.phone || ''}"`,
      `"${t.email || ''}"`,
      `"${t.city || ''}"`,
      `"${t.state || ''}"`,
      `"${t.gstin || ''}"`,
      `"${t.status || 'Active'}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Transporter_Directory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Pagination slices
  const totalShipmentPages = Math.ceil(filteredShipments.length / pageSize) || 1;
  const paginatedShipments = filteredShipments.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-slate-700 animate-in slide-in-from-bottom-5">
          <Info size={18} className="text-blue-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-md shadow-blue-500/20">
            <Truck size={24} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Transport & Weight Hub
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Carrier directory, vehicle dispatches, weight audit & weighbridge verification
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={activeTab === 'transporters' ? exportTransportersCsv : exportShipmentsCsv}
            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingTransporter(null);
              setIsTransporterModalOpen(true);
            }}
            className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center gap-2 cursor-pointer"
          >
            <Plus size={16} />
            <span>Add Transporter</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Total Shipments
          </span>
          <span className="text-2xl font-black text-slate-900 font-mono">
            {stats.totalShipments || 0}
          </span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block mb-1">
            Awaiting Dispatch
          </span>
          <span className="text-2xl font-black text-amber-600 font-mono">
            {stats.awaitingDispatch || 0}
          </span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block mb-1">
            In Transit
          </span>
          <span className="text-2xl font-black text-blue-600 font-mono">
            {stats.inTransit || 0}
          </span>
        </div>

        <div className={`p-4 rounded-2xl border shadow-xs ${stats.missingTransportInfo > 0 ? 'bg-amber-50/70 border-amber-200' : 'bg-white border-slate-200'}`}>
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Missing Transport
          </span>
          <span className={`text-2xl font-black font-mono ${stats.missingTransportInfo > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
            {stats.missingTransportInfo || 0}
          </span>
        </div>

        <div className={`p-4 rounded-2xl border shadow-xs ${stats.incompleteWeights > 0 ? 'bg-amber-50/70 border-amber-200' : 'bg-white border-slate-200'}`}>
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Incomplete Wts
          </span>
          <span className={`text-2xl font-black font-mono ${stats.incompleteWeights > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
            {stats.incompleteWeights || 0}
          </span>
        </div>

        <div className={`p-4 rounded-2xl border shadow-xs ${stats.weightDiscrepancies > 0 ? 'bg-red-50/70 border-red-200' : 'bg-white border-slate-200'}`}>
          <span className="text-[11px] font-bold text-red-600 uppercase tracking-wider block mb-1">
            Discrepancies
          </span>
          <span className={`text-2xl font-black font-mono ${stats.weightDiscrepancies > 0 ? 'text-red-600' : 'text-slate-900'}`}>
            {stats.weightDiscrepancies || 0}
          </span>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 overflow-x-auto pb-px">
        <button
          type="button"
          onClick={() => { setActiveTab('shipments'); setCurrentPage(1); }}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 border-b-2 ${
            activeTab === 'shipments'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Truck size={15} />
          <span>Shipments & Vehicles</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 text-slate-700 font-mono">
            {challans.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('transporters'); setCurrentPage(1); }}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 border-b-2 ${
            activeTab === 'transporters'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Building2 size={15} />
          <span>Transporters Directory</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 text-slate-700 font-mono">
            {transporters.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('weighbridge'); setCurrentPage(1); }}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 border-b-2 ${
            activeTab === 'weighbridge'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Scale size={15} />
          <span>Weight & Weighbridge Slips</span>
          {stats.weightDiscrepancies > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-red-100 text-red-700 font-bold">
              {stats.weightDiscrepancies} Alert
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 border-b-2 ${
            activeTab === 'reports'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <FileText size={15} />
          <span>Reports & Registers</span>
        </button>
      </div>

      {/* TAB 1: SHIPMENTS & VEHICLES */}
      {activeTab === 'shipments' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search size={16} />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                placeholder="Search by Challan #, Customer, Transporter, Vehicle #, LR #..."
                className="w-full pl-9 pr-3 py-2 text-xs font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={transporterFilter}
                onChange={(e) => { setTransporterFilter(e.target.value); setCurrentPage(1); }}
                className="px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl bg-white text-slate-700"
              >
                <option value="ALL">All Transporters</option>
                <option value="SELF">Self Delivery</option>
                <option value="NONE">Unassigned</option>
                {transporters.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                className="px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl bg-white text-slate-700"
              >
                <option value="ALL">All Delivery Statuses</option>
                <option value="Ready for Dispatch">Ready for Dispatch</option>
                <option value="Dispatched">Dispatched</option>
                <option value="In Transit">In Transit</option>
                <option value="Delivered">Delivered</option>
                <option value="Delivery Delayed">Delayed</option>
              </select>
            </div>
          </div>

          {/* Shipments Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="px-4 py-3">Challan / Date</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Transporter / Mode</th>
                    <th className="px-4 py-3">Vehicle / Driver</th>
                    <th className="px-4 py-3">LR / E-Way</th>
                    <th className="px-4 py-3 text-right">Packages & Weight</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {paginatedShipments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                        <Truck size={36} className="mx-auto mb-2 opacity-30" />
                        <p className="font-semibold">No shipments matching the filter</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedShipments.map(ch => {
                      const tr = ch.transport || ch.transportDetails || {};
                      const w = ch.weights || {};
                      const carrierName = tr.isSelfDelivery ? 'Self Delivery' : (tr.transporterName || '—');
                      const vehicle = tr.vehicleNumber || ch.vehicleNumber || '—';
                      const gross = w.totalGrossWeight !== undefined ? w.totalGrossWeight : (ch.totalGrossWeight || 0);
                      const unit = w.weightUnit || ch.weightUnit || 'Kg';

                      return (
                        <tr key={ch.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3.5">
                            <Link to={`/challans/${ch.id}`} className="font-bold text-blue-600 hover:underline flex items-center gap-1 font-mono">
                              <span>{ch.challanNumber}</span>
                            </Link>
                            <span className="text-[11px] text-slate-400 block mt-0.5">
                              {ch.challanDate ? formatDate(ch.challanDate) : '—'}
                            </span>
                          </td>

                          <td className="px-4 py-3.5">
                            <span className="font-semibold text-slate-900 block truncate max-w-[180px]">
                              {ch.customer?.name || ch.customerName || 'Unknown Customer'}
                            </span>
                            <span className="text-[11px] text-slate-400 block truncate max-w-[180px]">
                              {ch.customer?.deliveryCity || ch.customer?.billingCity || ''}
                            </span>
                          </td>

                          <td className="px-4 py-3.5">
                            <span className={`inline-flex items-center gap-1 font-semibold ${tr.isSelfDelivery ? 'text-indigo-600' : 'text-slate-800'}`}>
                              {tr.isSelfDelivery ? <User size={13} /> : <Truck size={13} />}
                              <span>{carrierName}</span>
                            </span>
                            {tr.transporterType && (
                              <span className="text-[10px] text-slate-400 block">{tr.transporterType}</span>
                            )}
                          </td>

                          <td className="px-4 py-3.5 font-mono">
                            <span className="font-bold text-slate-800 block uppercase">
                              {vehicle}
                            </span>
                            {tr.driverName && (
                              <span className="text-[10px] text-slate-500 font-sans block">
                                {tr.driverName} {tr.driverPhone ? `(${tr.driverPhone})` : ''}
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3.5 font-mono text-[11px]">
                            {tr.lrNumber && (
                              <div className="text-slate-700">
                                <span className="text-[10px] text-slate-400 font-sans">LR:</span> {tr.lrNumber}
                              </div>
                            )}
                            {(tr.ewayBillNumber || ch.ewayBillNumber) && (
                              <div className="text-slate-700">
                                <span className="text-[10px] text-slate-400 font-sans">EWB:</span> {tr.ewayBillNumber || ch.ewayBillNumber}
                              </div>
                            )}
                            {!tr.lrNumber && !tr.ewayBillNumber && !ch.ewayBillNumber && (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>

                          <td className="px-4 py-3.5 text-right font-mono">
                            <span className="font-bold text-slate-900 block">
                              {gross > 0 ? `${parseFloat(gross).toFixed(2)} ${unit}` : '—'}
                            </span>
                            <span className="text-[11px] text-slate-400 block font-sans">
                              {ch.totalPackages || w.totalPackages || 1} {ch.packagingType || w.packagingType || 'Pkgs'}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              ch.deliveryStatus === 'Delivered'
                                ? 'bg-emerald-100 text-emerald-800'
                                : ch.deliveryStatus === 'In Transit'
                                ? 'bg-blue-100 text-blue-800'
                                : ch.deliveryStatus === 'Dispatched'
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {ch.deliveryStatus || ch.status || 'Draft'}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                title="Record Weighbridge Slip"
                                onClick={() => setWeighingChallan(ch)}
                                className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Scale size={15} />
                              </button>
                              <Link
                                to={`/challans/${ch.id}`}
                                title="View Challan Details"
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                <ExternalLink size={15} />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalShipmentPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs">
                <span className="text-slate-500 font-medium">
                  Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredShipments.length)} of {filteredShipments.length}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="p-1.5 text-slate-600 hover:bg-slate-200 rounded-lg disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="font-bold text-slate-800 px-2">
                    {currentPage} / {totalShipmentPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage === totalShipmentPages}
                    onClick={() => setCurrentPage(p => Math.min(totalShipmentPages, p + 1))}
                    className="p-1.5 text-slate-600 hover:bg-slate-200 rounded-lg disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: TRANSPORTERS DIRECTORY */}
      {activeTab === 'transporters' && (
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search size={16} />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search carriers by name, code, contact, city, GSTIN..."
                className="w-full pl-9 pr-3 py-2 text-xs font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingTransporter(null);
                setIsTransporterModalOpen(true);
              }}
              className="px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-sm flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Plus size={15} />
              <span>New Carrier</span>
            </button>
          </div>

          {/* Transporters Grid / Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="px-4 py-3">Carrier Code & Name</th>
                    <th className="px-4 py-3">Carrier Type</th>
                    <th className="px-4 py-3">Contact Person</th>
                    <th className="px-4 py-3">Phone & Email</th>
                    <th className="px-4 py-3">Location / GSTIN</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredTransporters.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                        <Building2 size={36} className="mx-auto mb-2 opacity-30" />
                        <p className="font-semibold">No transporters configured</p>
                        <button
                          type="button"
                          onClick={() => { setEditingTransporter(null); setIsTransporterModalOpen(true); }}
                          className="mt-3 text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                        >
                          + Add your first logistics carrier
                        </button>
                      </td>
                    </tr>
                  ) : (
                    filteredTransporters.map(t => (
                      <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3.5">
                          <span className="font-mono text-[11px] font-bold text-blue-600 block">
                            {t.transporterCode || 'TRN-—'}
                          </span>
                          <span className="font-bold text-slate-900 block text-sm">
                            {t.name}
                          </span>
                        </td>

                        <td className="px-4 py-3.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                            {t.transporterType || 'Road transport'}
                          </span>
                        </td>

                        <td className="px-4 py-3.5">
                          <span className="font-medium text-slate-800 block">
                            {t.contactPerson || '—'}
                          </span>
                        </td>

                        <td className="px-4 py-3.5">
                          {t.phone && (
                            <span className="font-mono text-slate-700 block flex items-center gap-1">
                              <Phone size={12} className="text-slate-400" />
                              {t.phone}
                            </span>
                          )}
                          {t.email && (
                            <span className="text-[11px] text-slate-500 block truncate max-w-[150px]">
                              {t.email}
                            </span>
                          )}
                          {!t.phone && !t.email && <span className="text-slate-400">—</span>}
                        </td>

                        <td className="px-4 py-3.5">
                          <span className="font-medium text-slate-800 block">
                            {t.city ? `${t.city}, ${t.state || ''}` : t.state || '—'}
                          </span>
                          {t.gstin && (
                            <span className="font-mono text-[10px] text-slate-500 block">
                              GST: {t.gstin}
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleTransporterStatus(t)}
                            title="Click to toggle status"
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase transition-transform active:scale-95 cursor-pointer ${
                              t.status === 'Active'
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                            }`}
                          >
                            {t.status || 'Active'}
                          </button>
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => { setEditingTransporter(t); setIsTransporterModalOpen(true); }}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Edit Transporter"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmTransporter(t)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete Transporter"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: WEIGHT & WEIGHBRIDGE DISCREPANCIES */}
      {activeTab === 'weighbridge' && (
        <div className="space-y-4">
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Scale size={18} className="text-amber-500" />
              <span className="text-xs font-bold text-slate-800">
                Weighbridge Audit & Discrepancy Verification
              </span>
            </div>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={discrepancyOnly}
                onChange={(e) => setDiscrepancyOnly(e.target.checked)}
                className="rounded border-slate-300 text-red-500 focus:ring-red-400 cursor-pointer"
              />
              <span>Show Discrepancies Only</span>
            </label>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="px-4 py-3">Challan #</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3 text-right">Calculated Gross</th>
                    <th className="px-4 py-3 text-right">Actual Gross (Slip)</th>
                    <th className="px-4 py-3 text-right">Difference</th>
                    <th className="px-4 py-3">Weighbridge Ref</th>
                    <th className="px-4 py-3 text-center">Audit Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredShipments.map(ch => {
                    const w = ch.weights || {};
                    const act = w.actual || {};
                    const calcGross = w.totalGrossWeight !== undefined ? w.totalGrossWeight : (ch.totalGrossWeight || 0);
                    const unit = w.weightUnit || ch.weightUnit || 'Kg';
                    const hasActual = act.grossWeight !== undefined && act.grossWeight !== null;
                    const diff = act.differenceKg || 0;
                    const isDiscrepant = act.verifiedStatus === 'Discrepancy Detected' || Math.abs(diff) > 0.5;

                    return (
                      <tr key={ch.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3.5 font-mono font-bold text-blue-600">
                          <Link to={`/challans/${ch.id}`} className="hover:underline">
                            {ch.challanNumber}
                          </Link>
                        </td>

                        <td className="px-4 py-3.5 font-medium text-slate-800">
                          {ch.customer?.name || ch.customerName || 'Unknown'}
                        </td>

                        <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900">
                          {calcGross > 0 ? `${parseFloat(calcGross).toFixed(2)} ${unit}` : '—'}
                        </td>

                        <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900">
                          {hasActual ? `${parseFloat(act.grossWeight).toFixed(2)} ${act.weightUnit || unit}` : (
                            <span className="text-slate-400 font-sans italic text-[11px]">Not measured</span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-right font-mono font-bold">
                          {hasActual ? (
                            <span className={diff === 0 ? 'text-emerald-600' : isDiscrepant ? 'text-red-600' : 'text-amber-600'}>
                              {diff > 0 ? `+${diff}` : diff} kg
                            </span>
                          ) : '—'}
                        </td>

                        <td className="px-4 py-3.5 font-mono text-[11px] text-slate-600">
                          {act.weighbridgeReceiptNo || act.receiptNumber || '—'}
                        </td>

                        <td className="px-4 py-3.5 text-center">
                          {hasActual ? (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                              isDiscrepant ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {act.verifiedStatus || 'Verified'}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 uppercase">
                              Pending
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => setWeighingChallan(ch)}
                            className="px-2.5 py-1 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors cursor-pointer"
                          >
                            {hasActual ? 'Edit Slip' : 'Record Slip'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: REPORTS & REGISTERS */}
      {activeTab === 'reports' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                <Truck size={20} />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Transporter Dispatch Register</h3>
              <p className="text-xs text-slate-500 mt-1">
                Full chronological ledger of all shipments dispatched by third-party carriers and in-house fleet.
              </p>
            </div>
            <button
              type="button"
              onClick={exportShipmentsCsv}
              className="w-full py-2 px-3 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                <Building2 size={20} />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Carrier Directory & Tax Register</h3>
              <p className="text-xs text-slate-500 mt-1">
                Directory of transport vendors, contact agents, GSTIN numbers, and active service statuses.
              </p>
            </div>
            <button
              type="button"
              onClick={exportTransportersCsv}
              className="w-full py-2 px-3 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
                <Scale size={20} />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Weighbridge Discrepancy Audit</h3>
              <p className="text-xs text-slate-500 mt-1">
                Audit trail comparing estimated shipment weights against gate scale readings and tolerance variances.
              </p>
            </div>
            <button
              type="button"
              onClick={exportShipmentsCsv}
              className="w-full py-2 px-3 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                <FileText size={20} />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Packaging & Freight Summary</h3>
              <p className="text-xs text-slate-500 mt-1">
                Consolidated report of tare weights, package counts, box dimensions, and payment responsibility.
              </p>
            </div>
            <button
              type="button"
              onClick={exportShipmentsCsv}
              className="w-full py-2 px-3 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      )}

      {/* Transporter Modal */}
      <TransporterModal
        isOpen={isTransporterModalOpen}
        onClose={() => { setIsTransporterModalOpen(false); setEditingTransporter(null); }}
        onSave={handleSaveTransporter}
        transporter={editingTransporter}
        companyId={currentCompany?.id}
      />

      {/* Actual Weight Weighbridge Modal */}
      <ActualWeightModal
        isOpen={Boolean(weighingChallan)}
        onClose={() => setWeighingChallan(null)}
        onSave={handleSaveWeighing}
        challan={weighingChallan}
        currentUser={user}
      />

      {/* Delete Transporter Confirmation Dialog */}
      {deleteConfirmTransporter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">Delete Carrier?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete <span className="font-bold text-slate-800">{deleteConfirmTransporter.name}</span> ({deleteConfirmTransporter.transporterCode})?
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmTransporter(null)}
                className="flex-1 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteTransporter(deleteConfirmTransporter)}
                className="flex-1 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
