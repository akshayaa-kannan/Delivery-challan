import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  Download, 
  Upload, 
  Eye, 
  Edit, 
  Copy, 
  Trash2, 
  Ban, 
  RotateCcw, 
  Phone, 
  Mail, 
  MapPin, 
  Building2, 
  FileText,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Check,
  AlertCircle
} from 'lucide-react';
import { 
  getCustomers, 
  saveCustomer, 
  deleteCustomer, 
  updateCustomerStatus,
  generateNextCustomerCode,
  getCustomerChallans,
  deduplicateCustomers
} from '../utils/tenantStorage.js';
import { 
  INDIAN_STATES, 
  CUSTOMER_TYPES 
} from '../utils/indianBusiness.js';
import { 
  exportCustomersToCsv, 
  downloadCsvFile 
} from '../utils/csvUtils.js';
import { useAuth } from '../context/AuthContext';
import CustomerModal from '../components/CustomerModal.jsx';
import CsvImportModal from '../components/CsvImportModal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';

export default function Customers() {
  const navigate = useNavigate();
  const { currentCompany, isStaff, isAdmin } = useAuth();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name_asc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBlockedInfo, setDeleteBlockedInfo] = useState(null);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  const loadCustomersList = async () => {
    if (!currentCompany?.id) return;
    setLoading(true);
    try {
      const { mergedCount } = await deduplicateCustomers(currentCompany.id);
      if (mergedCount > 0) {
        showFeedback(`Cleaned up and merged ${mergedCount} duplicate customer record(s).`);
      }
      const data = await getCustomers(currentCompany.id);
      setCustomers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomersList();
  }, [currentCompany?.id]);

  const showFeedback = (msg) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(''), 3500);
  };

  // Filter & Sort
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      // Search
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const matchName = (c.name || '').toLowerCase().includes(q);
        const matchCode = (c.customerCode || '').toLowerCase().includes(q);
        const matchPhone = (c.phone || '').toLowerCase().includes(q);
        const matchEmail = (c.email || '').toLowerCase().includes(q);
        const matchGstin = (c.gstin || '').toLowerCase().includes(q);
        const matchComp = (c.companyName || '').toLowerCase().includes(q);
        const matchCity = (c.billingCity || '').toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchPhone && !matchEmail && !matchGstin && !matchComp && !matchCity) {
          return false;
        }
      }

      // Status
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;

      // Type
      if (typeFilter !== 'all' && c.customerType !== typeFilter) return false;

      // State
      if (stateFilter !== 'all') {
        const cState = c.state || c.billingState || '';
        if (cState !== stateFilter) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'name_desc') return (b.name || '').localeCompare(a.name || '');
      if (sortBy === 'code_asc') return (a.customerCode || '').localeCompare(b.customerCode || '');
      if (sortBy === 'code_desc') return (b.customerCode || '').localeCompare(a.customerCode || '');
      if (sortBy === 'newest') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      if (sortBy === 'oldest') return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      return 0;
    });
  }, [customers, searchQuery, statusFilter, typeFilter, stateFilter, sortBy]);

  // Pagination calculation
  const totalItems = filteredCustomers.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedCustomers = filteredCustomers.slice(startIndex, startIndex + pageSize);

  // Actions
  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (customer) => {
    setEditingCustomer(customer);
    setModalOpen(true);
  };

  const handleDuplicate = async (customer) => {
    const nextCode = await generateNextCustomerCode(currentCompany.id);
    setEditingCustomer({
      ...customer,
      id: undefined,
      customerCode: nextCode,
      name: `${customer.name} (Copy)`
    });
    setModalOpen(true);
  };

  const handleToggleStatus = async (customer) => {
    const newStatus = customer.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await updateCustomerStatus(currentCompany.id, customer.id, newStatus);
      showFeedback(`Customer ${customer.name} marked as ${newStatus}.`);
      await loadCustomersList();
    } catch (err) {
      alert("Failed to update status: " + err.message);
    }
  };

  const handleInitiateDelete = async (customer) => {
    try {
      const challans = await getCustomerChallans(currentCompany?.id, customer.id, customer.name);
      if (challans && challans.length > 0) {
        setDeleteBlockedInfo({
          customer,
          count: challans.length,
          message: `Cannot delete "${customer.name}": This customer is referenced in ${challans.length} historical delivery challan(s).`
        });
        return;
      }
      setDeleteTarget(customer);
    } catch {
      setDeleteTarget(customer);
    }
  };

  const handleDeactivateFromBlocked = async () => {
    if (!deleteBlockedInfo?.customer) return;
    try {
      await updateCustomerStatus(currentCompany.id, deleteBlockedInfo.customer.id, 'INACTIVE');
      showFeedback(`Customer "${deleteBlockedInfo.customer.name}" marked as Inactive.`);
      setDeleteBlockedInfo(null);
      await loadCustomersList();
    } catch (err) {
      alert("Failed to deactivate: " + err.message);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await deleteCustomer(currentCompany.id, deleteTarget.id);
      if (!res.success) {
        const target = deleteTarget;
        setDeleteTarget(null);
        setDeleteBlockedInfo({
          customer: target,
          count: res.count || 1,
          message: res.message
        });
        return;
      }
      showFeedback(`Customer ${deleteTarget.name} deleted.`);
      setDeleteTarget(null);
      await loadCustomersList();
    } catch (err) {
      alert(err.message || "Failed to delete customer.");
      setDeleteTarget(null);
    }
  };

  const handleExportCsv = () => {
    const csvData = exportCustomersToCsv(filteredCustomers);
    const dateStr = new Date().toISOString().split('T')[0];
    downloadCsvFile(csvData, `Customers_Export_${dateStr}.csv`);
  };

  const handleImportCompleted = async (importedRows) => {
    let successCount = 0;
    for (const row of importedRows) {
      try {
        await saveCustomer(currentCompany.id, row);
        successCount++;
      } catch (e) {
        console.warn("Skipping failed import item:", e);
      }
    }
    showFeedback(`Successfully imported ${successCount} customer(s).`);
    await loadCustomersList();
  };

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-400/10 rounded-xl text-amber-500 border border-amber-400/20">
            <Users size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Customer Management</h1>
              <span className="text-xs bg-slate-100 text-slate-700 font-bold px-2.5 py-0.5 rounded-full border border-slate-200">
                {customers.length} Total
              </span>
            </div>
            <p className="text-xs font-medium text-slate-500 mt-0.5">
              Manage buyers, consignees, GSTINs, and delivery sites across your company
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setImportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            title="Import customer records from CSV"
          >
            <Upload size={14} />
            <span className="hidden sm:inline">Import CSV</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={customers.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-40"
            title="Export customers to CSV spreadsheet"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black shadow-md shadow-slate-900/10 transition-all cursor-pointer ml-1"
          >
            <Plus size={15} />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in duration-150">
          <Check size={16} className="text-emerald-600 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search box */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Search by name, code, phone, GSTIN, city..."
              className="w-full pl-9 pr-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500 bg-slate-50/50"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500 bg-white"
            >
              <option value="all">Status: All</option>
              <option value="Active">Active Customers</option>
              <option value="Inactive">Inactive Customers</option>
            </select>
          </div>

          {/* Customer Type Filter */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500 bg-white"
            >
              <option value="all">Type: All Types</option>
              {CUSTOMER_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* State Filter */}
          <div>
            <select
              value={stateFilter}
              onChange={(e) => { setStateFilter(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500 bg-white"
            >
              <option value="all">State: All India</option>
              {INDIAN_STATES.map(s => (
                <option key={s.code} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Sort & Count row */}
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
          <div>
            Showing <span className="font-bold text-slate-800">{filteredCustomers.length}</span> matching record(s)
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold">Sort By:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-2 py-1 text-xs font-semibold border border-slate-200 rounded-lg bg-white"
            >
              <option value="name_asc">Name (A → Z)</option>
              <option value="name_desc">Name (Z → A)</option>
              <option value="code_asc">Code (Ascending)</option>
              <option value="code_desc">Code (Descending)</option>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-500 flex flex-col items-center gap-2">
            <Loader2 className="animate-spin text-amber-500" size={30} />
            <span className="text-xs font-bold">Loading customers database...</span>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-16 text-center">
            <Users className="mx-auto text-slate-300 mb-3" size={44} />
            <h3 className="text-base font-bold text-slate-800">No customers found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                ? "No customer records matched your search query or active filter settings."
                : "Add your first buyer or consignee to quickly dispatch Delivery Challans."}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <button
                onClick={handleOpenAdd}
                className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer"
              >
                <Plus size={14} />
                <span>Create Customer</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[850px]">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <th className="py-3 px-4 w-[11%]">Code</th>
                  <th className="py-3 px-4 w-[24%]">Customer / Business</th>
                  <th className="py-3 px-4 w-[15%]">Contact</th>
                  <th className="py-3 px-4 w-[18%]">Location</th>
                  <th className="py-3 px-4 w-[12%]">GSTIN</th>
                  <th className="py-3 px-4 w-[8%] text-center">Status</th>
                  <th className="py-3 px-4 w-[12%] text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {paginatedCustomers.map(customer => {
                  const locationCity = customer.billingCity || customer.deliveryCity || '—';
                  const locationState = customer.state || customer.billingState || '';

                  return (
                    <tr key={customer.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Code */}
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-900">
                        {customer.customerCode || '—'}
                      </td>

                      {/* Name & Type */}
                      <td className="py-3.5 px-4">
                        <Link 
                          to={`/customers/${customer.id}`} 
                          className="font-bold text-slate-900 hover:text-blue-700 hover:underline block leading-tight truncate max-w-[240px]"
                          title={customer.name}
                        >
                          {customer.name}
                        </Link>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {customer.companyName && (
                            <span className="text-[10px] text-slate-500 truncate max-w-[150px]">
                              {customer.companyName}
                            </span>
                          )}
                          <span className="text-[9px] font-bold px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                            {customer.customerType || 'Business'}
                          </span>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4 text-slate-700 space-y-0.5">
                        {customer.phone && (
                          <div className="flex items-center gap-1 text-[11px] font-mono">
                            <Phone size={11} className="text-slate-400" />
                            <span>{customer.phone}</span>
                          </div>
                        )}
                        {customer.contactPerson && (
                          <div className="text-[10px] text-slate-500 truncate max-w-[130px]">
                            Attn: {customer.contactPerson}
                          </div>
                        )}
                        {!customer.phone && !customer.contactPerson && (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Location */}
                      <td className="py-3.5 px-4 text-slate-700">
                        <div className="font-semibold text-slate-800">{locationCity}</div>
                        {locationState && (
                          <div className="text-[10px] text-slate-500">{locationState}</div>
                        )}
                      </td>

                      {/* GSTIN */}
                      <td className="py-3.5 px-4 font-mono text-[11px]">
                        {customer.gstin ? (
                          <span className="font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {customer.gstin}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Unregistered</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          customer.status === 'Inactive'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {customer.status || 'Active'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <Link
                            to={`/customers/${customer.id}`}
                            className="p-1 text-slate-400 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                            title="View Customer Overview & Challan History"
                          >
                            <Eye size={15} />
                          </Link>

                          <button
                            onClick={() => handleOpenEdit(customer)}
                            className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors cursor-pointer"
                            title="Edit customer details"
                          >
                            <Edit size={15} />
                          </button>

                          <button
                            onClick={() => handleDuplicate(customer)}
                            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                            title="Duplicate as new customer"
                          >
                            <Copy size={15} />
                          </button>

                          <button
                            onClick={() => handleToggleStatus(customer)}
                            className="p-1 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                            title={customer.status === 'Active' ? 'Deactivate Customer' : 'Reactivate Customer'}
                          >
                            {customer.status === 'Active' ? <Ban size={15} /> : <RotateCcw size={15} />}
                          </button>

                          {isAdmin && (
                            <button
                              onClick={() => handleInitiateDelete(customer)}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                              title="Delete customer"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination bar */}
        {filteredCustomers.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-slate-200 bg-slate-50/50 text-xs text-slate-600 gap-3">
            <div className="flex items-center gap-2">
              <span>Showing {startIndex + 1} to {Math.min(startIndex + pageSize, totalItems)} of {totalItems} customers</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="px-2 py-1 text-xs font-bold border border-slate-200 rounded-lg bg-white"
              >
                <option value={10}>10 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-40 cursor-pointer"
                aria-label="Previous Page"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-3 font-mono font-bold">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-40 cursor-pointer"
                aria-label="Next Page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Customer Add/Edit Modal */}
      <CustomerModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        customer={editingCustomer}
        companyId={currentCompany?.id}
        onSave={async (savedCust) => {
          await saveCustomer(currentCompany.id, savedCust);
          showFeedback(`Customer ${savedCust.name} saved successfully.`);
          await loadCustomersList();
        }}
      />

      {/* CSV Import Modal */}
      <CsvImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        type="customers"
        existingRecords={customers}
        onImportComplete={handleImportCompleted}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Customer?"
        message={`Are you sure you want to permanently delete customer "${deleteTarget?.name}" (${deleteTarget?.customerCode || ''})? This action cannot be undone.`}
        confirmText="Delete Customer"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Deletion Blocked Notice Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteBlockedInfo)}
        title="Cannot Delete Customer"
        message={
          <div className="space-y-3">
            <p className="font-semibold text-slate-800">
              {deleteBlockedInfo?.message}
            </p>
            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-lg text-xs text-amber-900 leading-relaxed">
              <span className="font-bold block mb-1">Why is deletion blocked?</span>
              Under CGST Rule 55 statutory compliance, customers linked to finalized delivery challans must be preserved to guarantee document audit integrity.
            </div>
            <p className="text-xs text-slate-600">
              You can deactivate this customer instead. Deactivated customers are hidden from the new challan customer list, but all historical challans and PDF prints remain 100% accessible.
            </p>
          </div>
        }
        isBlocked={true}
        cancelText="Close"
        blockedActionText="Deactivate Customer Instead"
        onBlockedAction={handleDeactivateFromBlocked}
        onCancel={() => setDeleteBlockedInfo(null)}
      />
    </div>
  );
}
