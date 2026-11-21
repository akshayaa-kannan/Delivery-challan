import React, { useState, useEffect } from 'react';
import { 
  X, 
  Building2, 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  Hash,
  Globe
} from 'lucide-react';
import { 
  INDIAN_STATES, 
  CUSTOMER_TYPES, 
  getStateCodeFromGstin, 
  validateGstin 
} from '../utils/indianBusiness.js';
import { generateNextCustomerCode, getCustomers } from '../utils/tenantStorage.js';

export default function CustomerModal({ 
  isOpen, 
  onClose, 
  onSave, 
  customer = null, 
  companyId 
}) {
  const isEdit = Boolean(customer?.id);

  const [formData, setFormData] = useState({
    customerCode: '',
    name: '',
    companyName: '',
    customerType: 'Business',
    contactPerson: '',
    phone: '',
    alternatePhone: '',
    email: '',
    website: '',
    gstin: '',
    pan: '',
    businessRegistration: '',
    billingAddress: '',
    billingLine1: '',
    billingLine2: '',
    billingCity: '',
    billingDistrict: '',
    billingState: '',
    billingPinCode: '',
    billingCountry: 'India',
    deliveryAddress: '',
    deliveryLine1: '',
    deliveryLine2: '',
    deliveryCity: '',
    deliveryDistrict: '',
    deliveryState: '',
    deliveryPinCode: '',
    deliveryCountry: 'India',
    sameAsBilling: true,
    paymentTerms: '',
    notes: '',
    status: 'Active'
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (customer) {
        // Edit mode
        setFormData({
          customerCode: customer.customerCode || '',
          name: customer.name || '',
          companyName: customer.companyName || '',
          customerType: customer.customerType || 'Business',
          contactPerson: customer.contactPerson || '',
          phone: customer.phone || '',
          alternatePhone: customer.alternatePhone || '',
          email: customer.email || '',
          website: customer.website || '',
          gstin: customer.gstin || '',
          pan: customer.pan || '',
          businessRegistration: customer.businessRegistration || '',
          billingAddress: customer.billingAddress || '',
          billingLine1: customer.billingLine1 || '',
          billingLine2: customer.billingLine2 || '',
          billingCity: customer.billingCity || '',
          billingDistrict: customer.billingDistrict || '',
          billingState: customer.billingState || customer.state || '',
          billingPinCode: customer.billingPinCode || '',
          billingCountry: customer.billingCountry || 'India',
          deliveryAddress: customer.deliveryAddress || '',
          deliveryLine1: customer.deliveryLine1 || '',
          deliveryLine2: customer.deliveryLine2 || '',
          deliveryCity: customer.deliveryCity || '',
          deliveryDistrict: customer.deliveryDistrict || '',
          deliveryState: customer.deliveryState || '',
          deliveryPinCode: customer.deliveryPinCode || '',
          deliveryCountry: customer.deliveryCountry || 'India',
          sameAsBilling: customer.sameAsBilling !== false,
          paymentTerms: customer.paymentTerms || '',
          notes: customer.notes || '',
          status: customer.status || 'Active'
        });
        setError('');
      } else {
        // Create mode: generate auto-code
        generateNextCustomerCode(companyId).then(nextCode => {
          setFormData({
            customerCode: nextCode,
            name: '',
            companyName: '',
            customerType: 'Business',
            contactPerson: '',
            phone: '',
            alternatePhone: '',
            email: '',
            website: '',
            gstin: '',
            pan: '',
            businessRegistration: '',
            billingAddress: '',
            billingLine1: '',
            billingLine2: '',
            billingCity: '',
            billingDistrict: '',
            billingState: '',
            billingPinCode: '',
            billingCountry: 'India',
            deliveryAddress: '',
            deliveryLine1: '',
            deliveryLine2: '',
            deliveryCity: '',
            deliveryDistrict: '',
            deliveryState: '',
            deliveryPinCode: '',
            deliveryCountry: 'India',
            sameAsBilling: true,
            paymentTerms: '',
            notes: '',
            status: 'Active'
          });
          setError('');
        });
      }
    }
  }, [isOpen, customer, companyId]);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    const updated = { ...formData, [field]: value };

    // Auto-detect State & State Code if GSTIN is entered
    if (field === 'gstin') {
      const upper = value.toUpperCase();
      updated.gstin = upper;
      const detectedCode = getStateCodeFromGstin(upper);
      if (detectedCode) {
        const foundState = INDIAN_STATES.find(s => s.code === detectedCode);
        if (foundState) {
          if (!updated.billingState) updated.billingState = foundState.name;
          if (updated.sameAsBilling && !updated.deliveryState) updated.deliveryState = foundState.name;
        }
      }
      // Auto-extract PAN from GSTIN (chars 3 to 12)
      if (upper.length >= 12 && !updated.pan) {
        updated.pan = upper.slice(2, 12);
      }
    }

    if (field === 'pan') {
      updated.pan = value.toUpperCase();
    }

    // Auto-sync delivery address when sameAsBilling is checked
    if (formData.sameAsBilling) {
      if (field === 'billingLine1') updated.deliveryLine1 = value;
      if (field === 'billingLine2') updated.deliveryLine2 = value;
      if (field === 'billingCity') updated.deliveryCity = value;
      if (field === 'billingDistrict') updated.deliveryDistrict = value;
      if (field === 'billingState') updated.deliveryState = value;
      if (field === 'billingPinCode') updated.deliveryPinCode = value;
      if (field === 'billingCountry') updated.deliveryCountry = value;
      if (field === 'billingAddress') updated.deliveryAddress = value;
    }

    if (field === 'sameAsBilling' && value === true) {
      updated.deliveryLine1 = updated.billingLine1;
      updated.deliveryLine2 = updated.billingLine2;
      updated.deliveryCity = updated.billingCity;
      updated.deliveryDistrict = updated.billingDistrict;
      updated.deliveryState = updated.billingState;
      updated.deliveryPinCode = updated.billingPinCode;
      updated.deliveryCountry = updated.billingCountry;
      updated.deliveryAddress = updated.billingAddress;
    }

    setFormData(updated);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Customer Name is required.');
      return;
    }

    if (formData.gstin) {
      const gstinVal = validateGstin(formData.gstin);
      if (!gstinVal.isValid) {
        setError(gstinVal.message);
        return;
      }
    }

    setLoading(true);
    try {
      if (!customer?.id && companyId) {
        const existing = await getCustomers(companyId);
        const dupName = existing.find(c => c.name && c.name.trim().toLowerCase() === formData.name.trim().toLowerCase());
        if (dupName) {
          setError(`A customer named "${formData.name.trim()}" already exists (${dupName.customerCode}). Please use a unique name or edit the existing record.`);
          setLoading(false);
          return;
        }
        if (formData.gstin) {
          const cleanG = formData.gstin.trim().toUpperCase();
          const dupGstin = existing.find(c => c.gstin && c.gstin.trim().toUpperCase() === cleanG);
          if (dupGstin) {
            setError(`A customer with GSTIN "${cleanG}" already exists (${dupGstin.name} - ${dupGstin.customerCode}).`);
            setLoading(false);
            return;
          }
        }
      }

      const payload = {
        ...formData,
        name: formData.name.trim(),
        customerCode: (formData.customerCode || '').trim()
      };
      if (customer?.id) {
        payload.id = customer.id;
      }
      await onSave(payload);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save customer');
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
              <Building2 size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {isEdit ? 'Edit Customer' : 'Add New Customer'}
              </h3>
              <p className="text-xs text-slate-400">
                {isEdit ? `Editing customer ${customer.customerCode || customer.name}` : 'Register a consignee for delivery challan dispatches'}
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
              <User size={14} className="text-amber-500" />
              <span>1. Basic Customer Information</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Customer Code
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Hash size={13} />
                  </span>
                  <input
                    type="text"
                    value={formData.customerCode}
                    onChange={(e) => handleChange('customerCode', e.target.value)}
                    placeholder="e.g. CUS-0001"
                    className="w-full pl-8 pr-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Customer / Business Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="e.g. Larsen & Toubro Limited"
                  className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Company / Firm Trade Name
                </label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => handleChange('companyName', e.target.value)}
                  placeholder="e.g. L&T Heavy Engineering Division"
                  className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Customer Type
                </label>
                <select
                  value={formData.customerType}
                  onChange={(e) => handleChange('customerType', e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {CUSTOMER_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Contact Person
                </label>
                <input
                  type="text"
                  value={formData.contactPerson}
                  onChange={(e) => handleChange('contactPerson', e.target.value)}
                  placeholder="e.g. Mr. R. Sharma"
                  className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Phone / Mobile
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone size={13} />
                  </span>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full pl-8 pr-3 py-2 text-xs font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail size={13} />
                  </span>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="billing@customer.com"
                    className="w-full pl-8 pr-3 py-2 text-xs font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Business & Tax Information */}
          <div className="space-y-4">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-200">
              <FileText size={14} className="text-amber-500" />
              <span>2. Business & Tax Details (Optional)</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  GSTIN
                </label>
                <input
                  type="text"
                  maxLength={15}
                  value={formData.gstin}
                  onChange={(e) => handleChange('gstin', e.target.value)}
                  placeholder="e.g. 27AAACL1234H1Z1"
                  className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">15-char Indian GST number</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  PAN Number
                </label>
                <input
                  type="text"
                  maxLength={10}
                  value={formData.pan}
                  onChange={(e) => handleChange('pan', e.target.value)}
                  placeholder="e.g. AAACL1234H"
                  className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Website URL
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Globe size={13} />
                  </span>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => handleChange('website', e.target.value)}
                    placeholder="https://..."
                    className="w-full pl-8 pr-3 py-2 text-xs font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Billing Address */}
          <div className="space-y-4">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-200">
              <MapPin size={14} className="text-amber-500" />
              <span>3. Billing Address</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Address Line 1
                </label>
                <input
                  type="text"
                  value={formData.billingLine1}
                  onChange={(e) => handleChange('billingLine1', e.target.value)}
                  placeholder="Premises / Building / Street"
                  className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Address Line 2
                </label>
                <input
                  type="text"
                  value={formData.billingLine2}
                  onChange={(e) => handleChange('billingLine2', e.target.value)}
                  placeholder="Locality / Landmark"
                  className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={formData.billingCity}
                  onChange={(e) => handleChange('billingCity', e.target.value)}
                  placeholder="e.g. Mumbai"
                  className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  District
                </label>
                <input
                  type="text"
                  value={formData.billingDistrict}
                  onChange={(e) => handleChange('billingDistrict', e.target.value)}
                  placeholder="e.g. Mumbai Suburban"
                  className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  State
                </label>
                <select
                  value={formData.billingState}
                  onChange={(e) => handleChange('billingState', e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Select State</option>
                  {INDIAN_STATES.map(s => (
                    <option key={s.code} value={s.name}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  PIN Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={formData.billingPinCode}
                  onChange={(e) => handleChange('billingPinCode', e.target.value)}
                  placeholder="400072"
                  className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Delivery / Shipping Address */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-200 gap-2">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin size={14} className="text-emerald-500" />
                <span>4. Delivery / Shipping Site Address</span>
              </h4>

              <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.sameAsBilling}
                  onChange={(e) => handleChange('sameAsBilling', e.target.checked)}
                  className="rounded border-slate-300 text-amber-500 focus:ring-amber-400 cursor-pointer w-4 h-4"
                />
                <span>Same as Billing Address</span>
              </label>
            </div>

            {!formData.sameAsBilling && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Delivery Line 1
                    </label>
                    <input
                      type="text"
                      value={formData.deliveryLine1}
                      onChange={(e) => handleChange('deliveryLine1', e.target.value)}
                      placeholder="Delivery site / Plant / Gate No."
                      className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Delivery Line 2
                    </label>
                    <input
                      type="text"
                      value={formData.deliveryLine2}
                      onChange={(e) => handleChange('deliveryLine2', e.target.value)}
                      placeholder="Warehouse / Industrial Area"
                      className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={formData.deliveryCity}
                      onChange={(e) => handleChange('deliveryCity', e.target.value)}
                      placeholder="e.g. Hosur"
                      className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      District
                    </label>
                    <input
                      type="text"
                      value={formData.deliveryDistrict}
                      onChange={(e) => handleChange('deliveryDistrict', e.target.value)}
                      placeholder="e.g. Krishnagiri"
                      className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      State
                    </label>
                    <select
                      value={formData.deliveryState}
                      onChange={(e) => handleChange('deliveryState', e.target.value)}
                      className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">Select State</option>
                      {INDIAN_STATES.map(s => (
                        <option key={s.code} value={s.name}>{s.name} ({s.code})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      PIN Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={formData.deliveryPinCode}
                      onChange={(e) => handleChange('deliveryPinCode', e.target.value)}
                      placeholder="635109"
                      className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 5: Additional Info & Status */}
          <div className="space-y-4">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-200">
              <FileText size={14} className="text-amber-500" />
              <span>5. Terms & Customer Notes</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Payment / Delivery Terms
                </label>
                <input
                  type="text"
                  value={formData.paymentTerms}
                  onChange={(e) => handleChange('paymentTerms', e.target.value)}
                  placeholder="e.g. Net 30 Days / Immediate on delivery"
                  className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Internal Remarks / Delivery Instructions
              </label>
              <textarea
                rows={2}
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Specific unloading instructions, contact persons, or gate pass requirements..."
                className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Form Actions Footer */}
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
              <span>{loading ? 'Saving...' : (isEdit ? 'Save Changes' : 'Create Customer')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
