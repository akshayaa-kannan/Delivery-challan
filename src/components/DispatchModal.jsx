import React, { useState, useEffect } from 'react';
import { Truck, X, Calendar, MapPin, Phone, Hash, AlertCircle, FileText, CheckCircle2, Scale, Warehouse } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { recordDispatch, getTransporters, getWarehouses } from '../utils/tenantStorage';

export default function DispatchModal({ isOpen, onClose, challan, onSuccess }) {
  const { currentCompany, currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [transportersList, setTransportersList] = useState([]);
  const [warehousesList, setWarehousesList] = useState([]);

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });

  // Default values pre-filled from existing challan or company details
  const [formData, setFormData] = useState({
    warehouseId: challan?.warehouseId || challan?.transportDetails?.warehouseId || '',
    dispatchDate: challan?.transportDetails?.dispatchDate || challan?.transport?.dispatchDate || challan?.date || todayStr,
    dispatchTime: timeStr,
    dispatchLocation: challan?.transportDetails?.dispatchLocation || challan?.transport?.dispatchLocation || 
      (currentCompany?.city ? `${currentCompany.displayName || currentCompany.legalName}, ${currentCompany.city}` : ''),
    destination: challan?.transportDetails?.deliveryLocation || challan?.transport?.deliveryLocation || 
      challan?.customerDetails?.deliveryAddress || 
      (typeof challan?.customer === 'string' ? challan.customer.split('\n')[1] || '' : ''),
    transporterName: challan?.transportDetails?.transporterName || challan?.transport?.transporterName || '',
    transporterPhone: '',
    lrNumber: challan?.transportDetails?.lrNumber || challan?.transport?.lrNumber || '',
    ewayBillNumber: challan?.transportDetails?.ewayBillNumber || challan?.transport?.ewayBillNumber || challan?.ewayBillNumber || '',
    vehicleNumber: challan?.transportDetails?.vehicleNumber || challan?.transport?.vehicleNumber || challan?.vehicleNumber || '',
    driverName: challan?.transportDetails?.driverName || challan?.transport?.driverName || '',
    driverPhone: challan?.transportDetails?.driverPhone || challan?.transport?.driverPhone || '',
    expectedDeliveryDate: challan?.transportDetails?.expectedDeliveryDate || challan?.transport?.expectedDeliveryDate || '',
    remarks: challan?.transportDetails?.deliveryInstructions || challan?.transport?.deliveryInstructions || ''
  });

  useEffect(() => {
    if (isOpen && currentCompany?.id) {
      getTransporters(currentCompany.id).then(t => setTransportersList(t || []));
      getWarehouses(currentCompany.id).then(whs => {
        setWarehousesList(whs || []);
        if (!formData.warehouseId && whs?.length > 0) {
          const def = whs.find(w => w.isDefault && w.status === 'Active') || whs[0];
          setFormData(prev => ({ ...prev, warehouseId: def?.id || '' }));
        }
      });
    }
  }, [isOpen, currentCompany?.id]);

  if (!isOpen || !challan) return null;

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.dispatchDate) {
      setError('Dispatch date is required.');
      return;
    }

    setLoading(true);
    try {
      const updated = await recordDispatch(currentCompany.id, challan.id, formData, currentUser);
      if (onSuccess) onSuccess(updated);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to record dispatch.');
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
              <Truck size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Record Goods Dispatch</h3>
              <p className="text-xs text-slate-400">
                Challan #{challan.challanNumber || challan.id} • {challan.customerDetails?.name || 'Customer'}
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Dispatch Timing & Locations */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-200">
              <Calendar size={14} className="text-amber-500" />
              <span>1. Dispatch Schedule & Route</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Warehouse size={12} className="text-amber-500" /> Issue Warehouse
                </label>
                <select
                  value={formData.warehouseId}
                  onChange={(e) => handleChange('warehouseId', e.target.value)}
                  className="w-full px-2 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium bg-white"
                >
                  {warehousesList.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.warehouseCode})
                    </option>
                  ))}
                  {warehousesList.length === 0 && (
                    <option value="">Main Warehouse (Default)</option>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Dispatch Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.dispatchDate}
                  onChange={(e) => handleChange('dispatchDate', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Dispatch Time
                </label>
                <input
                  type="time"
                  value={formData.dispatchTime}
                  onChange={(e) => handleChange('dispatchTime', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Expected Delivery
                </label>
                <input
                  type="date"
                  value={formData.expectedDeliveryDate}
                  onChange={(e) => handleChange('expectedDeliveryDate', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Dispatch Origin Location
                </label>
                <div className="relative">
                  <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={formData.dispatchLocation}
                    onChange={(e) => handleChange('dispatchLocation', e.target.value)}
                    placeholder="e.g. Coimbatore Main Plant"
                    className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Destination Address
                </label>
                <div className="relative">
                  <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={formData.destination}
                    onChange={(e) => handleChange('destination', e.target.value)}
                    placeholder="Customer Site or Factory Address"
                    className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Transporter & Vehicle Identifiers */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-200">
              <Truck size={14} className="text-amber-500" />
              <span>2. Transporter & Vehicle Details</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Transporter / Carrier
                </label>
                {transportersList.length > 0 ? (
                  <select
                    value={formData.transporterName}
                    onChange={(e) => {
                      const val = e.target.value;
                      const matched = transportersList.find(t => t.name === val);
                      handleChange('transporterName', val);
                      if (matched?.phone) handleChange('transporterPhone', matched.phone);
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white font-medium"
                  >
                    <option value="">-- Custom / Direct Entry --</option>
                    <option value="Self Delivery">Self Delivery (In-house)</option>
                    {transportersList.map(t => (
                      <option key={t.id} value={t.name}>{t.transporterCode} — {t.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formData.transporterName}
                    onChange={(e) => handleChange('transporterName', e.target.value)}
                    placeholder="e.g. VRL Logistics, SafeXpress, or Self"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Transporter Contact Phone
                </label>
                <input
                  type="text"
                  value={formData.transporterPhone}
                  onChange={(e) => handleChange('transporterPhone', e.target.value)}
                  placeholder="Transporter phone / booking branch"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  LR / Bilty / Consignment Number
                </label>
                <input
                  type="text"
                  value={formData.lrNumber}
                  onChange={(e) => handleChange('lrNumber', e.target.value)}
                  placeholder="e.g. LR-987654"
                  className="w-full px-3 py-2 text-xs font-mono font-bold uppercase border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  E-Way Bill Number
                </label>
                <input
                  type="text"
                  maxLength={12}
                  value={formData.ewayBillNumber}
                  onChange={(e) => handleChange('ewayBillNumber', e.target.value)}
                  placeholder="12-digit E-Way Bill Number"
                  className="w-full px-3 py-2 text-xs font-mono font-bold uppercase border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Vehicle Registration Number
                </label>
                <input
                  type="text"
                  value={formData.vehicleNumber}
                  onChange={(e) => handleChange('vehicleNumber', e.target.value)}
                  placeholder="e.g. TN 38 AB 1234"
                  className="w-full px-3 py-2 text-xs font-mono font-bold uppercase border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Driver Name
                </label>
                <input
                  type="text"
                  value={formData.driverName}
                  onChange={(e) => handleChange('driverName', e.target.value)}
                  placeholder="Driver Full Name"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Driver Phone
                </label>
                <input
                  type="text"
                  value={formData.driverPhone}
                  onChange={(e) => handleChange('driverPhone', e.target.value)}
                  placeholder="Driver Mobile No"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Dispatch Remarks */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Dispatch Instructions / Remarks
            </label>
            <textarea
              rows={2}
              value={formData.remarks}
              onChange={(e) => handleChange('remarks', e.target.value)}
              placeholder="e.g. Handle with care, fragile industrial gear units, deliver during daytime..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-lg shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>Recording Dispatch...</>
              ) : (
                <>
                  <CheckCircle2 size={15} /> Confirm & Mark Dispatched
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
