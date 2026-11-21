import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Building2, 
  Phone, 
  Mail, 
  Globe, 
  MapPin, 
  Edit3, 
  PlusCircle, 
  FileText, 
  Eye, 
  Calendar, 
  Truck, 
  CheckCircle2, 
  AlertCircle, 
  Receipt,
  UserCheck,
  Download
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getCustomerById, getCustomerChallans, updateCustomerStatus, saveCustomer } from '../utils/tenantStorage';
import CustomerModal from '../components/CustomerModal';
import { formatCurrency, formatDate } from '../utils/indianBusiness';

export default function CustomerDetails({ triggerDirectPrint, triggerPdfDownload }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentCompany, isStaff } = useAuth();

  const [customer, setCustomer] = useState(null);
  const [challans, setChallans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    loadCustomerData();
  }, [id, currentCompany]);

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadCustomerData = async () => {
    if (!currentCompany?.id || !id) return;
    setLoading(true);
    try {
      const cust = await getCustomerById(currentCompany.id, id);
      if (!cust) {
        setCustomer(null);
        setLoading(false);
        return;
      }
      setCustomer(cust);
      const custChallans = await getCustomerChallans(currentCompany.id, cust.id, cust.name);
      setChallans(custChallans);
    } catch (err) {
      console.error('Error loading customer details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!isStaff) return;
    const newStatus = customer.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const updated = await updateCustomerStatus(currentCompany.id, customer.id, newStatus);
    if (updated) {
      setCustomer(updated);
      showNotification(`Customer marked as ${newStatus}`);
    }
  };

  const handleCreateChallan = () => {
    // Navigate to new challan with pre-selected customer state
    navigate('/new', { state: { preselectedCustomer: customer } });
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center">
        <AlertCircle className="mx-auto text-amber-500 mb-3" size={48} />
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Customer Not Found</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-6">
          The requested customer could not be found or may have been deleted.
        </p>
        <Link 
          to="/customers" 
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-semibold hover:bg-slate-700"
        >
          <ArrowLeft size={16} /> Back to Customers
        </Link>
      </div>
    );
  }

  const billing = customer.billingAddress || {};
  const delivery = customer.deliveryAddress || {};

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
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

      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link 
            to="/customers"
            className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title="Back to Customers"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{customer.name}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                customer.status === 'ACTIVE'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
              }`}>
                {customer.status}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                {customer.customerType || 'BUSINESS'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Code: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{customer.customerCode || 'N/A'}</span>
              {customer.companyName && ` • Company: ${customer.companyName}`}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {isStaff && (
            <>
              <button
                type="button"
                onClick={handleToggleStatus}
                className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {customer.status === 'ACTIVE' ? 'Deactivate Customer' : 'Activate Customer'}
              </button>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Edit3 size={15} /> Edit Customer
              </button>
            </>
          )}

          <button
            type="button"
            onClick={handleCreateChallan}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold shadow-md shadow-amber-500/20 transition-colors"
          >
            <PlusCircle size={15} /> Create Challan
          </button>
        </div>
      </div>

      {/* Overview Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Contact Info Card */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm border-b border-slate-100 dark:border-slate-700/60 pb-2.5">
            <UserCheck size={16} className="text-amber-500" />
            <span>Contact Information</span>
          </div>
          <div className="space-y-2.5 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Contact Person</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">{customer.contactPerson || '—'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Mobile Number</span>
              <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200">
                <Phone size={13} className="text-slate-400" />
                <span>{customer.phone || '—'}</span>
              </div>
            </div>
            {customer.altPhone && (
              <div>
                <span className="text-slate-400 block text-[11px]">Alternate Phone</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">{customer.altPhone}</span>
              </div>
            )}
            <div>
              <span className="text-slate-400 block text-[11px]">Email Address</span>
              <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200">
                <Mail size={13} className="text-slate-400" />
                <span>{customer.email || '—'}</span>
              </div>
            </div>
            {customer.website && (
              <div>
                <span className="text-slate-400 block text-[11px]">Website</span>
                <div className="flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-400">
                  <Globe size={13} />
                  <a href={customer.website.startsWith('http') ? customer.website : `https://${customer.website}`} target="_blank" rel="noreferrer" className="underline truncate">
                    {customer.website}
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tax & Business Profile Card */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm border-b border-slate-100 dark:border-slate-700/60 pb-2.5">
            <Receipt size={16} className="text-amber-500" />
            <span>Tax & Business Identifiers</span>
          </div>
          <div className="space-y-2.5 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">GSTIN</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-sm">
                {customer.gstin || 'Not Registered / Unregistered'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">PAN</span>
              <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">
                {customer.pan || (customer.gstin && customer.gstin.length >= 12 ? customer.gstin.substring(2, 12) : '—')}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">State / State Code</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {customer.state ? `${customer.state}${customer.stateCode ? ` (${customer.stateCode})` : ''}` : '—'}
              </span>
            </div>
            {customer.businessRegDetails && (
              <div>
                <span className="text-slate-400 block text-[11px]">Business Registration</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">{customer.businessRegDetails}</span>
              </div>
            )}
            {customer.notes && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                <span className="text-slate-400 block text-[11px]">Internal Notes</span>
                <p className="text-slate-600 dark:text-slate-300 italic">{customer.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Addresses Summary Card */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm border-b border-slate-100 dark:border-slate-700/60 pb-2.5">
            <MapPin size={16} className="text-amber-500" />
            <span>Addresses</span>
          </div>
          <div className="grid grid-cols-1 gap-3 text-xs">
            <div className="p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">Billing Address</span>
              <p className="text-slate-700 dark:text-slate-200 leading-relaxed">
                {billing.address1 || customer.address || 'No billing address provided'}
                {billing.address2 && <><br />{billing.address2}</>}
                {(billing.city || billing.district || billing.state || billing.pincode) && (
                  <><br />{[billing.city, billing.district, billing.state, billing.pincode].filter(Boolean).join(', ')}</>
                )}
              </p>
            </div>
            <div className="p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">Delivery Address</span>
              <p className="text-slate-700 dark:text-slate-200 leading-relaxed">
                {delivery.address1 || customer.deliveryAddressText || billing.address1 || 'Same as billing address'}
                {delivery.address2 && <><br />{delivery.address2}</>}
                {(delivery.city || delivery.district || delivery.state || delivery.pincode) && (
                  <><br />{[delivery.city, delivery.district, delivery.state, delivery.pincode].filter(Boolean).join(', ')}</>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Delivery Challans History Section */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <FileText className="text-amber-500" size={20} />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Delivery Challan History</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {challans.length} {challans.length === 1 ? 'challan' : 'challans'} generated for this customer
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCreateChallan}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold transition-colors shadow-sm"
          >
            <PlusCircle size={14} /> New Challan for Customer
          </button>
        </div>

        {challans.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="mx-auto text-slate-300 dark:text-slate-600 mb-3" size={40} />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Delivery Challans Yet</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4 max-w-sm mx-auto">
              No delivery challans have been created for {customer.name} yet. Create the first challan now.
            </p>
            <button
              type="button"
              onClick={handleCreateChallan}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs shadow-md transition-all"
            >
              <PlusCircle size={15} /> Create First Challan
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/50 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Challan No</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Items / Qty</th>
                  <th className="py-3 px-4">Total Value</th>
                  <th className="py-3 px-4">Vehicle / Transporter</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-xs">
                {challans.map((ch) => {
                  const itemCount = (ch.items || []).length;
                  const totalQty = (ch.items || []).reduce((acc, it) => acc + (parseFloat(it.quantity) || 0), 0);
                  const isMonetary = ch.hasMonetaryValues || (ch.totalAmount && parseFloat(ch.totalAmount) > 0);

                  return (
                    <tr key={ch.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        <Link to={`/view/${ch.id}`} className="hover:text-amber-500 hover:underline">
                          {ch.challanNumber || ch.id}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        {formatDate(ch.challanDate || ch.date)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                          {ch.challanType || 'Standard'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                        <span className="font-semibold">{itemCount} items</span>
                        <span className="text-slate-400 text-[11px]"> ({totalQty} total qty)</span>
                      </td>
                      <td className="py-3 px-4 text-slate-800 dark:text-slate-200 font-semibold">
                        {isMonetary ? formatCurrency(ch.totalAmount) : <span className="text-slate-400 text-[11px]">Non-monetary</span>}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        {ch.transportDetails?.vehicleNumber || ch.vehicleNumber ? (
                          <div className="flex items-center gap-1">
                            <Truck size={12} className="text-slate-400" />
                            <span className="font-mono uppercase">{ch.transportDetails?.vehicleNumber || ch.vehicleNumber}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          ch.status === 'FINALIZED'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : ch.status === 'CANCELLED'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}>
                          {ch.status || 'FINALIZED'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            to={`/view/${ch.id}`}
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                            title="View Challan"
                          >
                            <Eye size={15} />
                          </Link>
                          {triggerPdfDownload && (
                            <button
                              type="button"
                              onClick={() => triggerPdfDownload(ch)}
                              className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                              title="Download PDF"
                            >
                              <Download size={15} />
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
      </div>

      {/* Edit Customer Modal */}
      {isEditModalOpen && (
        <CustomerModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          customer={customer}
          onSave={async (savedCust) => {
            const saved = await saveCustomer(currentCompany.id, savedCust);
            setCustomer(saved);
            setIsEditModalOpen(false);
            showNotification('Customer updated successfully');
          }}
        />
      )}
    </div>
  );
}
