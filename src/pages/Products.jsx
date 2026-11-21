import React, { useState, useEffect, useMemo } from 'react';
import { 
  Package, 
  Search, 
  Plus, 
  Filter, 
  FolderTree, 
  Upload, 
  Download, 
  Edit3, 
  Copy, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  ArrowUpDown, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight,
  RotateCcw,
  Tag,
  DollarSign,
  Scale
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  getProducts, 
  deleteProduct, 
  saveProduct, 
  updateProductStatus, 
  getCategories,
  deduplicateProducts
} from '../utils/tenantStorage';
import { exportProductsToCsv } from '../utils/csvUtils';
import { PRODUCT_TYPES, formatCurrency } from '../utils/indianBusiness';
import ProductModal from '../components/ProductModal';
import CategoryModal from '../components/CategoryModal';
import CsvImportModal from '../components/CsvImportModal';

export default function Products() {
  const { currentCompany, isStaff, isAdmin } = useAuth();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [returnableOnly, setReturnableOnly] = useState(false);

  // Sorting & Pagination
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Notifications & Confirmations
  const [notification, setNotification] = useState(null);
  const [deleteConfirmProduct, setDeleteConfirmProduct] = useState(null);
  const [deleteBlockedProduct, setDeleteBlockedProduct] = useState(null);

  useEffect(() => {
    loadData();
  }, [currentCompany]);

  const loadData = async () => {
    if (!currentCompany?.id) return;
    setLoading(true);
    try {
      const { mergedCount } = await deduplicateProducts(currentCompany.id);
      if (mergedCount > 0) {
        showNotification(`Cleaned up and merged ${mergedCount} duplicate product record(s).`);
      }
      const pList = await getProducts(currentCompany.id);
      const cList = await getCategories(currentCompany.id);
      setProducts(pList);
      setCategories(cList);
    } catch (err) {
      console.error('Error loading products:', err);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Filtered and Sorted products
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (prod.name || '').toLowerCase().includes(q);
        const matchCode = (prod.productCode || prod.sku || '').toLowerCase().includes(q);
        const matchHsn = (prod.hsnSac || prod.hsn || '').toLowerCase().includes(q);
        const matchBarcode = (prod.barcode || '').toLowerCase().includes(q);
        const matchDesc = (prod.description || '').toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchHsn && !matchBarcode && !matchDesc) {
          return false;
        }
      }

      // Status
      if (statusFilter !== 'ALL') {
        const prodStatus = prod.status || 'ACTIVE';
        if (prodStatus !== statusFilter) return false;
      }

      // Category
      if (selectedCategory && prod.category !== selectedCategory) {
        return false;
      }

      // Product Type
      if (selectedType && prod.productType !== selectedType) {
        return false;
      }

      // Returnable
      if (returnableOnly && !prod.isReturnable) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      let fieldA = a[sortBy] || '';
      let fieldB = b[sortBy] || '';

      if (typeof fieldA === 'string') fieldA = fieldA.toLowerCase();
      if (typeof fieldB === 'string') fieldB = fieldB.toLowerCase();

      if (fieldA < fieldB) return sortOrder === 'asc' ? -1 : 1;
      if (fieldA > fieldB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [products, searchQuery, statusFilter, selectedCategory, selectedType, returnableOnly, sortBy, sortOrder]);

  // Pagination calculation
  const totalItems = filteredProducts.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setIsProductModalOpen(true);
  };

  const handleOpenEdit = (prod) => {
    setEditingProduct(prod);
    setIsProductModalOpen(true);
  };

  const handleDuplicate = (prod) => {
    const duplicateData = {
      ...prod,
      id: undefined,
      productCode: '', // Trigger auto generation
      name: `${prod.name} (Copy)`,
      status: 'ACTIVE'
    };
    setEditingProduct(duplicateData);
    setIsProductModalOpen(true);
  };

  const handleToggleStatus = async (prod) => {
    if (!isStaff) return;
    const newStatus = prod.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const updated = await updateProductStatus(currentCompany.id, prod.id, newStatus);
    if (updated) {
      setProducts(prev => prev.map(p => p.id === prod.id ? updated : p));
      showNotification(`Product marked as ${newStatus}`);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmProduct || !isAdmin) return;
    const target = deleteConfirmProduct;
    const res = await deleteProduct(currentCompany.id, target.id);
    setDeleteConfirmProduct(null);
    if (res.success) {
      setProducts(prev => prev.filter(p => p.id !== target.id));
      showNotification('Product deleted successfully');
    } else {
      setDeleteBlockedProduct({
        product: target,
        message: res.message
      });
    }
  };

  const handleDeactivateFromBlocked = async () => {
    if (!deleteBlockedProduct?.product) return;
    const prod = deleteBlockedProduct.product;
    const updated = await updateProductStatus(currentCompany.id, prod.id, 'INACTIVE');
    if (updated) {
      setProducts(prev => prev.map(p => p.id === prod.id ? updated : p));
      showNotification(`Product "${prod.name}" marked as Inactive`);
    }
    setDeleteBlockedProduct(null);
  };

  const handleExportCsv = () => {
    try {
      exportProductsToCsv(products, currentCompany?.legalName || 'nayaruvi');
      showNotification(`Exported ${products.length} products to CSV`);
    } catch (err) {
      console.error('Export error:', err);
      showNotification('Failed to export CSV', 'error');
    }
  };

  // Stats
  const activeCount = products.filter(p => (p.status || 'ACTIVE') === 'ACTIVE').length;
  const returnableCount = products.filter(p => p.isReturnable).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className={`p-4 rounded-xl flex items-center gap-2 text-sm font-medium ${
          notification.type === 'error'
            ? 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
            : 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
        }`}>
          {notification.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{notification.msg}</span>
        </div>
      )}

      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Package className="text-amber-500" size={24} />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Product & Goods Catalog</h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage your items, HSN/SAC codes, standard UOMs, returnable items, and categories
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsCategoryModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <FolderTree size={14} /> Categories
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={products.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
            title="Export products to CSV"
          >
            <Download size={14} /> Export CSV
          </button>

          {isStaff && (
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Import products from CSV"
            >
              <Upload size={14} /> Import CSV
            </button>
          )}

          {isStaff && (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold shadow-md shadow-amber-500/20 transition-all"
            >
              <Plus size={16} /> Add Product
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-sm">
          <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Products</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{products.length}</div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-sm">
          <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Active Catalog</div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{activeCount}</div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-sm">
          <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Categories</div>
          <div className="text-2xl font-black text-amber-500 mt-1">{categories.length}</div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-sm">
          <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Returnable Items</div>
          <div className="text-2xl font-black text-blue-500 mt-1">{returnableCount}</div>
        </div>
      </div>

      {/* Search and Filters Toolbar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Bar */}
          <div className="md:col-span-5 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Search by name, code/SKU, HSN, barcode..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800 dark:text-slate-200"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
              >
                Clear
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="md:col-span-2.5">
            <select
              value={selectedCategory}
              onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
              className="w-full px-2.5 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800 dark:text-slate-200"
            >
              <option value="">All Categories</option>
              {categories.map(c => (
                <option key={c.id || c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Product Type Filter */}
          <div className="md:col-span-2.5">
            <select
              value={selectedType}
              onChange={(e) => { setSelectedType(e.target.value); setCurrentPage(1); }}
              className="w-full px-2.5 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800 dark:text-slate-200"
            >
              <option value="">All Types</option>
              {PRODUCT_TYPES.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="md:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="w-full px-2.5 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800 dark:text-slate-200"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>
          </div>
        </div>

        {/* Quick Badges Filter Bar */}
        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-700/60">
          <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-300 hover:text-amber-500">
            <input
              type="checkbox"
              checked={returnableOnly}
              onChange={(e) => { setReturnableOnly(e.target.checked); setCurrentPage(1); }}
              className="rounded text-amber-500 focus:ring-amber-500 h-3.5 w-3.5"
            />
            <span className="font-medium">Show Returnable Goods Only</span>
          </label>

          <div className="text-slate-500 dark:text-slate-400">
            Showing <span className="font-bold text-slate-800 dark:text-white">{filteredProducts.length}</span> of {products.length} products
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto mb-2"></div>
            <p className="text-xs text-slate-400">Loading products catalog...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="mx-auto text-slate-300 dark:text-slate-600 mb-3" size={44} />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Products Found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4 max-w-sm mx-auto">
              {products.length === 0
                ? 'Your catalog is empty. Add your first product or import a CSV catalog to get started.'
                : 'No products match your current search and filter criteria.'}
            </p>
            {isStaff && products.length === 0 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenAdd}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs shadow-md transition-all"
                >
                  <Plus size={15} /> Add First Product
                </button>
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  <Upload size={14} /> Import CSV
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/50 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none">
                  <th 
                    className="py-3 px-4 cursor-pointer hover:text-slate-800 dark:hover:text-white"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Product Details</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th 
                    className="py-3 px-4 cursor-pointer hover:text-slate-800 dark:hover:text-white"
                    onClick={() => handleSort('productCode')}
                  >
                    <div className="flex items-center gap-1">
                      <span>SKU / Code</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="py-3 px-4">HSN / SAC</th>
                  <th 
                    className="py-3 px-4 cursor-pointer hover:text-slate-800 dark:hover:text-white"
                    onClick={() => handleSort('category')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Category</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="py-3 px-4">UOM</th>
                  <th className="py-3 px-4">Standard Rate</th>
                  <th className="py-3 px-4">Tax / GST</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-xs">
                {paginatedProducts.map((prod) => {
                  const rate = parseFloat(prod.unitPrice || prod.standardRate || 0);
                  const isReturnable = prod.isReturnable;

                  return (
                    <tr key={prod.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{prod.name}</span>
                          {isReturnable && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300" title="Returnable Good">
                              <RotateCcw size={10} /> Ret
                            </span>
                          )}
                        </div>
                        {prod.description && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs" title={prod.description}>
                            {prod.description}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                        {prod.productCode || prod.sku || '—'}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                        {prod.hsnSac || prod.hsn || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {prod.category || 'General'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300 uppercase">
                        {prod.unitOfMeasurement || prod.uom || 'NOS'}
                      </td>
                      <td className="py-3 px-4 text-slate-800 dark:text-slate-200 font-semibold">
                        {rate > 0 ? formatCurrency(rate) : <span className="text-slate-400 text-[11px]">₹0.00 / Free</span>}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {prod.taxRate !== undefined && prod.taxRate !== '' ? `${prod.taxRate}%` : '0%'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          (prod.status || 'ACTIVE') === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                        }`}>
                          {prod.status || 'ACTIVE'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isStaff && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(prod)}
                                className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                                title="Edit Product"
                              >
                                <Edit3 size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDuplicate(prod)}
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                                title="Duplicate Product"
                              >
                                <Copy size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(prod)}
                                className="p-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors text-xs font-semibold"
                                title={prod.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                              >
                                <RotateCcw size={14} />
                              </button>
                            </>
                          )}
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmProduct(prod)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded transition-colors"
                              title="Delete Product"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {filteredProducts.length > 0 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <span>Show</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span>per page • Total {totalItems} items</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="mr-1">Page {currentPage} of {totalPages}</span>
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="p-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Previous page"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Product Add / Edit Modal */}
      {isProductModalOpen && (
        <ProductModal
          isOpen={isProductModalOpen}
          onClose={() => setIsProductModalOpen(false)}
          product={editingProduct}
          onSave={async (prodData) => {
            await saveProduct(currentCompany.id, prodData);
            await loadData();
            setIsProductModalOpen(false);
            showNotification(editingProduct?.id ? 'Product updated successfully' : 'Product created successfully');
          }}
        />
      )}

      {/* Category Manager Modal */}
      {isCategoryModalOpen && (
        <CategoryModal
          isOpen={isCategoryModalOpen}
          onClose={() => {
            setIsCategoryModalOpen(false);
            loadData();
          }}
        />
      )}

      {/* CSV Import Modal */}
      {isImportModalOpen && (
        <CsvImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          type="products"
          onSuccess={(count) => {
            loadData();
            setIsImportModalOpen(false);
            showNotification(`Successfully imported ${count} products`);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <AlertCircle size={24} />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Product</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to delete <span className="font-bold text-slate-900 dark:text-white">"{deleteConfirmProduct.name}"</span>?
              If this product is referenced in any delivery challan, deletion will be blocked to protect document history.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmProduct(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deletion Blocked Notice Modal */}
      {deleteBlockedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center gap-3 text-amber-500">
              <AlertCircle size={24} />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Cannot Delete Product</h3>
            </div>
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                {deleteBlockedProduct.message}
              </p>
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-lg text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                <span className="font-bold block mb-1">Why is deletion blocked?</span>
                Under CGST statutory audit rules, line items in historical delivery challans must retain their product identity.
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Deactivate this product instead so it is hidden when creating new delivery challans, while all past challans stay intact.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
              <button
                type="button"
                onClick={() => setDeleteBlockedProduct(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleDeactivateFromBlocked}
                className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-600 rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                Deactivate Product Instead
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
