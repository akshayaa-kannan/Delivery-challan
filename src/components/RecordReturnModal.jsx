import React, { useState, useEffect } from 'react';
import { RotateCcw, X, AlertCircle, CheckCircle2, User, Calendar, MapPin, Package } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { recordGoodsReturn, RETURN_CONDITIONS } from '../utils/tenantStorage';

export default function RecordReturnModal({ isOpen, onClose, challan, onSuccess }) {
  const { currentCompany, currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const items = challan?.items || challan?.products || [];
  const [returnItems, setReturnItems] = useState([]);
  const [returnDate, setReturnDate] = useState(todayStr);
  const [receivedBy, setReceivedBy] = useState(currentUser?.displayName || currentUser?.email || 'Store In-Charge');
  const [returnLocation, setReturnLocation] = useState(
    currentCompany?.city ? `${currentCompany.displayName || currentCompany.legalName}, ${currentCompany.city}` : ''
  );
  const [overallCondition, setOverallCondition] = useState('Good');
  const [reason, setReason] = useState('Job Work Processing Completed');
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    if (challan) {
      const isReturnableDoc = challan.challanType === 'Returnable Challan' || 
        challan.returnable?.isReturnable || 
        items.some(i => i.isReturnable);

      const rList = items
        .filter(it => it.isReturnable || isReturnableDoc)
        .map((it, idx) => {
          const issued = parseFloat(it.returnableQty !== undefined ? it.returnableQty : it.quantity) || 0;
          const prevReturned = parseFloat(it.returnedQty) || 0;
          const outstanding = Math.max(0, issued - prevReturned);

          return {
            serialNumber: it.serialNumber || idx + 1,
            productId: it.productId || null,
            name: it.name,
            unit: it.unit || 'NOS',
            issued,
            prevReturned,
            outstanding,
            returnedThisEvent: outstanding, // default to outstanding
            condition: 'Good',
            remarks: ''
          };
        });

      setReturnItems(rList);
    }
  }, [challan]);

  const handleQtyChange = (index, val) => {
    const num = parseFloat(val) || 0;
    setReturnItems(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], returnedThisEvent: num };
      return copy;
    });
    setError('');
  };

  const handleReturnAll = () => {
    setReturnItems(prev => prev.map(r => ({ ...r, returnedThisEvent: r.outstanding })));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const activeReturns = returnItems.filter(r => parseFloat(r.returnedThisEvent) > 0);
    if (activeReturns.length === 0) {
      setError('You must specify a return quantity greater than 0 for at least one item.');
      return;
    }

    // Validate quantities
    for (const r of activeReturns) {
      const qty = parseFloat(r.returnedThisEvent) || 0;
      if (qty > r.outstanding + 0.0001) {
        setError(`Returned quantity (${qty}) exceeds outstanding returnable quantity (${r.outstanding}) for "${r.name}".`);
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        returnDate,
        receivedBy: receivedBy.trim(),
        returnLocation: returnLocation.trim(),
        condition: overallCondition,
        reason: reason.trim(),
        remarks: remarks.trim(),
        items: activeReturns.map(r => ({
          serialNumber: r.serialNumber,
          productId: r.productId,
          name: r.name,
          returnedQuantity: parseFloat(r.returnedThisEvent),
          condition: r.condition || overallCondition,
          remarks: r.remarks
        }))
      };

      const updated = await recordGoodsReturn(currentCompany.id, challan.id, payload, currentUser);
      if (onSuccess) onSuccess(updated);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to record return.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !challan) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl my-6 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-400/10 rounded-lg text-amber-400 border border-amber-400/20">
              <RotateCcw size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Record Goods Return</h3>
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

          {/* Section 1: Returnable Items Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Package size={14} className="text-amber-500" />
                <span>1. Returnable Items & Quantities Received</span>
              </h4>
              <button
                type="button"
                onClick={handleReturnAll}
                className="text-[11px] font-bold text-amber-600 hover:text-amber-700 underline"
              >
                Return All Outstanding Items
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Item Name</th>
                    <th className="py-2.5 px-3 text-center">Issued</th>
                    <th className="py-2.5 px-3 text-center">Returned</th>
                    <th className="py-2.5 px-3 text-center">Outstanding</th>
                    <th className="py-2.5 px-3 text-right">Returning Now</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {returnItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {item.name}
                        <span className="text-[10px] text-slate-400 font-normal ml-1">({item.unit})</span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">{item.issued}</td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-500">{item.prevReturned}</td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-amber-600">{item.outstanding}</td>
                      <td className="py-2.5 px-3 text-right">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          max={item.outstanding}
                          value={item.returnedThisEvent}
                          onChange={(e) => handleQtyChange(idx, e.target.value)}
                          className="w-24 px-2 py-1 text-xs text-right font-mono font-bold border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Return Details */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-200">
              <Calendar size={14} className="text-amber-500" />
              <span>2. Return Receipt Information</span>
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Return Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Received By <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={receivedBy}
                  onChange={(e) => setReceivedBy(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Return Condition
                </label>
                <select
                  value={overallCondition}
                  onChange={(e) => setOverallCondition(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
                >
                  {RETURN_CONDITIONS.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Return Location / Receiving Bay
                </label>
                <div className="relative">
                  <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={returnLocation}
                    onChange={(e) => setReturnLocation(e.target.value)}
                    placeholder="e.g. Unit 2 Inspection Bay, Main Warehouse"
                    className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Reason for Return
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Work completed, Demo finished, Calibration done"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Remarks */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Inspection / Receiving Remarks
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Returned tooling units in functional condition, minor scratches noted..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Action Footer */}
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
                <>Recording Return...</>
              ) : (
                <>
                  <CheckCircle2 size={15} /> Save Goods Return
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
