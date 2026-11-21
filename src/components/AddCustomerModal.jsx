import React, { useState } from 'react';
import { X, Building2, MapPin, Phone, Mail, FileText, CheckCircle2 } from 'lucide-react';
import { INDIAN_STATES, getStateCodeFromGstin, validateGstin } from '../utils/indianBusiness';

export default function AddCustomerModal({ isOpen, onClose, onCustomerAdded }) {
  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    gstin: '',
    state: '',
    stateCode: '',
    billingAddress: '',
    deliveryAddress: '',
    sameAsBilling: true
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    const updated = { ...formData, [field]: value };

    // Auto-detect State & State Code if GSTIN is typed
    if (field === 'gstin') {
      const upper = value.toUpperCase();
      updated.gstin = upper;
      const detectedCode = getStateCodeFromGstin(upper);
      if (detectedCode) {
        const foundState = INDIAN_STATES.find(s => s.code === detectedCode);
        if (foundState) {
          updated.state = foundState.name;
          updated.stateCode = foundState.code;
        }
      }
    }

    if (field === 'billingAddress' && formData.sameAsBilling) {
      updated.deliveryAddress = value;
    }

    if (field === 'sameAsBilling') {
      if (value) {
        updated.deliveryAddress = updated.billingAddress;
      }
    }

    setFormData(updated);
    setError('');
  };

  const handleStateChange = (stateName) => {
    const foundState = INDIAN_STATES.find(s => s.name === stateName);
    setFormData(prev => ({
      ...prev,
      state: stateName,
      stateCode: foundState ? foundState.code : ''
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Customer / Business Name is required.');
      return;
    }

    if (formData.gstin) {
      const gstinVal = validateGstin(formData.gstin);
      if (!gstinVal.isValid) {
        setError(gstinVal.message);
        return;
      }
    }

    setLoading(true);
    try {
      const customerToSave = {
        name: formData.name.trim(),
        contactPerson: formData.contactPerson.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        gstin: formData.gstin.trim(),
        state: formData.state,
        stateCode: formData.stateCode,
        billingAddress: formData.billingAddress.trim(),
        deliveryAddress: (formData.sameAsBilling ? formData.billingAddress : formData.deliveryAddress).trim(),
        deliveryAddresses: [
          {
            id: `addr_1`,
            label: 'Primary Delivery Location',
            address: (formData.sameAsBilling ? formData.billingAddress : formData.deliveryAddress).trim(),
            contactPerson: formData.contactPerson.trim(),
            phone: formData.phone.trim()
          }
        ]
      };

      await onCustomerAdded(customerToSave);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save customer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <Building2 className="text-amber-400" size={20} />
            <div>
              <h3 className="text-base font-bold text-white">Add New Customer</h3>
              <p className="text-xs text-slate-400">Save client details for instant reuse and challan generation</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Customer / Company Name */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Customer / Business Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g. Larsen & Toubro Limited"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium text-slate-900"
                required
              />
            </div>

            {/* Contact Person */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Contact Person
              </label>
              <input
                type="text"
                value={formData.contactPerson}
                onChange={(e) => handleChange('contactPerson', e.target.value)}
                placeholder="e.g. Ramesh Kumar"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
              />
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Phone / Mobile Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="e.g. 9876543210"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
              />
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="e.g. purchase@company.com"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
              />
            </div>

            {/* GSTIN */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                GSTIN (Optional)
              </label>
              <input
                type="text"
                value={formData.gstin}
                onChange={(e) => handleChange('gstin', e.target.value)}
                placeholder="e.g. 33EGXPD3539N1ZR"
                maxLength={15}
                className="w-full px-3 py-2 text-sm uppercase font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
              />
            </div>

            {/* State */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                State & State Code
              </label>
              <select
                value={formData.state}
                onChange={(e) => handleStateChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900 bg-white"
              >
                <option value="">Select State</option>
                {INDIAN_STATES.map((st) => (
                  <option key={st.code} value={st.name}>
                    {st.name} ({st.code})
                  </option>
                ))}
              </select>
            </div>

            {/* State Code Read-only */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                State Code
              </label>
              <input
                type="text"
                value={formData.stateCode}
                readOnly
                placeholder="Auto-set"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-600"
              />
            </div>

            {/* Billing Address */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Billing / Registered Address
              </label>
              <textarea
                rows={2}
                value={formData.billingAddress}
                onChange={(e) => handleChange('billingAddress', e.target.value)}
                placeholder="Plot No., Street, Industrial Area, City - Pincode"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
              />
            </div>

            {/* Delivery Address Toggle */}
            <div className="md:col-span-2">
              <label className="inline-flex items-center gap-2 cursor-pointer mb-2">
                <input
                  type="checkbox"
                  checked={formData.sameAsBilling}
                  onChange={(e) => handleChange('sameAsBilling', e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs font-semibold text-slate-700">Delivery address is the same as billing address</span>
              </label>

              {!formData.sameAsBilling && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Shipping / Delivery Site Address
                  </label>
                  <textarea
                    rows={2}
                    value={formData.deliveryAddress}
                    onChange={(e) => handleChange('deliveryAddress', e.target.value)}
                    placeholder="Site / Warehouse / Factory location for delivery"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-600/20 cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Saving Customer...' : 'Save & Select Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
