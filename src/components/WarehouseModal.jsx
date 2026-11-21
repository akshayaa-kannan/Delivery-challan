import React, { useState, useEffect } from 'react';
import { 
  X, 
  Warehouse, 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  User, 
  FileText, 
  AlertCircle, 
  CheckCircle2,
  Check
} from 'lucide-react';
import { 
  saveWarehouse, 
  generateNextWarehouseCode, 
  WAREHOUSE_TYPES 
} from '../utils/tenantStorage.js';

export default function WarehouseModal({ 
  isOpen, 
  onClose, 
  onSave, 
  warehouse = null, 
  companyId 
}) {
  const isEdit = Boolean(warehouse?.id);

  const [formData, setFormData] = useState({
    name: '',
    warehouseCode: '',
    warehouseType: 'Main Warehouse',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pinCode: '',
    country: 'India',
    contactPerson: '',
    phone: '',
    email: '',
    notes: '',
    isDefault: false,
    status: 'Active'
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setError('');
      if (warehouse) {
        setFormData({
          name: warehouse.name || '',
          warehouseCode: warehouse.warehouseCode || '',
          warehouseType: warehouse.warehouseType || 'Main Warehouse',
          addressLine1: warehouse.addressLine1 || '',
          addressLine2: warehouse.addressLine2 || '',
          city: warehouse.city || '',
          state: warehouse.state || '',
          pinCode: warehouse.pinCode || '',
          country: warehouse.country || 'India',
          contactPerson: warehouse.contactPerson || '',
          phone: warehouse.phone || '',
          email: warehouse.email || '',
          notes: warehouse.notes || '',
          isDefault: Boolean(warehouse.isDefault),
          status: warehouse.status || 'Active'
        });
      } else {
        // New warehouse: generate next code
        generateNextWarehouseCode(companyId).then(code => {
          setFormData({
            name: '',
            warehouseCode: code,
            warehouseType: 'Main Warehouse',
            addressLine1: '',
            addressLine2: '',
            city: '',
            state: '',
            pinCode: '',
            country: 'India',
            contactPerson: '',
            phone: '',
            email: '',
            notes: '',
            isDefault: false,
            status: 'Active'
          });
        });
      }
    }
  }, [isOpen, warehouse, companyId]);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      setError('Warehouse name is required');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...(warehouse ? { id: warehouse.id } : {}),
        ...formData,
        name: formData.name.trim(),
        warehouseCode: formData.warehouseCode.trim().toUpperCase()
      };
      const saved = await saveWarehouse(companyId, payload);
      if (onSave) onSave(saved);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save warehouse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl my-6 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-400/10 rounded-lg text-amber-400 border border-amber-400/20">
              <Warehouse size={22} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                {isEdit ? 'Edit Warehouse' : 'Add New Warehouse'}
              </h2>
              <p className="text-xs text-slate-400">
                {isEdit ? `Updating warehouse ${warehouse.warehouseCode}` : 'Configure storage location and contact details'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-slate-800">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs sm:text-sm font-medium">
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Basic Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Warehouse Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g. Central Assembly Plant"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Warehouse Code
              </label>
              <input
                type="text"
                value={formData.warehouseCode}
                onChange={(e) => handleChange('warehouseCode', e.target.value)}
                placeholder="WH-0001"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium uppercase font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Warehouse Type
              </label>
              <select
                value={formData.warehouseType}
                onChange={(e) => handleChange('warehouseType', e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium bg-white"
              >
                {WAREHOUSE_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium bg-white"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Address Section */}
          <div className="pt-3 border-t border-slate-200">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <MapPin size={14} className="text-amber-500" /> Location & Address
            </h3>
            
            <div className="space-y-3">
              <input
                type="text"
                value={formData.addressLine1}
                onChange={(e) => handleChange('addressLine1', e.target.value)}
                placeholder="Address Line 1 (Plot/Street/Area)"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
              />
              <input
                type="text"
                value={formData.addressLine2}
                onChange={(e) => handleChange('addressLine2', e.target.value)}
                placeholder="Address Line 2 (Landmark/Industrial Zone)"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
              />

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    placeholder="City"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => handleChange('state', e.target.value)}
                    placeholder="State"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={formData.pinCode}
                    onChange={(e) => handleChange('pinCode', e.target.value)}
                    placeholder="PIN Code"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium font-mono"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => handleChange('country', e.target.value)}
                    placeholder="Country"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Contact Person */}
          <div className="pt-3 border-t border-slate-200">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <User size={14} className="text-amber-500" /> Point of Contact
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <input
                  type="text"
                  value={formData.contactPerson}
                  onChange={(e) => handleChange('contactPerson', e.target.value)}
                  placeholder="Contact Person Name"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                />
              </div>
              <div>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="Contact Phone / Mobile"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                />
              </div>
              <div>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="Contact Email"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                />
              </div>
            </div>
          </div>

          {/* Notes & Default Checkbox */}
          <div className="pt-3 border-t border-slate-200 space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Notes & Operational Details
              </label>
              <textarea
                rows={2}
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Gate entry instructions, working hours, loading bay details..."
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="isDefault"
                checked={formData.isDefault}
                onChange={(e) => handleChange('isDefault', e.target.checked)}
                className="w-4 h-4 text-amber-500 rounded border-slate-300 focus:ring-amber-400 cursor-pointer"
              />
              <label htmlFor="isDefault" className="text-sm font-semibold text-slate-800 cursor-pointer">
                Set as Default Warehouse for this workspace
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition-all shadow-md shadow-amber-500/20 disabled:opacity-50"
            >
              {loading ? 'Saving...' : (isEdit ? 'Update Warehouse' : 'Create Warehouse')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
