import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sliders, 
  AlertCircle, 
  CheckCircle2, 
  Package, 
  Warehouse, 
  Calendar, 
  FileText,
  TrendingUp,
  TrendingDown,
  RefreshCw
} from 'lucide-react';
import { 
  getProducts, 
  getWarehouses, 
  calculateCurrentBalance, 
  recordStockAdjustment, 
  recordOpeningStock, 
  ADJUSTMENT_TYPES 
} from '../utils/tenantStorage.js';

export default function StockAdjustmentModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  companyId, 
  currentUser,
  preselectedProductId = null,
  preselectedWarehouseId = null,
  initialMode = 'ADJUSTMENT' // 'ADJUSTMENT' or 'OPENING_STOCK'
}) {
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [mode, setMode] = useState(initialMode); // 'ADJUSTMENT' or 'OPENING_STOCK'

  const [productId, setProductId] = useState(preselectedProductId || '');
  const [warehouseId, setWarehouseId] = useState(preselectedWarehouseId || '');
  const [adjustmentType, setAdjustmentType] = useState('Positive Adjustment');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0]);

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

        if (!productId && activeProds.length > 0) {
          setProductId(preselectedProductId || activeProds[0].id);
        }
        if (!warehouseId && activeWhs.length > 0) {
          const defWh = activeWhs.find(w => w.isDefault) || activeWhs[0];
          setWarehouseId(preselectedWarehouseId || defWh.id);
        }
      }).finally(() => setLoading(false));
    }
  }, [isOpen, companyId, preselectedProductId, preselectedWarehouseId]);

  if (!isOpen) return null;

  const selectedProduct = products.find(p => p.id === productId);
  const selectedWarehouse = warehouses.find(w => w.id === warehouseId);
  const currentOnHand = productId && warehouseId 
    ? calculateCurrentBalance(companyId, productId, warehouseId) 
    : 0;

  const unit = selectedProduct?.unit || 'NOS';
  const qtyNum = parseFloat(quantity) || 0;

  // Compute preview balances
  let computedDirection = 'IN';
  let diffQty = qtyNum;
  let previewAfter = currentOnHand;

  if (mode === 'OPENING_STOCK') {
    computedDirection = 'IN';
    diffQty = qtyNum;
    previewAfter = qtyNum;
  } else if (adjustmentType === 'Physical Stock Count Correction') {
    const diff = qtyNum - currentOnHand;
    computedDirection = diff >= 0 ? 'IN' : 'OUT';
    diffQty = Math.abs(diff);
    previewAfter = qtyNum;
  } else if (
    adjustmentType === 'Negative Adjustment' ||
    adjustmentType === 'Damaged Stock' ||
    adjustmentType === 'Lost Stock' ||
    adjustmentType === 'Expired Stock'
  ) {
    computedDirection = 'OUT';
    diffQty = qtyNum;
    previewAfter = currentOnHand - qtyNum;
  } else {
    computedDirection = 'IN';
    diffQty = qtyNum;
    previewAfter = currentOnHand + qtyNum;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!productId) {
      setError('Please select a product');
      return;
    }
    if (!warehouseId) {
      setError('Please select a warehouse');
      return;
    }
    if (quantity === '' || isNaN(qtyNum) || qtyNum < 0) {
      setError('Please enter a valid quantity');
      return;
    }
    if (mode === 'ADJUSTMENT' && !reason.trim()) {
      setError('A documented reason is mandatory for stock adjustments');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'OPENING_STOCK') {
        const result = await recordOpeningStock(companyId, {
          productId,
          productName: selectedProduct?.name,
          warehouseId,
          quantity: qtyNum,
          unit,
          effectiveDate,
          referenceNumber: referenceNumber.trim(),
          reason: reason.trim() || 'Initial inventory opening balance'
        }, currentUser);
        if (onSuccess) onSuccess(result);
      } else {
        const result = await recordStockAdjustment(companyId, {
          productId,
          warehouseId,
          quantity: qtyNum,
          unit,
          adjustmentType,
          reason: reason.trim(),
          referenceNumber: referenceNumber.trim(),
          effectiveDate
        }, currentUser);
        if (onSuccess) onSuccess(result);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to record stock adjustment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl my-6 flex flex-col overflow-hidden animate-in fade-in duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-400/10 rounded-lg text-amber-400 border border-amber-400/20">
              <Sliders size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                {mode === 'OPENING_STOCK' ? 'Record Opening Stock' : 'Record Stock Adjustment'}
              </h2>
              <p className="text-xs text-slate-400">
                {mode === 'OPENING_STOCK' 
                  ? 'Initialize initial inventory balance for a product in warehouse' 
                  : 'Document physical count corrections, damaged stock, or manual reconciliation'}
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

        {/* Tab switch between Adjustment and Opening Stock */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2">
          <button
            type="button"
            onClick={() => { setMode('ADJUSTMENT'); setError(''); }}
            className={`pb-2.5 px-3 text-xs font-bold transition-colors border-b-2 ${
              mode === 'ADJUSTMENT' 
                ? 'border-amber-500 text-slate-900' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Stock Adjustment
          </button>
          <button
            type="button"
            onClick={() => { setMode('OPENING_STOCK'); setError(''); }}
            className={`pb-2.5 px-3 text-xs font-bold transition-colors border-b-2 ${
              mode === 'OPENING_STOCK' 
                ? 'border-amber-500 text-slate-900' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Opening Stock Setup
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-slate-800 overflow-y-auto max-h-[75vh]">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs sm:text-sm font-medium">
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Product and Warehouse Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Product <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium bg-white"
              >
                <option value="">Select Product...</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.productCode || p.sku || 'No SKU'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Warehouse <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium bg-white"
              >
                <option value="">Select Warehouse...</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.warehouseCode})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Current Stock Banner */}
          {selectedProduct && selectedWarehouse && (
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current Recorded Stock</span>
                <div className="text-base font-extrabold text-slate-900 font-mono">
                  {currentOnHand} {unit}
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Expected Balance After</span>
                <div className={`text-base font-extrabold font-mono ${
                  previewAfter < 0 ? 'text-rose-600' : 'text-emerald-700'
                }`}>
                  {previewAfter} {unit}
                </div>
              </div>
            </div>
          )}

          {/* Mode specific fields */}
          {mode === 'ADJUSTMENT' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Adjustment Type
                </label>
                <select
                  value={adjustmentType}
                  onChange={(e) => setAdjustmentType(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium bg-white"
                >
                  {ADJUSTMENT_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  {adjustmentType === 'Physical Stock Count Correction' 
                    ? `Physical Count Found (${unit})` 
                    : `Adjustment Quantity (${unit})`} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder={adjustmentType === 'Physical Stock Count Correction' ? 'e.g. 45' : 'e.g. 5'}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium font-mono"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Initial Opening Quantity ({unit}) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                min="0"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 100"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium font-mono"
              />
            </div>
          )}

          {/* Date & Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Effective Date
              </label>
              <input
                type="date"
                required
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Reference Document # (Optional)
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. AUDIT-2026-Q3"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
              />
            </div>
          </div>

          {/* Reason (mandatory for adjustment) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Reason / Audit Justification {mode === 'ADJUSTMENT' && <span className="text-rose-500">*</span>}
            </label>
            <textarea
              rows={2}
              required={mode === 'ADJUSTMENT'}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={mode === 'ADJUSTMENT' 
                ? 'Specify reason (e.g. Physical stock count variance verified during weekly audit)' 
                : 'Initial system opening balance setup notes...'}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
            />
          </div>

          {/* Action Buttons */}
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
              {loading ? 'Posting Transaction...' : (mode === 'OPENING_STOCK' ? 'Save Opening Stock' : 'Post Adjustment')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
