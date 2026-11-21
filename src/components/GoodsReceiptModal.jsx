import React, { useState, useEffect } from 'react';
import { 
  X, 
  ArrowDownLeft, 
  Plus, 
  Trash2, 
  AlertCircle, 
  Warehouse, 
  Package, 
  Calendar, 
  FileText 
} from 'lucide-react';
import { 
  getProducts, 
  getWarehouses, 
  recordGoodsReceipt 
} from '../utils/tenantStorage.js';

export default function GoodsReceiptModal({ 
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

  const [destinationWarehouseId, setDestinationWarehouseId] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const [items, setItems] = useState([
    { productId: '', productName: '', quantity: '', unit: 'NOS', unitCost: '' }
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

        if (activeWhs.length > 0) {
          const defWh = activeWhs.find(w => w.isDefault) || activeWhs[0];
          setDestinationWarehouseId(defWh.id);
        }
        if (activeProds.length > 0) {
          setItems([
            { productId: activeProds[0].id, productName: activeProds[0].name, quantity: 1, unit: activeProds[0].unit || 'NOS', unitCost: '' }
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

  const handleItemChange = (index, field, value) => {
    setItems(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const addItemRow = () => {
    if (products.length > 0) {
      const first = products[0];
      setItems(prev => [
        ...prev,
        { productId: first.id, productName: first.name, quantity: 1, unit: first.unit || 'NOS', unitCost: '' }
      ]);
    }
  };

  const removeItemRow = (index) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!destinationWarehouseId) {
      setError('Please select a destination warehouse');
      return;
    }
    if (items.length === 0) {
      setError('Please add at least one product item');
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.productId) {
        setError(`Please select a product for row #${i + 1}`);
        return;
      }
      const qty = parseFloat(it.quantity);
      if (isNaN(qty) || qty <= 0) {
        setError(`Quantity for "${it.productName || 'Row ' + (i + 1)}" must be greater than zero`);
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        destinationWarehouseId,
        supplierName: supplierName.trim(),
        referenceNumber: referenceNumber.trim(),
        receiptDate,
        notes: notes.trim(),
        items: items.map(it => ({
          productId: it.productId,
          productName: it.productName,
          sku: it.sku || '',
          quantity: parseFloat(it.quantity),
          unit: it.unit || 'NOS',
          unitCost: it.unitCost !== '' ? parseFloat(it.unitCost) : null
        }))
      };

      const result = await recordGoodsReceipt(companyId, payload, currentUser);
      if (onSuccess) onSuccess(result);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to record Goods Receipt');
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
              <ArrowDownLeft size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">Record Goods Receipt (GRN)</h2>
              <p className="text-xs text-slate-400">Receive purchased materials, vendor deliveries or production output into warehouse</p>
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-slate-800">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs sm:text-sm font-medium">
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Warehouse & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Receiving Warehouse <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={destinationWarehouseId}
                onChange={(e) => setDestinationWarehouseId(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium bg-white"
              >
                <option value="">Select Destination Warehouse...</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.warehouseCode})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Receipt Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={receiptDate}
                onChange={(e) => setReceiptDate(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium font-mono"
              />
            </div>
          </div>

          {/* Supplier & Ref Doc */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Supplier / Vendor / Source
              </label>
              <input
                type="text"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="e.g. Siemens India Ltd / In-House Assembly"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                PO # / Supplier Invoice / Challan Ref
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. PO-89021 or INV-7832"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
              />
            </div>
          </div>

          {/* Product Items Table */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Received Products
              </label>
              <button
                type="button"
                onClick={addItemRow}
                className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-700"
              >
                <Plus size={14} /> Add Line Item
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Product</th>
                    <th className="py-2.5 px-3 w-28">Quantity</th>
                    <th className="py-2.5 px-3 w-20">Unit</th>
                    <th className="py-2.5 px-3 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {items.map((row, idx) => (
                    <tr key={idx}>
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
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          step="any"
                          min="0.001"
                          required
                          value={row.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                          placeholder="Qty"
                          className="w-full py-1.5 px-2 rounded-lg border border-slate-300 focus:ring-1 focus:ring-amber-500 font-medium font-mono text-xs"
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
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Remarks & Inward Inspection Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Package physical condition, weighbridge verification, or storage bay placement..."
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
            />
          </div>

          {/* Action buttons */}
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
              {loading ? 'Receiving Goods...' : 'Post Goods Receipt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
