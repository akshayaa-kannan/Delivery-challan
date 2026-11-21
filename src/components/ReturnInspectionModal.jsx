import React, { useState } from 'react';
import { ClipboardCheck, X, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { recordReturnInspection, RETURN_DISPOSITIONS } from '../utils/tenantStorage';

export default function ReturnInspectionModal({ isOpen, onClose, challan, transaction, onSuccess }) {
  const { currentCompany, currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const txItems = transaction?.items || [];
  const totalReceived = txItems.reduce((acc, it) => acc + (parseFloat(it.returnedQuantity) || 0), 0);

  const [acceptedQty, setAcceptedQty] = useState(totalReceived);
  const [damagedQty, setDamagedQty] = useState(0);
  const [incompleteQty, setIncompleteQty] = useState(0);
  const [rejectedQty, setRejectedQty] = useState(0);
  const [disposition, setDisposition] = useState(RETURN_DISPOSITIONS[0]);
  const [notes, setNotes] = useState('');
  const [inspectionDate, setInspectionDate] = useState(todayStr);

  if (!isOpen || !challan || !transaction) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    const sumQuantities = (parseFloat(acceptedQty) || 0) + 
      (parseFloat(damagedQty) || 0) + 
      (parseFloat(incompleteQty) || 0) + 
      (parseFloat(rejectedQty) || 0);

    if (Math.abs(sumQuantities - totalReceived) > 0.001) {
      setError(`Sum of inspected quantities (${sumQuantities}) must equal total received quantity (${totalReceived}).`);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        inspectionDate,
        inspector: currentUser?.displayName || currentUser?.email || 'Inspector',
        acceptedQty: parseFloat(acceptedQty) || 0,
        damagedQty: parseFloat(damagedQty) || 0,
        incompleteQty: parseFloat(incompleteQty) || 0,
        rejectedQty: parseFloat(rejectedQty) || 0,
        disposition,
        notes: notes.trim()
      };

      const updated = await recordReturnInspection(currentCompany.id, challan.id, transaction.id, payload, currentUser);
      if (onSuccess) onSuccess(updated);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to record inspection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg my-6 flex flex-col overflow-hidden animate-in fade-in duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-400/10 rounded-lg text-amber-400 border border-amber-400/20">
              <ClipboardCheck size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Inspect Returned Goods</h3>
              <p className="text-xs text-slate-400">
                Transaction #{transaction.id.slice(-6)} • Received Qty: {totalReceived}
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Challan Number:</span>
              <span className="font-mono font-bold text-slate-800">{challan.challanNumber || challan.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Return Date:</span>
              <span className="font-semibold text-slate-800">{transaction.returnDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Total Items In Return:</span>
              <span className="font-bold text-amber-600">{totalReceived} total units</span>
            </div>
          </div>

          {/* Quantities breakdown */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Inspection Quantities Breakdown (Total: {totalReceived})
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="block text-[11px] font-semibold text-emerald-700 mb-1">Accepted / Intact</span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={acceptedQty}
                  onChange={(e) => setAcceptedQty(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-mono font-bold border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div>
                <span className="block text-[11px] font-semibold text-rose-700 mb-1">Damaged</span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={damagedQty}
                  onChange={(e) => setDamagedQty(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-mono font-bold border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div>
                <span className="block text-[11px] font-semibold text-amber-700 mb-1">Incomplete / Parts Missing</span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={incompleteQty}
                  onChange={(e) => setIncompleteQty(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-mono font-bold border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div>
                <span className="block text-[11px] font-semibold text-slate-700 mb-1">Rejected / Disputed</span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={rejectedQty}
                  onChange={(e) => setRejectedQty(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-mono font-bold border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Final Disposition / Outcome
            </label>
            <select
              value={disposition}
              onChange={(e) => setDisposition(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
            >
              {RETURN_DISPOSITIONS.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Inspection Notes & Findings
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Cleaned and tested, ready for next consignment..."
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
                <>Saving Inspection...</>
              ) : (
                <>
                  <CheckCircle2 size={15} /> Save Inspection Result
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
