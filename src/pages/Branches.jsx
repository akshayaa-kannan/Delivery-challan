import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  MapPin, 
  Phone, 
  Mail, 
  User, 
  AlertCircle, 
  CheckCircle2, 
  Trash2, 
  Edit2, 
  ShieldAlert, 
  Loader2, 
  ExternalLink,
  Check,
  X,
  Layers
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  getBranches, 
  saveBranch, 
  updateBranchStatus, 
  deleteBranch, 
  generateNextBranchCode, 
  getUsageMetrics 
} from '../utils/storage';

export default function Branches() {
  const { currentCompany, currentUser, isAdmin } = useAuth();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [usage, setUsage] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    branchCode: '',
    address: '',
    city: '',
    state: '',
    pinCode: '',
    phone: '',
    email: '',
    contactPerson: '',
    isDefault: false
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [actionMessage, setActionMessage] = useState(null);

  // Delete Guard State
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    loadBranchData();
  }, [currentCompany?.id]);

  const loadBranchData = async () => {
    if (!currentCompany?.id) return;
    try {
      setLoading(true);
      const [branchList, metrics] = await Promise.all([
        getBranches(true),
        getUsageMetrics()
      ]);
      setBranches(branchList || []);
      setUsage(metrics);
    } catch (err) {
      console.error('Error loading branches:', err);
      setActionMessage({ type: 'error', text: 'Failed to load branch records.' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = async () => {
    setEditingBranch(null);
    setFormError('');
    try {
      const nextCode = await generateNextBranchCode();
      setFormData({
        name: '',
        branchCode: nextCode,
        address: '',
        city: '',
        state: '',
        pinCode: '',
        phone: '',
        email: '',
        contactPerson: '',
        isDefault: branches.length === 0
      });
      setIsModalOpen(true);
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  const handleOpenEditModal = (branch) => {
    setEditingBranch(branch);
    setFormError('');
    setFormData({
      name: branch.name || '',
      branchCode: branch.branchCode || '',
      address: branch.address || '',
      city: branch.city || '',
      state: branch.state || '',
      pinCode: branch.pinCode || '',
      phone: branch.phone || '',
      email: branch.email || '',
      contactPerson: branch.contactPerson || '',
      isDefault: Boolean(branch.isDefault)
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('Branch name is required.');
      return;
    }

    try {
      setSaving(true);
      await saveBranch({
        ...(editingBranch ? { id: editingBranch.id } : {}),
        ...formData
      }, currentUser);

      setIsModalOpen(false);
      setActionMessage({
        type: 'success',
        text: `Branch "${formData.name}" successfully ${editingBranch ? 'updated' : 'created'}.`
      });
      await loadBranchData();
    } catch (err) {
      setFormError(err.message || 'Error saving branch record.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (branch) => {
    const nextStatus = branch.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await updateBranchStatus(branch.id, nextStatus, currentUser);
      setActionMessage({
        type: 'success',
        text: `Branch "${branch.name}" is now ${nextStatus}.`
      });
      await loadBranchData();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  const handleDelete = async (branch) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${branch.name}" (${branch.branchCode})? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeletingId(branch.id);
      await deleteBranch(branch.id, currentUser);
      setActionMessage({
        type: 'success',
        text: `Branch "${branch.name}" was deleted successfully.`
      });
      await loadBranchData();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message });
    } finally {
      setDeletingId(null);
    }
  };

  const filteredBranches = branches.filter(b => {
    const matchesSearch = 
      (b.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.branchCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.city || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.contactPerson || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    if (statusFilter === 'ALL') return matchesSearch;
    return matchesSearch && b.status === statusFilter;
  });

  const branchLimit = usage?.usage?.branches?.max || 1;
  const currentBranchCount = usage?.usage?.branches?.current || branches.filter(b => b.status === 'ACTIVE').length;
  const isBranchLimitReached = currentBranchCount >= branchLimit;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Building2 className="text-amber-500" size={28} />
            Branches & Operating Locations
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your company's operating branches, dispatch centers, and regional hubs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenCreateModal}
            disabled={isBranchLimitReached}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all ${
              isBranchLimitReached 
                ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                : 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-amber-500/20 active:scale-95'
            }`}
          >
            <Plus size={18} />
            Add New Branch
          </button>
        </div>
      </div>

      {/* Plan Entitlement Notification */}
      {isBranchLimitReached && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
          <ShieldAlert className="text-amber-600 shrink-0 mt-0.5" size={20} />
          <div className="text-sm">
            <span className="font-bold text-amber-900">Branch limit reached on {usage?.planLimits?.name || 'Free'} plan: </span>
            <span className="text-amber-800">
              You are currently utilizing {currentBranchCount} of {branchLimit} allowed active branches. Upgrade to Growth Business or Enterprise to configure multiple locations.
            </span>
          </div>
        </div>
      )}

      {/* Alerts */}
      {actionMessage && (
        <div className={`p-4 rounded-xl flex items-center justify-between text-sm ${
          actionMessage.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
            : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by branch code, name, city..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status:</span>
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
            {['ALL', 'ACTIVE', 'INACTIVE'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === st 
                    ? 'bg-white text-slate-900 shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Branch Directory Grid */}
      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-3">
          <Loader2 className="animate-spin text-amber-500" size={32} />
          <div className="text-sm font-semibold text-slate-500">Loading branch directory...</div>
        </div>
      ) : filteredBranches.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <Building2 className="mx-auto text-slate-300 mb-3" size={48} />
          <h3 className="text-base font-bold text-slate-800">No branches found</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            {searchTerm || statusFilter !== 'ALL'
              ? 'No branch matches your filter criteria.'
              : 'Add your primary headquarters or branch to organize shipments and staff assignments.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredBranches.map((branch) => {
            const isInactive = branch.status === 'INACTIVE';
            return (
              <div 
                key={branch.id} 
                className={`bg-white rounded-2xl border transition-all p-5 shadow-xs flex flex-col justify-between ${
                  isInactive 
                    ? 'border-slate-200 bg-slate-50/50 opacity-75' 
                    : 'border-slate-200 hover:border-amber-300 hover:shadow-md'
                }`}
              >
                <div>
                  {/* Top Bar: Code & Status */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-black px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
                        {branch.branchCode}
                      </span>
                      {branch.isDefault && (
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                          Primary HQ
                        </span>
                      )}
                    </div>

                    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      isInactive 
                        ? 'bg-slate-200 text-slate-600' 
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${isInactive ? 'bg-slate-400' : 'bg-emerald-500'}`} />
                      {branch.status || 'ACTIVE'}
                    </span>
                  </div>

                  {/* Branch Details */}
                  <div className="mt-3">
                    <h3 className="text-base font-bold text-slate-900 truncate" title={branch.name}>
                      {branch.name}
                    </h3>

                    <div className="mt-2 space-y-1.5 text-xs text-slate-600">
                      {branch.address && (
                        <div className="flex items-start gap-2">
                          <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">
                            {branch.address}
                            {branch.city ? `, ${branch.city}` : ''}
                            {branch.state ? `, ${branch.state}` : ''}
                            {branch.pinCode ? ` - ${branch.pinCode}` : ''}
                          </span>
                        </div>
                      )}

                      {branch.contactPerson && (
                        <div className="flex items-center gap-2">
                          <User size={14} className="text-slate-400 shrink-0" />
                          <span>Manager: <strong className="text-slate-700">{branch.contactPerson}</strong></span>
                        </div>
                      )}

                      {branch.phone && (
                        <div className="flex items-center gap-2">
                          <Phone size={14} className="text-slate-400 shrink-0" />
                          <span>{branch.phone}</span>
                        </div>
                      )}

                      {branch.email && (
                        <div className="flex items-center gap-2">
                          <Mail size={14} className="text-slate-400 shrink-0" />
                          <span className="truncate">{branch.email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => handleToggleStatus(branch)}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    {isInactive ? 'Activate' : 'Deactivate'}
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditModal(branch)}
                      className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Edit Branch"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(branch)}
                      disabled={deletingId === branch.id}
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete Branch"
                    >
                      {deletingId === branch.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Branch Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Building2 className="text-amber-400" size={20} />
                <h3 className="font-bold text-base">
                  {editingBranch ? 'Edit Branch Location' : 'Register New Branch'}
                </h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Branch Code</label>
                  <input
                    type="text"
                    value={formData.branchCode}
                    readOnly
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-600 cursor-not-allowed"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Branch Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Coimbatore Regional Hub"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Street Address</label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Plot / Street / Area"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="City"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">State</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="State"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">PIN Code</label>
                  <input
                    type="text"
                    value={formData.pinCode}
                    onChange={(e) => setFormData({ ...formData, pinCode: e.target.value })}
                    placeholder="600001"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Manager / Contact</label>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    placeholder="Manager Name"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="044-12345678"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="branch@company.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                    className="rounded border-slate-300 text-amber-500 focus:ring-amber-500 h-4 w-4"
                  />
                  <span className="text-xs font-semibold text-slate-700">Set as Primary Headquarters</span>
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  {editingBranch ? 'Save Changes' : 'Create Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
