import React, { useState, useEffect } from 'react';
import { 
  X, 
  Scale, 
  AlertTriangle, 
  CheckCircle2, 
  FileText, 
  MapPin, 
  User, 
  Calendar,
  Clock,
  Info
} from 'lucide-react';
import { WEIGHING_METHODS } from '../utils/indianBusiness.js';
import { calculateWeightDiscrepancy, weightToKg } from '../utils/calculations.js';

export default function ActualWeightModal({ 
  isOpen, 
  onClose, 
  onSave, 
  challan, 
  currentUser 
}) {
  const calculatedGross = challan?.totalGrossWeight || 0;
  const calculatedUnit = challan?.weightUnit || 'Kg';

  const [formData, setFormData] = useState({
    actualGrossWeight: '',
    actualTareWeight: '',
    weightUnit: 'Kg',
    weighingMethod: 'Standard weighbridge',
    receiptNumber: '',
    weighedAt: new Date().toISOString().slice(0, 16),
    location: '',
    weighedBy: currentUser?.name || 'Gate Operator',
    tolerancePercentage: 2,
    discrepancyReason: '',
    notes: ''
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && challan) {
      const existing = challan.actualWeighing || {};
      setFormData({
        actualGrossWeight: existing.actualGrossWeight !== undefined && existing.actualGrossWeight !== null ? existing.actualGrossWeight : '',
        actualTareWeight: existing.actualTareWeight !== undefined && existing.actualTareWeight !== null ? existing.actualTareWeight : '',
        weightUnit: existing.weightUnit || calculatedUnit || 'Kg',
        weighingMethod: existing.weighingMethod || 'Standard weighbridge',
        receiptNumber: existing.receiptNumber || existing.slipNumber || '',
        weighedAt: existing.weighedAt ? existing.weighedAt.slice(0, 16) : new Date().toISOString().slice(0, 16),
        location: existing.location || '',
        weighedBy: existing.weighedBy || currentUser?.name || 'Gate Operator',
        tolerancePercentage: existing.tolerancePercentage !== undefined ? existing.tolerancePercentage : 2,
        discrepancyReason: existing.discrepancyReason || '',
        notes: existing.notes || ''
      });
      setError('');
    }
  }, [isOpen, challan, currentUser, calculatedUnit]);

  if (!isOpen || !challan) return null;

  const actualGrossNum = parseFloat(formData.actualGrossWeight) || 0;
  const actualTareNum = parseFloat(formData.actualTareWeight) || 0;
  const actualNetNum = Math.max(0, actualGrossNum - actualTareNum);

  // Compare actual gross (or actual net if tare entered) vs calculated gross
  const discrepancy = calculateWeightDiscrepancy(
    calculatedGross,
    actualGrossNum,
    parseFloat(formData.tolerancePercentage) || 2
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.actualGrossWeight === '' || isNaN(actualGrossNum) || actualGrossNum <= 0) {
      setError('Please enter a valid measured actual gross weight.');
      return;
    }

    if (discrepancy.status === 'Discrepancy Detected' && !formData.discrepancyReason.trim()) {
      setError('A significant weight discrepancy was detected. Please provide a discrepancy reason.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        grossWeight: actualGrossNum,
        actualGrossWeight: actualGrossNum,
        tareWeight: actualTareNum,
        actualTareWeight: actualTareNum,
        netWeight: actualNetNum,
        actualNetWeight: actualNetNum,
        weightUnit: formData.weightUnit,
        weighingMethod: formData.weighingMethod,
        weighbridgeReceiptNo: formData.receiptNumber.trim(),
        receiptNumber: formData.receiptNumber.trim(),
        weighingDate: formData.weighedAt ? formData.weighedAt.split('T')[0] : '',
        weighingTime: formData.weighedAt ? formData.weighedAt.split('T')[1] : '',
        weighedAt: formData.weighedAt,
        weighingLocation: formData.location.trim(),
        location: formData.location.trim(),
        weighedBy: formData.weighedBy.trim(),
        tolerancePercentage: parseFloat(formData.tolerancePercentage) || 2,
        calculatedGrossWeight: calculatedGross,
        discrepancyKg: discrepancy.discrepancyKg,
        discrepancyPercentage: discrepancy.discrepancyPercentage,
        status: discrepancy.status,
        discrepancyReason: formData.discrepancyReason.trim(),
        notes: formData.notes.trim()
      };

      await onSave(payload);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to record actual weight');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl my-6 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-400/10 rounded-lg text-amber-400 border border-amber-400/20">
              <Scale size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Record Actual Weighing
              </h3>
              <p className="text-xs text-slate-400">
                Challan {challan.challanNumber} • Calculated: {calculatedGross} {calculatedUnit}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Reference Card */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-500 block text-[11px] font-medium">Document Gross Weight</span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                {calculatedGross.toFixed(2)} {calculatedUnit}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px] font-medium">Total Packages</span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                {challan.totalPackages || challan.items?.reduce((s, i) => s + (parseInt(i.quantity) || 0), 0) || 1} {challan.packagingType || 'Packages'}
              </span>
            </div>
          </div>

          {/* Actual Weights Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-200">
              <Scale size={14} className="text-amber-500" />
              <span>Measured Weighbridge Weights</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Actual Gross <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={formData.actualGrossWeight}
                  onChange={(e) => setFormData(prev => ({ ...prev, actualGrossWeight: e.target.value }))}
                  placeholder="0.00"
                  className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Vehicle Tare
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.actualTareWeight}
                  onChange={(e) => setFormData(prev => ({ ...prev, actualTareWeight: e.target.value }))}
                  placeholder="0.00"
                  className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Unit
                </label>
                <select
                  value={formData.weightUnit}
                  onChange={(e) => setFormData(prev => ({ ...prev, weightUnit: e.target.value }))}
                  className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg bg-white"
                >
                  <option value="Kg">Kilograms (Kg)</option>
                  <option value="t">Metric Tons (t)</option>
                  <option value="q">Quintals (q)</option>
                  <option value="g">Grams (g)</option>
                </select>
              </div>
            </div>

            {/* Live Discrepancy Assessment */}
            {actualGrossNum > 0 && (
              <div className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
                discrepancy.status === 'Verified' || discrepancy.status === 'Within Tolerance'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-amber-50 border-amber-300 text-amber-900'
              }`}>
                <div className="flex items-center gap-2.5">
                  {discrepancy.status === 'Verified' || discrepancy.status === 'Within Tolerance' ? (
                    <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle size={18} className="text-amber-600 shrink-0" />
                  )}
                  <div>
                    <span className="font-bold block">
                      {discrepancy.status}: {discrepancy.discrepancyKg > 0 ? `+${discrepancy.discrepancyKg}` : discrepancy.discrepancyKg} {calculatedUnit} ({discrepancy.discrepancyPercentage}%)
                    </span>
                    <span className="text-[11px] opacity-80">
                      Permissible tolerance: ±{formData.tolerancePercentage}%
                    </span>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                  discrepancy.status === 'Discrepancy Detected' ? 'bg-amber-200 text-amber-800' : 'bg-emerald-200 text-emerald-800'
                }`}>
                  {discrepancy.status}
                </span>
              </div>
            )}

            {discrepancy.status === 'Discrepancy Detected' && (
              <div>
                <label className="block text-xs font-bold text-amber-900 uppercase tracking-wider mb-1">
                  Discrepancy Justification / Reason <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.discrepancyReason}
                  onChange={(e) => setFormData(prev => ({ ...prev, discrepancyReason: e.target.value }))}
                  placeholder="e.g. Wooden dunnage added, moisture variation, wet tarp"
                  className="w-full px-3 py-2 text-xs font-medium border border-amber-300 bg-amber-50/50 rounded-lg focus:ring-2 focus:ring-amber-500"
                />
              </div>
            )}
          </div>

          {/* Weighing Details */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-200">
              <FileText size={14} className="text-slate-600" />
              <span>Weighbridge Slip & Operator</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Weighbridge Slip / Receipt No
                </label>
                <input
                  type="text"
                  value={formData.receiptNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, receiptNumber: e.target.value }))}
                  placeholder="e.g. WB-2026-9941"
                  className="w-full px-3 py-2 text-xs font-mono font-medium border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Weighing Method
                </label>
                <select
                  value={formData.weighingMethod}
                  onChange={(e) => setFormData(prev => ({ ...prev, weighingMethod: e.target.value }))}
                  className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg bg-white"
                >
                  {WEIGHING_METHODS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Weighing Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={formData.weighedAt}
                  onChange={(e) => setFormData(prev => ({ ...prev, weighedAt: e.target.value }))}
                  className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Weighed By (Operator)
                </label>
                <input
                  type="text"
                  value={formData.weighedBy}
                  onChange={(e) => setFormData(prev => ({ ...prev, weighedBy: e.target.value }))}
                  placeholder="Gate / Scale Operator"
                  className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Weighbridge Station / Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="e.g. Factory Main Gate Weighbridge #1"
                className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
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
              className="px-5 py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-2"
            >
              {loading && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              <span>Save Weighing Slip</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
