import React, { useState, useEffect } from 'react';
import { 
  X, 
  ArrowRightLeft, 
  Plus, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  Warehouse, 
  Package, 
  Calendar,
  Send
} from 'lucide-react';
import { 
  getProducts, 
  getWarehouses, 
  calculateCurrentBalance, 
  createWarehouseTransfer 
} from '../utils/tenantStorage.js';

export default function TransferModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  companyId, 
  currentUser 
}) {
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [sourceWarehouseId, setSourceWarehouseId] = useState('');
  const [destinationWarehouseId, setDestinationWarehouseId] = useState('');
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const [items, setItems] = useState([
    { productId: '', productName: '', requestedQuantity: 1, unit: 'NOS' }
  ]);

  useEffect(() => {
    if (isOpen && companyId) {
      setError('');
      setLoading(true);
      Promise.all([
        getProducts(companyId),
        getWarehouses(companyId)
      ]).then(([prods, whs]) => {
        const activeProds = prods.filter(p => p.status === 'Active');
        const activeWhs = whs.filter(w => w.status === 'Active');
        setProducts(activeProds);
        setWarehouses(activeWhs);

        if (activeWhs.length >= 2) {
          setSourceWarehouseId(activeWhs[0].id);
          setDestinationWarehouseId(activeWhs[1].id);
        } else if (activeWhs.length === 1) {
          setSourceWarehouseId(activeWhs[0].id);
        }

        if (activeProds.length > 0) {
          setItems([
            { productId: activeProds[0].id, productName: activeProds[0].name, requestedQuantity: 1, unit: activeProds[0].unit || 'NOS' }
          ]);
        }
      }).finally(() => setLoading(false));
    }
  }, [isOpen, companyId]);

  if (!isOpen) return null;

  const handleProductChange = (index, prodId) => {
    const p = products.find(prod => prod.id === prodId);
    setItems(prev => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        productId: prodId,
        productName: p?.name || '',
        unit: p?.unit || 'NOS',
        sku: p?.productCode || p?.sku || ''
      };
      return copy;
    });
  };

  const handleQtyChange = (index, val) => {
    setItems(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], requestedQuantity: val };
      return copy;
    });
  };

  const addItemRow = () => {
    if (products.length > 0) {
      const first = products[0];
      setItems(prev => [
        ...prev,
        { productId: first.id, productName: first.name, requestedQuantity: 1, unit: first.unit || 'NOS' }
      ]);
    }
  };

  const removeItemRow = (index) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e, dispatchImmediately = false) => {
    if (e) e.preventDefault();

    if (!sourceWarehouseId || !destinationWarehouseId) {
      setError('Both source and destination warehouses are required');
      return;
    }
    if (sourceWarehouseId === destinationWarehouseId) {
      setError('Source and destination warehouses must be different');
      return;
    }
    if (items.length === 0) {
      setError('At least one product item is required');
      return;
    }

    // Check availability
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.productId) {
        setError(`Please select a product for line #${i + 1}`);
        return;
      }
      const qty = parseFloat(it.requestedQuantity);
      if (isNaN(qty) || qty <= 0) {
        setError(`Quantity for "${it.productName || 'Line ' + (i + 1)}" must be greater than zero`);
        return;
      }

      if (dispatchImmediately) {
        const avail = calculateCurrentBalance(companyId, it.productId, sourceWarehouseId);
        if (avail < qty - 0.0001) {
          setError(`Insufficient stock for "${it.productName}". Available in source warehouse: ${avail} ${it.unit}, Requested: ${qty} ${it.unit}`);
          return;
        }
      }
    }

    setLoading(true);
    try {
      const payload = {
        sourceWarehouseId,
        destinationWarehouseId,
        transferDate,
        notes: notes.trim(),
        items: items.map(it => ({
          productId: it.productId,
          productName: it.productName,
          sku: it.sku || '',
          requestedQuantity: parseFloat(it.requestedQuantity),
          unit: it.unit || 'NOS'
        })),
        dispatchImmediately
      };

      const result = await createWarehouseTransfer(companyId, payload, currentUser);
      if (onSuccess) onSuccess(result);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create transfer');
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
              <ArrowRightLeft size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">Create Stock Transfer</h2>
              <p className="text-xs text-slate-400">Move products from one warehouse to another with transit tracking</p>
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
        <form className="flex-1 overflow-y-auto p-6 space-y-4 text-slate-800">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs sm:text-sm font-medium">
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Warehouses Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Source Warehouse (From) <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={sourceWarehouseId}
                onChange={(e) => setSourceWarehouseId(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium bg-white"
              >
                <option value="">Select Source Warehouse...</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.warehouseCode})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Destination Warehouse (To) <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={destinationWarehouseId}
                onChange={(e) => setDestinationWarehouseId(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium bg-white"
              >
                <option value="">Select Destination Warehouse...</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id} disabled={w.id === sourceWarehouseId}>
                    {w.name} ({w.warehouseCode}) {w.id === sourceWarehouseId ? '(Source)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Transfer Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={transferDate}
              onChange={(e) => setTransferDate(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium font-mono"
            />
          </div>

          {/* Product Items Table */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Products to Transfer
              </label>
              <button
                type="button"
                onClick={addItemRow}
                className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-700"
              >
                <Plus size={14} /> Add Product
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Product</th>
                    <th className="py-2.5 px-3 w-28 text-center">Avail Stock</th>
                    <th className="py-2.5 px-3 w-28">Transfer Qty</th>
                    <th className="py-2.5 px-3 w-16">Unit</th>
                    <th className="py-2.5 px-3 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {items.map((row, idx) => {
                    const avail = row.productId && sourceWarehouseId 
                      ? calculateCurrentBalance(companyId, row.productId, sourceWarehouseId)
                      : 0;
                    const reqQty = parseFloat(row.requestedQuantity) || 0;
                    const isExceeding = reqQty > avail;

                    return (
                      <tr key={idx} className={isExceeding ? 'bg-rose-50/50' : ''}>
                        <td className="py-2 px-3">
                          <select
                            required
                            value={row.productId}
                            onChange={(e) => handleProductChange(idx, e.target.value)}
                            className="w-full py-1.5 px-2 rounded-lg border border-slate-300 focus:ring-1 focus:ring-amber-500 font-medium bg-white text-xs"
                          >
                            <option value="">Select Product...</option>
                            {products.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.productCode || p.sku})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 px-3 text-center font-mono font-bold text-slate-700">
                          {avail}
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            step="any"
                            min="0.001"
                            required
                            value={row.requestedQuantity}
                            onChange={(e) => handleQtyChange(idx, e.target.value)}
                            placeholder="Qty"
                            className={`w-full py-1.5 px-2 rounded-lg border font-medium font-mono text-xs ${
                              isExceeding 
                                ? 'border-rose-400 bg-rose-50 text-rose-900 focus:ring-rose-500' 
                                : 'border-slate-300 focus:ring-amber-500'
                            }`}
                          />
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-600">
                          {row.unit}
                        </td>
                        <td className="py-2 px-2 text-center">
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItemRow(idx)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Transfer Notes & Vehicle / LR Reference
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Driver name, vehicle number, dispatch reason..."
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
            />
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
              type="button"
              onClick={(e) => handleSubmit(e, false)}
              disabled={loading}
              className="px-4 py-2 text-sm font-bold text-slate-800 bg-slate-200 hover:bg-slate-300 rounded-xl transition-colors disabled:opacity-50"
            >
              Save as Draft
            </button>
            <button
              type="button"
              onClick={(e) => handleSubmit(e, true)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition-all shadow-md shadow-amber-500/20 disabled:opacity-50"
            >
              <Send size={15} /> {loading ? 'Processing...' : 'Dispatch Immediately'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
