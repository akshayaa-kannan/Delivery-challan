import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Warehouse, 
  Package, 
  Calendar, 
  FileText 
} from 'lucide-react';
import { receiveWarehouseTransfer } from '../utils/tenantStorage.js';

export default function ReceiveTransferModal({ 
  isOpen, 
  onClose, 
  transfer, 
  onSuccess, 
  companyId, 
  currentUser 
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]);

  const [itemReceipts, setItemReceipts] = useState(() => {
    return (transfer?.items || []).map(it => {
      const prevRec = parseFloat(it.receivedQuantity) || 0;
      const outstanding = Math.max(0, (parseFloat(it.dispatchedQuantity) || 0) - prevRec);
      return {
        productId: it.productId,
        productName: it.productName,
        unit: it.unit,
        dispatched: it.dispatchedQuantity,
        previouslyReceived: prevRec,
        outstanding,
        receivedQuantity: outstanding,
        condition: 'Good',
        notes: ''
      };
    });
  });

  if (!isOpen || !transfer) return null;

  const handleQtyChange = (index, val) => {
    setItemReceipts(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], receivedQuantity: val };
      return copy;
    });
    setError('');
  };

  const handleConditionChange = (index, val) => {
    setItemReceipts(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], condition: val };
      return copy;
    });
  };

  const handleNotesChange = (index, val) => {
    setItemReceipts(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], notes: val };
      return copy;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    for (const r of itemReceipts) {
      const num = parseFloat(r.receivedQuantity);
      if (isNaN(num) || num < 0) {
        setError(`Please enter a valid received quantity for "${r.productName}"`);
        return;
      }
      if (num > r.outstanding + 0.0001) {
        setError(`Received quantity (${num}) cannot exceed outstanding quantity (${r.outstanding}) for "${r.productName}"`);
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        receiptDate,
        items: itemReceipts.map(r => ({
          productId: r.productId,
          receivedQuantity: parseFloat(r.receivedQuantity) || 0,
          condition: r.condition,
          notes: (r.notes || '').trim()
        }))
      };

      const result = await receiveWarehouseTransfer(companyId, transfer.id, payload, currentUser);
      if (onSuccess) onSuccess(result);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to record transfer receipt');
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
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">Receive Warehouse Transfer</h2>
              <p className="text-xs text-slate-400">
                Transfer #{transfer.transferNumber} • Destination: {transfer.destinationWarehouseName}
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

        {/* Transfer Metadata Summary */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="font-semibold text-slate-500 uppercase">From:</span>{' '}
            <span className="font-bold text-slate-900">{transfer.sourceWarehouseName}</span>
          </div>
          <div>
            <span className="font-semibold text-slate-500 uppercase">To:</span>{' '}
            <span className="font-bold text-slate-900">{transfer.destinationWarehouseName}</span>
          </div>
          <div>
            <span className="font-semibold text-slate-500 uppercase">Dispatched Date:</span>{' '}
            <span className="font-mono font-bold text-slate-900">{transfer.transferDate}</span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-slate-800">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs sm:text-sm font-medium">
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Arrival & Receipt Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={receiptDate}
              onChange={(e) => setReceiptDate(e.target.value)}
              className="w-full sm:w-1/2 px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium font-mono"
            />
          </div>

          {/* Product verification rows */}
          <div className="pt-2">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              Verify Arrived Products & Quantities
            </label>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Product</th>
                    <th className="py-2.5 px-2 text-center">Dispatched</th>
                    <th className="py-2.5 px-2 text-center">Outstanding</th>
                    <th className="py-2.5 px-3 w-28">Received Qty</th>
                    <th className="py-2.5 px-3 w-32">Condition</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {itemReceipts.map((row, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-3 font-semibold text-slate-900">
                        {row.productName}
                      </td>
                      <td className="py-2 px-2 text-center font-mono text-slate-600">
                        {row.dispatched} {row.unit}
                      </td>
                      <td className="py-2 px-2 text-center font-mono font-bold text-amber-600">
                        {row.outstanding} {row.unit}
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          max={row.outstanding}
                          required
                          value={row.receivedQuantity}
                          onChange={(e) => handleQtyChange(idx, e.target.value)}
                          className="w-full py-1.5 px-2 rounded-lg border border-slate-300 focus:ring-1 focus:ring-amber-500 font-medium font-mono text-xs"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <select
                          value={row.condition}
                          onChange={(e) => handleConditionChange(idx, e.target.value)}
                          className="w-full py-1.5 px-2 rounded-lg border border-slate-300 focus:ring-1 focus:ring-amber-500 font-medium bg-white text-xs"
                        >
                          <option value="Good">Good Condition</option>
                          <option value="Damaged">Damaged in Transit</option>
                          <option value="Incomplete">Partial / Discrepancy</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
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
              {loading ? 'Confirming Receipt...' : 'Confirm Receipt into Warehouse'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
