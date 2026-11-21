import React, { useState } from 'react';
import { X, Package } from 'lucide-react';
import { STANDARD_UOMS, GST_RATES } from '../utils/indianBusiness';

export default function AddProductModal({ isOpen, onClose, onProductAdded }) {
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    hsn: '',
    unit: 'NOS',
    customUnit: '',
    rate: '',
    taxRate: 18
  });
  const [useCustomUnit, setUseCustomUnit] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Product Name is required.');
      return;
    }

    const selectedUnit = useCustomUnit ? (formData.customUnit.trim().toUpperCase() || 'NOS') : formData.unit;

    setLoading(true);
    try {
      const productToSave = {
        name: formData.name.trim(),
        sku: formData.sku.trim(),
        description: formData.description.trim(),
        hsn: formData.hsn.trim(),
        unit: selectedUnit,
        rate: parseFloat(formData.rate) || 0,
        taxRate: parseFloat(formData.taxRate) || 0
      };

      await onProductAdded(productToSave);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <Package className="text-amber-400" size={20} />
            <div>
              <h3 className="text-base font-bold text-white">Add New Product / Item</h3>
              <p className="text-xs text-slate-400">Save item to master catalog for fast challan dispatch</p>
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

          <div className="space-y-4">
            {/* Product Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Product / Item Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g. APFC Control Panel 150 KVAR"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Product Code / SKU */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Product Code / SKU
                </label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => handleChange('sku', e.target.value)}
                  placeholder="e.g. CP-150-KVAR"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-slate-900"
                />
              </div>

              {/* HSN / SAC Code */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  HSN / SAC Code
                </label>
                <input
                  type="text"
                  value={formData.hsn}
                  onChange={(e) => handleChange('hsn', e.target.value)}
                  placeholder="e.g. 8537"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-slate-900"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Description / Specifications
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="e.g. 415V 50Hz with microprocessor relay"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Unit of Measurement */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Unit (UOM)
                  </label>
                  <button
                    type="button"
                    onClick={() => setUseCustomUnit(!useCustomUnit)}
                    className="text-[10px] text-blue-600 hover:underline font-semibold cursor-pointer"
                  >
                    {useCustomUnit ? 'Choose standard' : '+ Custom Unit'}
                  </button>
                </div>

                {useCustomUnit ? (
                  <input
                    type="text"
                    value={formData.customUnit}
                    onChange={(e) => handleChange('customUnit', e.target.value)}
                    placeholder="e.g. PACK, DRUM, LOT"
                    className="w-full px-3 py-2 text-sm uppercase font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  />
                ) : (
                  <select
                    value={formData.unit}
                    onChange={(e) => handleChange('unit', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900 bg-white"
                  >
                    {STANDARD_UOMS.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Standard Rate / Unit Price */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Default Rate (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={formData.rate}
                  onChange={(e) => handleChange('rate', e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                />
              </div>
            </div>

            {/* GST Rate */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Standard GST Rate (%)
              </label>
              <div className="flex gap-2">
                {GST_RATES.map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => handleChange('taxRate', rate)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                      formData.taxRate === rate
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {rate}%
                  </button>
                ))}
              </div>
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
              {loading ? 'Saving Item...' : 'Save Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
