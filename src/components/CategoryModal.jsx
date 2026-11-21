import React, { useState, useEffect } from 'react';
import { 
  X, 
  Tag, 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  AlertCircle,
  Package
} from 'lucide-react';
import { 
  getCategories, 
  saveCategory, 
  deleteCategory, 
  getProducts 
} from '../utils/tenantStorage.js';

export default function CategoryModal({ 
  isOpen, 
  onClose, 
  companyId, 
  onCategoriesChanged 
}) {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Add / Edit state
  const [editingId, setEditingId] = useState(null);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');

  const loadData = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const [cats, prods] = await Promise.all([
        getCategories(companyId),
        getProducts(companyId)
      ]);
      setCategories(cats);
      setProducts(prods);
    } catch (err) {
      console.error(err);
      setError("Failed to load categories.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
      setError('');
      setSuccess('');
      setEditingId(null);
      setCatName('');
      setCatDesc('');
    }
  }, [isOpen, companyId]);

  if (!isOpen) return null;

  const getProductCountForCategory = (cat) => {
    const cName = (cat.name || '').toLowerCase();
    return products.filter(
      p => p.categoryId === cat.id || (p.category || '').toLowerCase() === cName
    ).length;
  };

  const handleStartEdit = (cat) => {
    setEditingId(cat.id);
    setCatName(cat.name);
    setCatDesc(cat.description || '');
    setError('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setCatName('');
    setCatDesc('');
    setError('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!catName.trim()) {
      setError("Category name is required.");
      return;
    }

    try {
      await saveCategory(companyId, {
        id: editingId || undefined,
        name: catName.trim(),
        description: catDesc.trim()
      });

      setSuccess(editingId ? "Category updated." : "Category created.");
      setTimeout(() => setSuccess(''), 3000);
      handleCancelEdit();
      await loadData();
      if (onCategoriesChanged) onCategoriesChanged();
    } catch (err) {
      setError(err.message || "Failed to save category.");
    }
  };

  const handleDelete = async (cat) => {
    const count = getProductCountForCategory(cat);
    if (count > 0) {
      setError(`Cannot delete "${cat.name}": Assigned to ${count} product(s). Please reassign those products first.`);
      return;
    }

    if (!confirm(`Are you sure you want to delete category "${cat.name}"?`)) return;

    try {
      const res = await deleteCategory(companyId, cat.id);
      if (!res.success) {
        setError(res.message);
        return;
      }
      setSuccess(`Category "${cat.name}" deleted.`);
      setTimeout(() => setSuccess(''), 3000);
      await loadData();
      if (onCategoriesChanged) onCategoriesChanged();
    } catch (err) {
      setError(err.message || "Failed to delete category.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl my-6 flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-400/10 rounded-lg text-amber-400 border border-amber-400/20">
              <Tag size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Manage Product Categories</h3>
              <p className="text-xs text-slate-400">Organize catalog items into commercial classifications</p>
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-semibold flex items-center gap-2">
              <Check size={16} className="shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Add / Edit Form */}
          <form onSubmit={handleSave} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              {editingId ? 'Edit Category' : 'Create New Category'}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Category Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="e.g. Transformers & Switchgear"
                  className="w-full px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  placeholder="e.g. High voltage components"
                  className="w-full px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <Plus size={14} />
                <span>{editingId ? 'Update Category' : 'Add Category'}</span>
              </button>
            </div>
          </form>

          {/* Categories List Table */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-bold text-slate-500 px-1">
              <span>EXISTING CATEGORIES ({categories.length})</span>
              <span>ASSIGNED PRODUCTS</span>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
              {categories.map(cat => {
                const count = getProductCountForCategory(cat);
                return (
                  <div key={cat.id} className="flex items-center justify-between p-3 hover:bg-slate-50 transition-colors">
                    <div className="min-w-0 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">{cat.name}</span>
                        {cat.isDefault && (
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                            Standard
                          </span>
                        )}
                      </div>
                      {cat.description && (
                        <p className="text-[10px] text-slate-500 truncate">{cat.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                        <Package size={11} />
                        {count} item{count === 1 ? '' : 's'}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(cat)}
                          className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors cursor-pointer"
                          title="Edit category"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(cat)}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                          title="Delete category"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
