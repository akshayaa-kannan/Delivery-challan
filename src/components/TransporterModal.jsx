import React, { useState, useEffect } from 'react';
import { 
  X, 
  Truck, 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  FileText, 
  AlertCircle,
  Hash,
  Globe,
  ExternalLink
} from 'lucide-react';
import { 
  INDIAN_STATES, 
  TRANSPORTER_TYPES, 
  getStateCodeFromGstin, 
  validateGstin 
} from '../utils/indianBusiness.js';
import { generateNextTransporterCode, getTransporters } from '../utils/tenantStorage.js';

export default function TransporterModal({ 
  isOpen, 
  onClose, 
  onSave, 
  transporter = null, 
  companyId 
}) {
  const isEdit = Boolean(transporter?.id);

  const [formData, setFormData] = useState({
    transporterCode: '',
    name: '',
    transporterType: 'Road transport',
    contactPerson: '',
    phone: '',
    alternatePhone: '',
    email: '',
    website: '',
    trackingUrlTemplate: '',
    gstin: '',
    pan: '',
    address: '',
    city: '',
    state: '',
    pinCode: '',
    status: 'Active',
    notes: ''
  });

  const [error, setError] = useState('');
  const [gstinWarning, setGstinWarning] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (transporter) {
        setFormData({
          transporterCode: transporter.transporterCode || '',
          name: transporter.name || '',
          transporterType: transporter.transporterType || 'Road transport',
          contactPerson: transporter.contactPerson || '',
          phone: transporter.phone || '',
          alternatePhone: transporter.alternatePhone || '',
          email: transporter.email || '',
          website: transporter.website || '',
          trackingUrlTemplate: transporter.trackingUrlTemplate || '',
          gstin: transporter.gstin || '',
          pan: transporter.pan || '',
          address: transporter.address || '',
          city: transporter.city || '',
          state: transporter.state || '',
          pinCode: transporter.pinCode || '',
          status: transporter.status || 'Active',
          notes: transporter.notes || ''
        });
        setError('');
        setGstinWarning('');
      } else {
        generateNextTransporterCode(companyId).then(nextCode => {
          setFormData({
            transporterCode: nextCode,
            name: '',
            transporterType: 'Road transport',
            contactPerson: '',
            phone: '',
            alternatePhone: '',
            email: '',
            website: '',
            trackingUrlTemplate: '',
            gstin: '',
            pan: '',
            address: '',
            city: '',
            state: '',
            pinCode: '',
            status: 'Active',
            notes: ''
          });
          setError('');
          setGstinWarning('');
        });
      }
    }
  }, [isOpen, transporter, companyId]);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };

      if (field === 'gstin') {
        const cleanGst = (value || '').toUpperCase().trim();
        updated.gstin = cleanGst;
        if (cleanGst.length === 15) {
          const check = validateGstin(cleanGst);
          if (!check.valid) {
            setGstinWarning('Format warning: Standard GSTIN is 15 characters (e.g. 33AAAAA0000A1Z5)');
          } else {
            setGstinWarning('');
            // Extract PAN
            updated.pan = cleanGst.substring(2, 12);
            // Suggest state
            const detectedState = getStateCodeFromGstin(cleanGst);
            if (detectedState?.stateName && !updated.state) {
              updated.state = detectedState.stateName;
            }
          }
        } else {
          setGstinWarning('');
        }
      }

      if (field === 'pan') {
        updated.pan = (value || '').toUpperCase().trim();
      }

      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Transporter / Carrier Name is required.');
      return;
    }

    setLoading(true);
    try {
      if (!transporter?.id && companyId) {
        const existing = await getTransporters(companyId);
        const dup = existing.find(t => t.name && t.name.trim().toLowerCase() === formData.name.trim().toLowerCase());
        if (dup) {
          setError(`A transporter named "${formData.name.trim()}" already exists (${dup.transporterCode}). Please use a unique name.`);
          setLoading(false);
          return;
        }
      }

      const payload = {
        ...formData,
        name: formData.name.trim(),
        transporterCode: (formData.transporterCode || '').trim().toUpperCase(),
        phone: (formData.phone || '').trim(),
        email: (formData.email || '').trim().toLowerCase(),
        gstin: (formData.gstin || '').trim().toUpperCase(),
        pan: (formData.pan || '').trim().toUpperCase()
      };

      if (transporter?.id) {
        payload.id = transporter.id;
      }

      await onSave(payload);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save transporter');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl my-6 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 border border-blue-500/20">
              <Truck size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {isEdit ? 'Edit Transporter / Carrier' : 'Add New Transporter / Carrier'}
              </h3>
              <p className="text-xs text-slate-400">
                Logistics provider, parcel courier, or fleet partner for delivery challans
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Basic & Contact */}
          <div className="space-y-4">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-200">
              <Truck size={14} className="text-blue-600" />
              <span>1. Carrier Details</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Transporter Code <span className="text-blue-600 font-mono">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Hash size={14} />
                  </span>
                  <input
                    type="text"
                    required
                    value={formData.transporterCode}
                    onChange={(e) => handleChange('transporterCode', e.target.value.toUpperCase())}
                    placeholder="TRN-0001"
                    className="w-full pl-8 pr-3 py-2 text-xs font-mono font-bold uppercase border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Transporter / Logistics Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="e.g. VRL Logistics / Blue Dart Express"
                  className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Carrier Type
                </label>
                <select
                  value={formData.transporterType}
                  onChange={(e) => handleChange('transporterType', e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg bg-white"
                >
                  {TRANSPORTER_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Contact Person
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User size={14} />
                  </span>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={(e) => handleChange('contactPerson', e.target.value)}
                    placeholder="Manager / Booking Agent"
                    className="w-full pl-8 pr-3 py-2 text-xs font-medium border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Primary Phone
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone size={14} />
                  </span>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="e.g. 9840123456"
                    className="w-full pl-8 pr-3 py-2 text-xs font-medium border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail size={14} />
                  </span>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="booking@transporter.com"
                    className="w-full pl-8 pr-3 py-2 text-xs font-medium border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Address & Tax Registration */}
          <div className="space-y-4">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-200">
              <MapPin size={14} className="text-blue-600" />
              <span>2. Address & Tax Identity</span>
            </h4>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Office / Hub Address
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="Plot / Shed / Road / Area"
                className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  City / Hub
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder="e.g. Chennai"
                  className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  State
                </label>
                <select
                  value={formData.state}
                  onChange={(e) => handleChange('state', e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">Select State</option>
                  {INDIAN_STATES.map(s => (
                    <option key={s.code} value={s.name}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  PIN Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={formData.pinCode}
                  onChange={(e) => handleChange('pinCode', e.target.value.replace(/\D/g, ''))}
                  placeholder="600001"
                  className="w-full px-3 py-2 text-xs font-mono font-medium border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  GSTIN (15 Digits)
                </label>
                <input
                  type="text"
                  maxLength={15}
                  value={formData.gstin}
                  onChange={(e) => handleChange('gstin', e.target.value)}
                  placeholder="33AAAAA0000A1Z5"
                  className="w-full px-3 py-2 text-xs font-mono uppercase font-bold border border-slate-300 rounded-lg"
                />
                {gstinWarning && (
                  <p className="text-[10px] text-amber-600 font-semibold mt-1">{gstinWarning}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  PAN Number
                </label>
                <input
                  type="text"
                  maxLength={10}
                  value={formData.pan}
                  onChange={(e) => handleChange('pan', e.target.value)}
                  placeholder="AAAAA0000A"
                  className="w-full px-3 py-2 text-xs font-mono uppercase font-bold border border-slate-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Tracking & Status */}
          <div className="space-y-4">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-200">
              <Globe size={14} className="text-blue-600" />
              <span>3. Online Tracking & Status</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Carrier Website / Tracking URL
                </label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleChange('website', e.target.value)}
                  placeholder="https://www.vrllogistics.com"
                  className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Carrier Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg bg-white"
                >
                  <option value="Active">Active (Available for Challans)</option>
                  <option value="Inactive">Inactive (Suspended)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Internal Operational Notes
              </label>
              <textarea
                rows={2}
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Branch timing, contact for ODC cargo, pickup booking cutoffs..."
                className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-2"
            >
              {loading && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              <span>{isEdit ? 'Update Carrier' : 'Save Carrier'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
