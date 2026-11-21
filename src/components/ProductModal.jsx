import React, { useState, useEffect } from 'react';
import { 
  X, 
  Package, 
  Tag, 
  Scale, 
  RotateCcw, 
  IndianRupee, 
  CheckCircle2, 
  AlertCircle,
  Hash,
  Plus,
  Boxes
} from 'lucide-react';
import { 
  STANDARD_UOMS, 
  PRODUCT_TYPES, 
  WEIGHT_UNITS, 
  WEIGHT_BASES,
  DIMENSION_UNITS, 
  GST_RATES 
} from '../utils/indianBusiness.js';
import { 
  generateNextProductCode, 
  getCategories, 
  saveCategory,
  getProducts 
} from '../utils/tenantStorage.js';

export default function ProductModal({ 
  isOpen, 
  onClose, 
  onSave, 
  product = null, 
  companyId 
}) {
  const isEdit = Boolean(product?.id);

  const [formData, setFormData] = useState({
    productCode: '',
    sku: '',
    name: '',
    category: 'General',
    categoryId: '',
    productType: 'Goods',
    description: '',
    brand: '',
    modelNumber: '',
    barcode: '',
    hsn: '',
    unit: 'NOS',
    customUnit: '',
    rate: '',
    purchaseRate: '',
    taxRate: 18,
    unitWeight: '',
    weightUnit: 'Kg',
    length: '',
    width: '',
    height: '',
    dimensionUnit: 'cm',
    volume: '',
    isReturnable: false,
    expectedReturnPeriod: '',
    conditionNotes: '',
            reorderLevel: '',
            minStock: '',
            maxStock: '',
            status: 'Active'
  });

  const [categories, setCategories] = useState([]);
  const [newCatInput, setNewCatInput] = useState('');
  const [showNewCatInput, setShowNewCatInput] = useState(false);
  const [useCustomUnit, setUseCustomUnit] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && companyId) {
      getCategories(companyId).then(cats => {
        setCategories(cats);
      });

      if (product) {
        // Edit mode
        setFormData({
          productCode: product.productCode || product.sku || '',
          sku: product.sku || product.productCode || '',
          name: product.name || '',
          category: product.category || 'General',
          categoryId: product.categoryId || '',
          productType: product.productType || 'Goods',
          description: product.description || '',
          brand: product.brand || '',
          modelNumber: product.modelNumber || '',
          barcode: product.barcode || '',
          hsn: product.hsn || '',
          unit: product.unit || 'NOS',
          customUnit: '',
          rate: product.rate !== undefined && product.rate !== null ? product.rate : '',
          purchaseRate: product.purchaseRate !== undefined && product.purchaseRate !== null ? product.purchaseRate : '',
          taxRate: product.taxRate !== undefined && product.taxRate !== null ? product.taxRate : 18,
          unitWeight: product.unitWeight !== undefined && product.unitWeight !== null ? product.unitWeight : '',
          weightUnit: product.weightUnit || 'Kg',
          weightBasis: product.weightBasis || 'NET_PER_UNIT',
          packagingWeight: product.packagingWeight !== undefined && product.packagingWeight !== null ? product.packagingWeight : '',
          length: product.length !== undefined && product.length !== null ? product.length : '',
          width: product.width !== undefined && product.width !== null ? product.width : '',
          height: product.height !== undefined && product.height !== null ? product.height : '',
          dimensionUnit: product.dimensionUnit || 'cm',
          volume: product.volume !== undefined && product.volume !== null ? product.volume : '',
          isReturnable: Boolean(product.isReturnable),
          expectedReturnPeriod: product.expectedReturnPeriod || '',
          conditionNotes: product.conditionNotes || '',
          reorderLevel: product.reorderLevel !== undefined && product.reorderLevel !== null ? product.reorderLevel : '',
          minStock: product.minStock !== undefined && product.minStock !== null ? product.minStock : '',
          maxStock: product.maxStock !== undefined && product.maxStock !== null ? product.maxStock : '',
          status: product.status || 'Active'
        });
        const isStandard = STANDARD_UOMS.some(u => u.value === product.unit);
        setUseCustomUnit(!isStandard && Boolean(product.unit));
        setError('');
      } else {
        // Create mode: generate auto-code
        generateNextProductCode(companyId).then(nextCode => {
          setFormData({
            productCode: nextCode,
            sku: nextCode,
            name: '',
            category: 'General',
            categoryId: '',
            productType: 'Goods',
            description: '',
            brand: '',
            modelNumber: '',
            barcode: '',
            hsn: '',
            unit: 'NOS',
            customUnit: '',
            rate: '',
            purchaseRate: '',
            taxRate: 18,
            unitWeight: '',
            weightUnit: 'Kg',
            weightBasis: 'NET_PER_UNIT',
            packagingWeight: '',
            length: '',
            width: '',
            height: '',
            dimensionUnit: 'cm',
            volume: '',
            isReturnable: false,
            expectedReturnPeriod: '',
            conditionNotes: '',
            status: 'Active'
          });
          setUseCustomUnit(false);
          setError('');
        });
      }
    }
  }, [isOpen, product, companyId]);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    const updated = { ...formData, [field]: value };

    // Auto-sync productCode and sku if user edits code
    if (field === 'productCode' && (!formData.sku || formData.sku === formData.productCode)) {
      updated.sku = value;
    }

    if (field === 'productType' && value === 'Returnable item') {
      updated.isReturnable = true;
    }

    setFormData(updated);
    setError('');
  };

  const handleQuickAddCategory = async () => {
    if (!newCatInput.trim()) return;
    try {
      const saved = await saveCategory(companyId, { name: newCatInput.trim() });
      setCategories(prev => [...prev, saved]);
      setFormData(prev => ({ ...prev, category: saved.name, categoryId: saved.id }));
      setNewCatInput('');
      setShowNewCatInput(false);
    } catch (err) {
      setError(err.message || "Failed to create category");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Product Name is required.');
      return;
    }

    const selectedUnit = useCustomUnit 
      ? (formData.customUnit.trim().toUpperCase() || 'NOS') 
      : formData.unit;

    setLoading(true);
    try {
      if (!product?.id && companyId) {
        const existing = await getProducts(companyId);
        const dupName = existing.find(p => p.name && p.name.trim().toLowerCase() === formData.name.trim().toLowerCase());
        if (dupName) {
          setError(`A product named "${formData.name.trim()}" already exists (${dupName.productCode || dupName.sku}). Please use a unique name or edit the existing product.`);
          setLoading(false);
          return;
        }
      }

      const payload = {
        ...formData,
        name: formData.name.trim(),
        productCode: (formData.productCode || '').trim(),
        sku: (formData.sku || formData.productCode || '').trim(),
        unit: selectedUnit,
        rate: formData.rate !== '' ? parseFloat(formData.rate) : 0,
        purchaseRate: formData.purchaseRate !== '' ? parseFloat(formData.purchaseRate) : 0,
        taxRate: formData.taxRate !== '' ? parseFloat(formData.taxRate) : 0,
        unitWeight: formData.unitWeight !== '' ? parseFloat(formData.unitWeight) : null,
        weightUnit: formData.weightUnit || 'Kg',
        weightBasis: formData.weightBasis || 'NET_PER_UNIT',
        packagingWeight: formData.packagingWeight !== '' ? parseFloat(formData.packagingWeight) : null,
        length: formData.length !== '' ? parseFloat(formData.length) : null,
        width: formData.width !== '' ? parseFloat(formData.width) : null,
        height: formData.height !== '' ? parseFloat(formData.height) : null,
        volume: formData.volume !== '' ? parseFloat(formData.volume) : null,
        expectedReturnPeriod: formData.expectedReturnPeriod ? parseInt(formData.expectedReturnPeriod, 10) : null
      };

      if (product?.id) {
        payload.id = product.id;
      }

      await onSave(payload);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl my-6 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-400/10 rounded-lg text-amber-400 border border-amber-400/20">
              <Package size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {isEdit ? 'Edit Product / Item' : 'Add New Product / Item'}
              </h3>
              <p className="text-xs text-slate-400">
                {isEdit ? `Editing product ${product.productCode || product.name}` : 'Catalog item for delivery challan dispatch and item tracking'}
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

          {/* Section 1: Basic Information */}
          <div className="space-y-4">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-200">
              <Package size={14} className="text-amber-500" />
              <span>1. Basic Product Information</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Product Code
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Hash size={13} />
                  </span>
                  <input
                    type="text"
                    value={formData.productCode}
                    onChange={(e) => handleChange('productCode', e.target.value)}
                    placeholder="e.g. PRD-0001"
                    className="w-full pl-8 pr-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  SKU / Model Ref
                </label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => handleChange('sku', e.target.value)}
                  placeholder="e.g. CP-415-01"
                  className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Product Type
                </label>
                <select
                  value={formData.productType}
                  onChange={(e) => handleChange('productType', e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {PRODUCT_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Product / Item Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g. Automatic Power Factor Control Panel 150 KVAR"
                className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Category
                  </label>
                  {!showNewCatInput && (
                    <button
                      type="button"
                      onClick={() => setShowNewCatInput(true)}
                      className="text-[11px] font-bold text-amber-600 hover:text-amber-700 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={12} />
                      <span>New Category</span>
                    </button>
                  )}
                </div>

                {showNewCatInput ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCatInput}
                      onChange={(e) => setNewCatInput(e.target.value)}
                      placeholder="Category name..."
                      className="flex-1 px-3 py-1.5 text-xs border border-amber-400 rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={handleQuickAddCategory}
                      className="px-3 py-1.5 bg-amber-500 text-slate-950 font-bold text-xs rounded-lg cursor-pointer"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNewCatInput(false)}
                      className="px-2 py-1.5 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <select
                    value={formData.category}
                    onChange={(e) => {
                      const sel = categories.find(c => c.name === e.target.value);
                      setFormData(prev => ({ 
                        ...prev, 
                        category: e.target.value,
                        categoryId: sel?.id || '' 
                      }));
                    }}
                    className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {categories.map(c => (
                      <option key={c.id || c.name} value={c.name}>{c.name}</option>
                    ))}
                    {!categories.some(c => c.name === formData.category) && (
                      <option value={formData.category}>{formData.category}</option>
                    )}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  HSN / SAC Code
                </label>
                <input
                  type="text"
                  value={formData.hsn}
                  onChange={(e) => handleChange('hsn', e.target.value)}
                  placeholder="e.g. 8537"
                  className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Item Description
              </label>
              <textarea
                rows={2}
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Technical specifications, components included, rating, voltage..."
                className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Section 2: Unit of Measurement & Pricing */}
          <div className="space-y-4">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-200">
              <IndianRupee size={14} className="text-amber-500" />
              <span>2. Unit of Measurement & Valuation</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Unit of Measurement (UOM)
                  </label>
                  <button
                    type="button"
                    onClick={() => setUseCustomUnit(!useCustomUnit)}
                    className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    {useCustomUnit ? 'Standard List' : 'Custom Unit'}
                  </button>
                </div>

                {useCustomUnit ? (
                  <input
                    type="text"
                    value={formData.customUnit}
                    onChange={(e) => handleChange('customUnit', e.target.value.toUpperCase())}
                    placeholder="e.g. COIL, SPOOL"
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg uppercase font-mono"
                  />
                ) : (
                  <select
                    value={formData.unit}
                    onChange={(e) => handleChange('unit', e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg bg-white"
                  >
                    {STANDARD_UOMS.map(u => (
                      <option key={u.value} value={u.value}>{u.label}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Default Rate / Valuation (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.rate}
                  onChange={(e) => handleChange('rate', e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Leave 0 for non-commercial movements</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  GST Tax Rate (%)
                </label>
                <select
                  value={formData.taxRate}
                  onChange={(e) => handleChange('taxRate', e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg bg-white font-mono"
                >
                  {GST_RATES.map(r => (
                    <option key={r} value={r}>{r}% GST</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Brand / Make
                </label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => handleChange('brand', e.target.value)}
                  placeholder="e.g. Siemens / Schneider"
                  className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Model Number
                </label>
                <input
                  type="text"
                  value={formData.modelNumber}
                  onChange={(e) => handleChange('modelNumber', e.target.value)}
                  placeholder="e.g. 3VT1-250A"
                  className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Barcode / EAN
                </label>
                <input
                  type="text"
                  value={formData.barcode}
                  onChange={(e) => handleChange('barcode', e.target.value)}
                  placeholder="e.g. 8901234567890"
                  className="w-full px-3 py-2 text-xs font-mono font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Weight and Dimensions */}
          <div className="space-y-4">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-200">
              <Scale size={14} className="text-amber-500" />
              <span>3. Shipping Weight & Dimensions (Optional)</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Unit Weight
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={formData.unitWeight}
                  onChange={(e) => handleChange('unitWeight', e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 text-xs font-mono font-medium border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Weight Unit
                </label>
                <select
                  value={formData.weightUnit}
                  onChange={(e) => handleChange('weightUnit', e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
                >
                  {WEIGHT_UNITS.map(w => (
                    <option key={w.value} value={w.value}>{w.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Weight Basis
                </label>
                <select
                  value={formData.weightBasis}
                  onChange={(e) => handleChange('weightBasis', e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
                >
                  {WEIGHT_BASES.map(b => (
                    <option key={b.value} value={b.value}>{b.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Packaging Tare Weight
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={formData.packagingWeight}
                  onChange={(e) => handleChange('packagingWeight', e.target.value)}
                  placeholder="e.g. 0.05"
                  className="w-full px-3 py-2 text-xs font-mono font-medium border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Dimensions (L × W × H)
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="L"
                    value={formData.length}
                    onChange={(e) => handleChange('length', e.target.value)}
                    className="w-16 px-2 py-2 text-xs font-mono border border-slate-300 rounded-lg text-center"
                  />
                  <span className="text-slate-400">×</span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="W"
                    value={formData.width}
                    onChange={(e) => handleChange('width', e.target.value)}
                    className="w-16 px-2 py-2 text-xs font-mono border border-slate-300 rounded-lg text-center"
                  />
                  <span className="text-slate-400">×</span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="H"
                    value={formData.height}
                    onChange={(e) => handleChange('height', e.target.value)}
                    className="w-16 px-2 py-2 text-xs font-mono border border-slate-300 rounded-lg text-center"
                  />
                  <select
                    value={formData.dimensionUnit}
                    onChange={(e) => handleChange('dimensionUnit', e.target.value)}
                    className="px-2 py-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
                  >
                    {DIMENSION_UNITS.map(d => (
                      <option key={d.value} value={d.value}>{d.value}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Returnable Defaults & Status */}
          <div className="space-y-4">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-200">
              <RotateCcw size={14} className="text-amber-500" />
              <span>4. Returnable Policy & Status</span>
            </h4>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.isReturnable}
                  onChange={(e) => handleChange('isReturnable', e.target.checked)}
                  className="rounded border-slate-300 text-amber-500 focus:ring-amber-400 cursor-pointer w-4 h-4"
                />
                <span>Returnable Item by Default (Tools, Jigs, Test Kits, Demo Units)</span>
              </label>

              {formData.isReturnable && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200/80 animate-in fade-in duration-150">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Expected Return Period (Days)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={formData.expectedReturnPeriod}
                      onChange={(e) => handleChange('expectedReturnPeriod', e.target.value)}
                      placeholder="e.g. 14 or 30 days"
                      className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Product Condition Notes
                    </label>
                    <input
                      type="text"
                      value={formData.conditionNotes}
                      onChange={(e) => handleChange('conditionNotes', e.target.value)}
                      placeholder="e.g. Factory calibrated; return in original carry case"
                      className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Inventory & Reorder Thresholds */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Boxes size={14} className="text-amber-500" /> Inventory & Reorder Alerts
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Reorder Level ({formData.unit || 'NOS'})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={formData.reorderLevel}
                    onChange={(e) => handleChange('reorderLevel', e.target.value)}
                    placeholder="e.g. 10"
                    className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Min Stock Threshold
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={formData.minStock}
                    onChange={(e) => handleChange('minStock', e.target.value)}
                    placeholder="e.g. 5"
                    className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Max Stock Limit (Optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={formData.maxStock}
                    onChange={(e) => handleChange('maxStock', e.target.value)}
                    placeholder="e.g. 100"
                    className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Product Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Inactive items will not appear in new challan autocomplete</span>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 size={15} />
              <span>{loading ? 'Saving...' : (isEdit ? 'Save Changes' : 'Create Product')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
