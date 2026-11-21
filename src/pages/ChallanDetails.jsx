import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Printer, 
  Download, 
  Edit, 
  Copy, 
  Trash2, 
  ArrowLeft, 
  Loader2, 
  Ban, 
  RotateCcw,
  MessageCircle,
  Mail,
  Share2,
  Layers,
  FileText,
  Truck,
  Navigation,
  PackageCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  MapPin,
  Calendar,
  User,
  ShieldAlert,
  ClipboardCheck,
  PenLine,
  Scale
} from 'lucide-react';
import { getChallanById, deleteChallan, duplicateChallan, updateChallan } from '../utils/storage';
import { 
  normalizeDeliveryStatus, 
  computeChallanReturnStatus, 
  DELIVERY_STATUSES, 
  RETURN_STATUSES,
  recordActualWeight
} from '../utils/tenantStorage';
import ChallanPreview from '../components/ChallanPreview';
import ConfirmDialog from '../components/ConfirmDialog';
import DispatchModal from '../components/DispatchModal';
import DeliveryTrackingModal from '../components/DeliveryTrackingModal';
import DeliveryConfirmModal from '../components/DeliveryConfirmModal';
import RecordReturnModal from '../components/RecordReturnModal';
import ReturnInspectionModal from '../components/ReturnInspectionModal';
import ActualWeightModal from '../components/ActualWeightModal';
import { useAuth } from '../context/AuthContext';
import { downloadChallanPDF } from '../utils/pdfGenerator';
import { shareViaWhatsApp, openEmailComposer, shareViaWebShare } from '../utils/shareUtils';
import { formatDate } from '../utils/indianBusiness';

export default function ChallanDetails({ companyDetails, triggerDirectPrint }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentCompany, isStaff, isAdmin, user } = useAuth();
  
  const [challan, setChallan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  // Active view tab: 'preview' | 'delivery' | 'returnable' | 'transport'
  const [activeTab, setActiveTab] = useState('preview');

  // Modals
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [trackingModalOpen, setTrackingModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [weighingModalOpen, setWeighingModalOpen] = useState(false);
  const [activeInspectionTx, setActiveInspectionTx] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Document Output Options
  const [paperSize, setPaperSize] = useState('a4');
  const [copyType, setCopyType] = useState('original');
  const [isPdfDownloading, setIsPdfDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    fetchChallan();
  }, [id, currentCompany?.id, navigate]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchChallan = async () => {
    setLoading(true);
    const data = await getChallanById(id);
    if (data) {
      setChallan(data);
    } else {
      alert("You do not have permission to access this challan, or it does not exist.");
      navigate('/challans');
    }
    setLoading(false);
  };

  const handleDuplicate = async () => {
    const copy = await duplicateChallan(challan.id);
    if (copy) {
      alert(`Challan duplicated as ${copy.challanNumber}`);
      navigate(`/view/${copy.id}`);
    }
  };

  const handleCancel = async () => {
    const updated = await updateChallan(challan.id, { 
      status: 'Cancelled',
      deliveryStatus: DELIVERY_STATUSES.CANCELLED 
    });
    if (updated) {
      setChallan(updated);
      setCancelOpen(false);
      showToast('Delivery challan cancelled.');
    }
  };

  const handleReactivate = async () => {
    const updated = await updateChallan(challan.id, { 
      status: 'Finalized',
      deliveryStatus: DELIVERY_STATUSES.READY_FOR_DISPATCH 
    });
    if (updated) {
      setChallan(updated);
      showToast('Challan reactivated to Ready for Dispatch.');
    }
  };

  const handleDelete = async () => {
    const success = await deleteChallan(challan.id);
    if (success) {
      navigate('/challans');
    } else {
      alert("Failed to delete challan.");
    }
  };

  const handleDownloadPdf = async () => {
    if (isPdfDownloading) return;
    setIsPdfDownloading(true);
    try {
      await downloadChallanPDF(challan, companyDetails, { paperSize, copyType });
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsPdfDownloading(false);
    }
  };

  const handlePrint = () => {
    if (triggerDirectPrint) {
      triggerDirectPrint(challan, { paperSize, copyType });
    } else {
      window.print();
    }
  };

  const handleWhatsApp = () => {
    shareViaWhatsApp(challan, companyDetails);
  };

  const handleEmail = () => {
    openEmailComposer(challan, companyDetails);
  };

  const handleNativeShare = async () => {
    setIsSharing(true);
    try {
      await shareViaWebShare(challan, companyDetails, { paperSize, copyType });
    } catch (err) {
      console.error("Share error:", err);
    } finally {
      setIsSharing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-amber-500 mb-2" size={32} />
        <p className="text-xs font-semibold text-slate-500">Loading delivery challan details...</p>
      </div>
    );
  }

  if (!challan) return null;

  const deliveryStatus = normalizeDeliveryStatus(challan);
  const returnStatus = computeChallanReturnStatus(challan);
  const isReturnable = returnStatus !== RETURN_STATUSES.NOT_APPLICABLE;
  const deliveryEvents = challan.deliveryEvents || [];
  const returnTransactions = challan.returnTransactions || [];
  const items = challan.items || challan.products || [];

  const expectedReturnDate = challan.returnable?.expectedReturnDate || items.find(i => i.expectedReturnDate)?.expectedReturnDate;
  const todayStr = new Date().toISOString().split('T')[0];
  const isOverdue = returnStatus === RETURN_STATUSES.OVERDUE || 
    (expectedReturnDate && expectedReturnDate < todayStr && returnStatus !== RETURN_STATUSES.RETURNED);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-4 rounded-xl flex items-center gap-2 text-sm font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
          <CheckCircle2 size={18} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <Link 
            to="/challans" 
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Back to all challans"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-black text-slate-900 tracking-tight">
                {challan.challanNumber || challan.id}
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold border border-slate-200 font-mono">
                {formatDate(challan.challanDate || challan.date)}
              </span>

              {/* Document Status */}
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                challan.status === 'Cancelled'
                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                  : challan.status === 'Draft'
                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              }`}>
                {challan.status || 'Finalized'}
              </span>

              {/* Operational Delivery Status */}
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                deliveryStatus === DELIVERY_STATUSES.DELIVERED
                  ? 'bg-emerald-600 text-white'
                  : deliveryStatus === DELIVERY_STATUSES.DISPATCHED
                  ? 'bg-blue-600 text-white'
                  : deliveryStatus === DELIVERY_STATUSES.IN_TRANSIT
                  ? 'bg-indigo-600 text-white'
                  : deliveryStatus === DELIVERY_STATUSES.PARTIALLY_DELIVERED
                  ? 'bg-purple-600 text-white'
                  : deliveryStatus === DELIVERY_STATUSES.DELIVERY_FAILED
                  ? 'bg-rose-600 text-white'
                  : 'bg-amber-500 text-slate-950 font-black'
              }`}>
                {deliveryStatus}
              </span>

              {/* Return Status if Returnable */}
              {isReturnable && (
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  returnStatus === RETURN_STATUSES.RETURNED
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : isOverdue
                    ? 'bg-rose-100 text-rose-900 border border-rose-300'
                    : 'bg-blue-100 text-blue-900 border border-blue-200'
                }`}>
                  {isOverdue ? '⚠️ Overdue Return' : returnStatus}
                </span>
              )}
            </div>
            
            <p className="text-xs font-semibold text-slate-500 mt-1">
              {challan.customerDetails?.name || (typeof challan.customer === 'string' ? challan.customer.split('\n')[0] : 'Consignee')} • {items.length} Item(s)
            </p>
          </div>
        </div>

        {/* Operational & Document Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Module 4 Operational Quick Actions */}
          {isStaff && deliveryStatus === DELIVERY_STATUSES.READY_FOR_DISPATCH && challan.status !== 'Cancelled' && (
            <button
              onClick={() => setDispatchModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold shadow-md shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Truck size={14} />
              Mark Dispatched
            </button>
          )}

          {isStaff && (deliveryStatus === DELIVERY_STATUSES.DISPATCHED || deliveryStatus === DELIVERY_STATUSES.IN_TRANSIT) && (
            <button
              onClick={() => setTrackingModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              <Navigation size={14} />
              Log Milestone
            </button>
          )}

          {isStaff && deliveryStatus !== DELIVERY_STATUSES.DELIVERED && deliveryStatus !== DELIVERY_STATUSES.CANCELLED && deliveryStatus !== DELIVERY_STATUSES.DRAFT && (
            <button
              onClick={() => setConfirmModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer"
            >
              <PackageCheck size={14} />
              Confirm Delivery
            </button>
          )}

          {isStaff && isReturnable && returnStatus !== RETURN_STATUSES.RETURNED && (
            <button
              onClick={() => setReturnModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer"
            >
              <RotateCcw size={14} />
              Record Return
            </button>
          )}

          <div className="h-6 w-px bg-slate-200 mx-1 hidden lg:block"></div>

          {/* Document Standard Actions */}
          <button
            onClick={() => navigate(`/edit/${challan.id}`)}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
            disabled={!isStaff || challan.status === 'Cancelled'}
          >
            <Edit size={14} />
            Edit
          </button>
          
          <button
            onClick={handleDuplicate}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
            disabled={!isStaff}
          >
            <Copy size={14} />
            Duplicate
          </button>

          {challan.status === 'Cancelled' ? (
            <button
              onClick={handleReactivate}
              className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              disabled={!isAdmin}
            >
              <RotateCcw size={14} />
              Reactivate
            </button>
          ) : (
            <button
              onClick={() => setCancelOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 border border-red-200 hover:bg-red-50 text-red-600 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              disabled={!isAdmin}
            >
              <Ban size={14} />
              Cancel
            </button>
          )}

          <button
            onClick={() => setDeleteOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-2 border border-red-200 hover:bg-red-50 text-red-600 rounded-lg text-xs font-bold transition-colors cursor-pointer"
            disabled={!isAdmin}
            title="Delete Challan"
          >
            <Trash2 size={14} />
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={isPdfDownloading}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-black shadow-sm transition-colors cursor-pointer"
          >
            <Download size={14} />
            {isPdfDownloading ? 'Generating...' : 'PDF'}
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer"
          >
            <Printer size={14} />
            Print
          </button>
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 text-xs font-bold print:hidden">
        <button
          type="button"
          onClick={() => setActiveTab('preview')}
          className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
            activeTab === 'preview'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText size={15} />
          <span>Document Preview</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('delivery')}
          className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
            activeTab === 'delivery'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Truck size={15} />
          <span>Delivery & Transit Tracking</span>
          {deliveryEvents.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-800">
              {deliveryEvents.length}
            </span>
          )}
        </button>

        {isReturnable && (
          <button
            type="button"
            onClick={() => setActiveTab('returnable')}
            className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'returnable'
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <RotateCcw size={15} />
            <span>Returnable Goods</span>
            {isOverdue && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white">
                Overdue
              </span>
            )}
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab('transport')}
          className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
            activeTab === 'transport'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Scale size={15} />
          <span>Transport & Weight</span>
          {challan.weights?.actual && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              challan.weights.actual.verifiedStatus === 'Discrepancy Detected' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
            }`}>
              {challan.weights.actual.verifiedStatus === 'Discrepancy Detected' ? 'Discrepancy' : 'Weighed'}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: DELIVERY & TRANSIT TRACKING */}
      {activeTab === 'delivery' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Visual Step Progress Timeline */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
              Operational Delivery Progression
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className={`p-3 rounded-xl border flex items-center gap-2.5 ${
                deliveryStatus !== DELIVERY_STATUSES.DRAFT 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}>
                <CheckCircle2 size={16} className={deliveryStatus !== DELIVERY_STATUSES.DRAFT ? 'text-emerald-600' : 'text-slate-300'} />
                <div className="text-xs">
                  <div className="font-bold">1. Finalized</div>
                  <div className="text-[10px] opacity-75">Document Issued</div>
                </div>
              </div>

              <div className={`p-3 rounded-xl border flex items-center gap-2.5 ${
                deliveryStatus === DELIVERY_STATUSES.DISPATCHED || deliveryStatus === DELIVERY_STATUSES.IN_TRANSIT || deliveryStatus === DELIVERY_STATUSES.PARTIALLY_DELIVERED || deliveryStatus === DELIVERY_STATUSES.DELIVERED
                  ? 'bg-blue-50 border-blue-200 text-blue-900'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}>
                <Truck size={16} className={deliveryStatus === DELIVERY_STATUSES.DISPATCHED || deliveryStatus === DELIVERY_STATUSES.IN_TRANSIT || deliveryStatus === DELIVERY_STATUSES.PARTIALLY_DELIVERED || deliveryStatus === DELIVERY_STATUSES.DELIVERED ? 'text-blue-600' : 'text-slate-300'} />
                <div className="text-xs">
                  <div className="font-bold">2. Dispatched</div>
                  <div className="text-[10px] opacity-75">Left Premises</div>
                </div>
              </div>

              <div className={`p-3 rounded-xl border flex items-center gap-2.5 ${
                deliveryStatus === DELIVERY_STATUSES.IN_TRANSIT || deliveryStatus === DELIVERY_STATUSES.PARTIALLY_DELIVERED || deliveryStatus === DELIVERY_STATUSES.DELIVERED
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-900'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}>
                <Navigation size={16} className={deliveryStatus === DELIVERY_STATUSES.IN_TRANSIT || deliveryStatus === DELIVERY_STATUSES.PARTIALLY_DELIVERED || deliveryStatus === DELIVERY_STATUSES.DELIVERED ? 'text-indigo-600' : 'text-slate-300'} />
                <div className="text-xs">
                  <div className="font-bold">3. In Transit</div>
                  <div className="text-[10px] opacity-75">Milestones Logged</div>
                </div>
              </div>

              <div className={`p-3 rounded-xl border flex items-center gap-2.5 ${
                deliveryStatus === DELIVERY_STATUSES.DELIVERED
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : deliveryStatus === DELIVERY_STATUSES.PARTIALLY_DELIVERED
                  ? 'bg-purple-50 border-purple-200 text-purple-900'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}>
                <PackageCheck size={16} className={deliveryStatus === DELIVERY_STATUSES.DELIVERED ? 'text-emerald-600' : 'text-slate-300'} />
                <div className="text-xs">
                  <div className="font-bold">{deliveryStatus === DELIVERY_STATUSES.PARTIALLY_DELIVERED ? '4. Partial Delivery' : '4. Completed'}</div>
                  <div className="text-[10px] opacity-75">{deliveryStatus === DELIVERY_STATUSES.DELIVERED ? 'Receiver Confirmed' : 'Awaiting Balance'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Cards Grid: Dispatch Info & Confirmation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Dispatch Information Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                  <Truck size={16} className="text-amber-500" />
                  <span>Dispatch & Transport Details</span>
                </div>
                {isStaff && challan.status !== 'Cancelled' && (
                  <button
                    onClick={() => setDispatchModalOpen(true)}
                    className="text-xs text-amber-600 hover:text-amber-700 font-bold"
                  >
                    {challan.dispatchDetails ? 'Edit Dispatch' : '+ Record Dispatch'}
                  </button>
                )}
              </div>

              {challan.dispatchDetails || challan.transportDetails?.dispatchDate ? (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Dispatch Date & Time</span>
                    <span className="font-semibold text-slate-800">
                      {formatDate(challan.dispatchDetails?.dispatchDate || challan.transportDetails?.dispatchDate)}
                      {challan.dispatchDetails?.dispatchTime ? ` • ${challan.dispatchDetails.dispatchTime}` : ''}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Expected Delivery</span>
                    <span className="font-semibold text-slate-800">
                      {formatDate(challan.dispatchDetails?.expectedDeliveryDate || challan.transportDetails?.expectedDeliveryDate) || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Transporter Name</span>
                    <span className="font-semibold text-slate-800">
                      {challan.dispatchDetails?.transporterName || challan.transportDetails?.transporterName || 'Self Transport'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Vehicle Registration</span>
                    <span className="font-mono font-bold text-slate-800 uppercase">
                      {challan.dispatchDetails?.vehicleNumber || challan.transportDetails?.vehicleNumber || challan.vehicleNumber || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">LR / Bilty Number</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {challan.dispatchDetails?.lrNumber || challan.transportDetails?.lrNumber || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">E-Way Bill Number</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {challan.dispatchDetails?.ewayBillNumber || challan.transportDetails?.ewayBillNumber || '—'}
                    </span>
                  </div>
                  {challan.dispatchDetails?.driverName && (
                    <div className="col-span-2">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Driver Info</span>
                      <span className="font-semibold text-slate-800">
                        {challan.dispatchDetails.driverName} {challan.dispatchDetails.driverPhone ? `(${challan.dispatchDetails.driverPhone})` : ''}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-slate-400">
                  No physical dispatch recorded yet. Click "Mark Dispatched" when goods leave the premises.
                </div>
              )}
            </div>

            {/* Delivery Confirmation Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                  <PackageCheck size={16} className="text-emerald-500" />
                  <span>Proof of Delivery & Receiver</span>
                </div>
                {isStaff && deliveryStatus !== DELIVERY_STATUSES.DELIVERED && challan.status !== 'Cancelled' && (
                  <button
                    onClick={() => setConfirmModalOpen(true)}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-bold"
                  >
                    + Confirm Delivery
                  </button>
                )}
              </div>

              {challan.deliveryConfirmation ? (
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Receiver Name</span>
                      <span className="font-bold text-slate-900">{challan.deliveryConfirmation.receiverName}</span>
                      {challan.deliveryConfirmation.receiverDesignation && (
                        <div className="text-[11px] text-slate-500">{challan.deliveryConfirmation.receiverDesignation}</div>
                      )}
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Delivered Date & Time</span>
                      <span className="font-semibold text-slate-800">
                        {formatDate(challan.deliveryConfirmation.deliveredDate)}
                        {challan.deliveryConfirmation.deliveredTime ? ` • ${challan.deliveryConfirmation.deliveredTime}` : ''}
                      </span>
                    </div>
                  </div>

                  {challan.deliveryConfirmation.remarks && (
                    <div className="p-2.5 bg-slate-50 rounded-lg text-slate-700">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Unloading Notes</span>
                      {challan.deliveryConfirmation.remarks}
                    </div>
                  )}

                  {challan.deliveryConfirmation.signatureDataUrl && (
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Receiver Digital Signature</span>
                      <div className="p-2 border border-slate-200 rounded-lg bg-slate-50/50 inline-block">
                        <img 
                          src={challan.deliveryConfirmation.signatureDataUrl} 
                          alt="Receiver Signature" 
                          className="max-h-16 object-contain"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-slate-400">
                  Goods not yet delivered to consignee.
                </div>
              )}
            </div>
          </div>

          {/* Delivery Events Chronological Timeline */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                <Navigation size={16} className="text-blue-500" />
                <span>Delivery Tracking Events Timeline ({deliveryEvents.length})</span>
              </div>
              {isStaff && challan.status !== 'Cancelled' && (
                <button
                  onClick={() => setTrackingModalOpen(true)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700"
                >
                  + Add Checkpoint Update
                </button>
              )}
            </div>

            {deliveryEvents.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No tracking events logged. Milestones recorded during dispatch and transit will appear here chronologically.
              </div>
            ) : (
              <div className="space-y-4 pl-2">
                {deliveryEvents.map((ev, idx) => (
                  <div key={ev.id || idx} className="flex items-start gap-3 relative pb-4 border-l-2 border-slate-200 pl-4 last:border-transparent last:pb-0">
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-amber-500 border-2 border-white shadow-sm"></div>
                    <div className="flex-1 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-sm">{ev.eventType}</span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {ev.timestamp ? new Date(ev.timestamp).toLocaleString('en-IN') : ''}
                        </span>
                      </div>
                      {ev.location && (
                        <div className="text-slate-500 flex items-center gap-1 text-[11px]">
                          <MapPin size={11} className="text-slate-400" />
                          <span>{ev.location}</span>
                        </div>
                      )}
                      {ev.note && (
                        <p className="text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100">
                          {ev.note}
                        </p>
                      )}
                      <div className="text-[10px] text-slate-400">
                        Updated by: <span className="font-semibold text-slate-600">{ev.updatedBy || 'System'}</span>
                        {ev.statusAfter && ` • Status: ${ev.statusAfter}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: RETURNABLE GOODS TRACKING */}
      {activeTab === 'returnable' && isReturnable && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Header Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <RotateCcw className="text-amber-500" size={20} />
                <h3 className="font-bold text-slate-900 text-base">Returnable Consignment Tracking</h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Issued for temporary job work / demo / tool loan. Track accepted returns and outstanding balances.
              </p>
            </div>
            {isStaff && returnStatus !== RETURN_STATUSES.RETURNED && (
              <button
                type="button"
                onClick={() => setReturnModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs shadow-md transition-all cursor-pointer"
              >
                <RotateCcw size={14} /> Record Return Entry
              </button>
            )}
          </div>

          {/* Returnable Items Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 font-bold text-xs uppercase text-slate-500 tracking-wider">
              Issued Returnable Line Items
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-4">Item Name</th>
                    <th className="py-2.5 px-4 text-center">Issued Qty</th>
                    <th className="py-2.5 px-4 text-center">Returned Qty</th>
                    <th className="py-2.5 px-4 text-center">Outstanding Qty</th>
                    <th className="py-2.5 px-4">Due Return Date</th>
                    <th className="py-2.5 px-4 text-center">Condition</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((it, idx) => {
                    const issued = parseFloat(it.returnableQty !== undefined ? it.returnableQty : it.quantity) || 0;
                    const returned = parseFloat(it.returnedQty) || 0;
                    const outstanding = Math.max(0, issued - returned);

                    return (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {it.name}
                          {it.sku && <div className="text-[10px] text-slate-400 font-mono">SKU: {it.sku}</div>}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-medium">{issued} {it.unit}</td>
                        <td className="py-3 px-4 text-center font-mono text-emerald-600 font-medium">{returned} {it.unit}</td>
                        <td className="py-3 px-4 text-center font-mono font-bold">
                          <span className={outstanding > 0 ? (isOverdue ? 'text-rose-600' : 'text-amber-600') : 'text-slate-400'}>
                            {outstanding} {it.unit}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {expectedReturnDate ? formatDate(expectedReturnDate) : 'Not specified'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                            {it.returnCondition || 'Good'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Historical Return Transactions */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h4 className="font-bold text-sm text-slate-900">
              Return Receipts & Transactions Log ({returnTransactions.length})
            </h4>

            {returnTransactions.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No return transactions recorded yet. When returned goods arrive at receiving bay, click "Record Return Entry".
              </div>
            ) : (
              <div className="space-y-3">
                {returnTransactions.map((tx) => (
                  <div key={tx.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50/60 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <span>Receipt #{tx.id.slice(-6)}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-200 text-slate-800">
                          {tx.condition || 'Good'}
                        </span>
                      </div>
                      <span className="text-slate-500 font-mono text-[11px]">
                        Returned on {formatDate(tx.returnDate)}
                      </span>
                    </div>

                    <div className="text-slate-600">
                      Received by: <span className="font-semibold text-slate-800">{tx.receivedBy}</span>
                      {tx.returnLocation && ` • Location: ${tx.returnLocation}`}
                      {tx.reason && ` • Reason: ${tx.reason}`}
                    </div>

                    {tx.remarks && <p className="italic text-slate-500">{tx.remarks}</p>}

                    {/* Inspection section */}
                    <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
                      {tx.inspection ? (
                        <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1.5">
                          <ClipboardCheck size={14} />
                          <span>Inspected: {tx.inspection.disposition} (Accepted: {tx.inspection.acceptedQty}, Damaged: {tx.inspection.damagedQty})</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between w-full">
                          <span className="text-[11px] text-amber-700 font-medium">Pending quality inspection</span>
                          {isStaff && (
                            <button
                              type="button"
                              onClick={() => setActiveInspectionTx(tx)}
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-[11px] shadow-sm"
                            >
                              Inspect Goods
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: TRANSPORT & WEIGHT MANAGEMENT */}
      {activeTab === 'transport' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Header Summary Bar */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Truck className="text-blue-600" size={20} />
                <h3 className="font-bold text-slate-900 text-base">Transport & Weighbridge Manifest</h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Logistics carrier, vehicle assignment, calculated package weights, and gate weighbridge audit.
              </p>
            </div>
            {isStaff && (
              <button
                type="button"
                onClick={() => setWeighingModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer"
              >
                <Scale size={14} />
                <span>{challan.weights?.actual ? 'Update Weighbridge Slip' : 'Record Weighbridge Slip'}</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: Logistics Carrier & Vehicle */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Truck size={14} className="text-blue-600" />
                  <span>Carrier & Fleet Details</span>
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  (challan.transport?.isSelfDelivery || challan.transportDetails?.isSelfDelivery) ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-700'
                }`}>
                  {(challan.transport?.isSelfDelivery || challan.transportDetails?.isSelfDelivery) ? 'Self Delivery' : 'Logistics Partner'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px] font-medium">Transporter / Carrier</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {challan.transport?.transporterName || challan.transportDetails?.transporterName || '—'}
                  </span>
                  {challan.transport?.transporterCode && (
                    <span className="text-[10px] text-blue-600 font-mono block">
                      Code: {challan.transport.transporterCode}
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px] font-medium">Vehicle Registration</span>
                  <span className="font-mono font-bold text-slate-900 text-sm uppercase">
                    {challan.transport?.vehicleNumber || challan.transportDetails?.vehicleNumber || challan.vehicleNumber || '—'}
                  </span>
                  {challan.transport?.vehicleType && (
                    <span className="text-[10px] text-slate-500 block">
                      {challan.transport.vehicleType}
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px] font-medium">Driver / Chauffeur</span>
                  <span className="font-semibold text-slate-800">
                    {challan.transport?.driverName || challan.transportDetails?.driverName || '—'}
                  </span>
                  {(challan.transport?.driverPhone || challan.transportDetails?.driverPhone) && (
                    <span className="text-[11px] text-slate-500 font-mono block">
                      📞 {challan.transport?.driverPhone || challan.transportDetails?.driverPhone}
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px] font-medium">LR / Consignment Note No</span>
                  <span className="font-mono font-bold text-slate-800">
                    {challan.transport?.lrNumber || challan.transportDetails?.lrNumber || '—'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px] font-medium">E-Way Bill Ref No</span>
                  <span className="font-mono font-bold text-slate-800">
                    {challan.transport?.ewayBillNumber || challan.transportDetails?.ewayBillNumber || challan.ewayBillNumber || '—'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px] font-medium">Dispatch Date</span>
                  <span className="font-semibold text-slate-800">
                    {challan.transport?.dispatchDate ? formatDate(challan.transport.dispatchDate) : '—'}
                  </span>
                </div>
              </div>

              {(challan.transport?.dispatchLocation || challan.transport?.deliveryLocation) && (
                <div className="pt-2 border-t border-slate-100 text-xs space-y-1">
                  {challan.transport?.dispatchLocation && (
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold mr-1">Origin:</span>
                      <span className="text-slate-700">{challan.transport.dispatchLocation}</span>
                    </div>
                  )}
                  {challan.transport?.deliveryLocation && (
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold mr-1">Destination:</span>
                      <span className="text-slate-700">{challan.transport.deliveryLocation}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Card 2: Weight & Package Configuration */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Scale size={14} className="text-amber-500" />
                  <span>Shipment Weights & Packaging</span>
                </span>
                {challan.weights?.completeness === 'Complete' ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    Complete Profile
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                    {challan.weights?.completeness || 'Standard'}
                  </span>
                )}
              </div>

              {challan.weights?.completenessMessage && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium">
                  {challan.weights.completenessMessage}
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Net Weight</span>
                  <span className="font-mono font-bold text-slate-900 text-base">
                    {challan.weights?.totalNetWeight !== undefined ? challan.weights.totalNetWeight : (challan.totalNetWeight || '—')} {challan.weights?.weightUnit || 'Kg'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Packaging Tare</span>
                  <span className="font-mono font-bold text-slate-900 text-base">
                    {challan.weights?.totalPackagingWeight !== undefined ? challan.weights.totalPackagingWeight : (challan.weights?.tareWeight || '0')} {challan.weights?.weightUnit || 'Kg'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Gross Weight</span>
                  <span className="font-mono font-black text-slate-950 text-base">
                    {challan.weights?.totalGrossWeight !== undefined ? challan.weights.totalGrossWeight : (challan.totalGrossWeight || '—')} {challan.weights?.weightUnit || 'Kg'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px] font-medium">Package Count</span>
                  <span className="font-bold text-slate-900">
                    {challan.totalPackages || challan.weights?.numberOfPackages || challan.weights?.totalPackages || items.length} {challan.packagingType || challan.weights?.packageType || 'Packages'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px] font-medium">Standard Internal Unit</span>
                  <span className="font-bold text-slate-900">
                    {challan.weights?.weightUnit || 'Kg (Kilograms)'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Actual Measured Weighbridge Record */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Scale size={16} className="text-amber-500" />
                <h4 className="font-bold text-slate-900 text-sm">Gate Scale / Certified Weighbridge Audit</h4>
              </div>
              {challan.weights?.actual && (
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${
                  challan.weights.actual.verifiedStatus === 'Discrepancy Detected'
                    ? 'bg-red-100 text-red-800 border border-red-200'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}>
                  {challan.weights.actual.verifiedStatus || 'Verified'}
                </span>
              )}
            </div>

            {challan.weights?.actual ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-500 block text-[11px] font-medium">Actual Measured Gross</span>
                    <span className="font-mono font-black text-slate-900 text-base">
                      {challan.weights.actual.grossWeight} {challan.weights.actual.weightUnit || 'Kg'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px] font-medium">Vehicle Tare Weight</span>
                    <span className="font-mono font-bold text-slate-800 text-base">
                      {challan.weights.actual.tareWeight || '0.00'} {challan.weights.actual.weightUnit || 'Kg'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px] font-medium">Net Goods Weight</span>
                    <span className="font-mono font-bold text-emerald-700 text-base">
                      {challan.weights.actual.netWeight || challan.weights.actual.grossWeight} {challan.weights.actual.weightUnit || 'Kg'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px] font-medium">Variance vs Document</span>
                    <span className={`font-mono font-black text-base ${
                      challan.weights.actual.differenceKg === 0 ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      {challan.weights.actual.differenceKg > 0 ? `+${challan.weights.actual.differenceKg}` : challan.weights.actual.differenceKg} kg
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px] font-medium">Weighbridge Slip Ref</span>
                    <span className="font-mono font-bold text-slate-800">
                      {challan.weights.actual.weighbridgeReceiptNo || '—'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[11px] font-medium">Station / Location</span>
                    <span className="font-medium text-slate-800">
                      {challan.weights.actual.weighingLocation || '—'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[11px] font-medium">Weighed By & Method</span>
                    <span className="font-medium text-slate-800">
                      {challan.weights.actual.weighedBy || 'Operator'} ({challan.weights.actual.weighingMethod || 'Weighbridge'})
                    </span>
                  </div>
                </div>

                {challan.weights.actual.discrepancyReason && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-900 rounded-xl text-xs">
                    <span className="font-bold block">Discrepancy Justification:</span>
                    <p className="mt-0.5">{challan.weights.actual.discrepancyReason}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400 text-xs">
                <Scale size={32} className="mx-auto mb-2 opacity-30" />
                <p className="font-semibold text-slate-600">No weighbridge slip recorded yet</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Record measured weighbridge gross and tare readings to audit physical weights against document totals.
                </p>
                {isStaff && (
                  <button
                    type="button"
                    onClick={() => setWeighingModalOpen(true)}
                    className="mt-3 px-3.5 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-colors cursor-pointer"
                  >
                    + Record Weighbridge Slip
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Card 4: Freight Information (if applicable) */}
          {(challan.transport?.freightAmount || challan.transport?.freightPaymentResponsibility) && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider block pb-2 border-b border-slate-100">
                Transportation Charges & Freight Terms
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px] font-medium">Freight Amount</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {challan.transport.freightAmount ? `₹${parseFloat(challan.transport.freightAmount).toFixed(2)}` : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] font-medium">Payment Responsibility</span>
                  <span className="font-semibold text-slate-800">
                    {challan.transport.freightPaymentResponsibility || 'To Pay (Consignee)'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] font-medium">Freight Reference</span>
                  <span className="font-mono text-slate-700">
                    {challan.transport.freightReference || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] font-medium">Remarks</span>
                  <span className="text-slate-700">
                    {challan.transport.freightRemarks || '—'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DOCUMENT PREVIEW */}
      {activeTab === 'preview' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Document Output Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm print:hidden text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700">Document Format:</span>
              <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200">
                <button
                  onClick={() => setPaperSize('a4')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    paperSize === 'a4' ? 'bg-amber-400 text-slate-950 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  A4 Portrait
                </button>
                <button
                  onClick={() => setPaperSize('a5')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    paperSize === 'a5' ? 'bg-amber-400 text-slate-950 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  A5 Compact
                </button>
                <button
                  onClick={() => setPaperSize('thermal80')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    paperSize === 'thermal80' ? 'bg-amber-400 text-slate-950 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  80mm Thermal
                </button>
                <button
                  onClick={() => setPaperSize('thermal58')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    paperSize === 'thermal58' ? 'bg-amber-400 text-slate-950 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  58mm Thermal
                </button>
              </div>
            </div>

            {(paperSize === 'a4' || paperSize === 'a5') && (
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700 flex items-center gap-1">
                  <Layers size={13} className="text-amber-500" />
                  Copy:
                </span>
                <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200">
                  <button
                    onClick={() => setCopyType('original')}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                      copyType === 'original' ? 'bg-slate-900 text-white font-bold' : 'text-slate-600'
                    }`}
                  >
                    Original
                  </button>
                  <button
                    onClick={() => setCopyType('duplicate')}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                      copyType === 'duplicate' ? 'bg-slate-900 text-white font-bold' : 'text-slate-600'
                    }`}
                  >
                    Duplicate
                  </button>
                  <button
                    onClick={() => setCopyType('triplicate')}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                      copyType === 'triplicate' ? 'bg-slate-900 text-white font-bold' : 'text-slate-600'
                    }`}
                  >
                    Triplicate
                  </button>
                  <button
                    onClick={() => setCopyType('all')}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                      copyType === 'all' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-600'
                    }`}
                  >
                    All 3 Copies
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Centered Document Sheet */}
          <div className="flex justify-center p-4 bg-slate-200/60 rounded-2xl border border-slate-300 overflow-x-auto min-h-[310mm] print:p-0 print:border-none print:bg-white">
            <div className="origin-top shadow-2xl">
              <ChallanPreview 
                challan={challan} 
                companyDetails={companyDetails} 
                paperSize={paperSize}
                copyType={copyType}
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDialog 
        isOpen={deleteOpen}
        title="Delete Delivery Challan?"
        message={`Are you sure you want to delete ${challan.challanNumber}? This action cannot be undone and will permanently remove this record.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />

      {/* Cancel Confirmation Modal */}
      <ConfirmDialog 
        isOpen={cancelOpen}
        title="Cancel Delivery Challan?"
        message={`Are you sure you want to cancel ${challan.challanNumber}? This will mark it as CANCELLED on the document and PDF exports.`}
        confirmText="Cancel Challan"
        cancelText="Back"
        onConfirm={handleCancel}
        onCancel={() => setCancelOpen(false)}
      />

      {/* Dispatch Modal */}
      {dispatchModalOpen && (
        <DispatchModal
          isOpen={dispatchModalOpen}
          onClose={() => setDispatchModalOpen(false)}
          challan={challan}
          onSuccess={(updated) => {
            setChallan(updated);
            showToast('Goods dispatch recorded successfully.');
          }}
        />
      )}

      {/* Tracking Modal */}
      {trackingModalOpen && (
        <DeliveryTrackingModal
          isOpen={trackingModalOpen}
          onClose={() => setTrackingModalOpen(false)}
          challan={challan}
          onSuccess={(updated) => {
            setChallan(updated);
            showToast('Tracking milestone saved.');
          }}
        />
      )}

      {/* Delivery Confirm Modal */}
      {confirmModalOpen && (
        <DeliveryConfirmModal
          isOpen={confirmModalOpen}
          onClose={() => setConfirmModalOpen(false)}
          challan={challan}
          onSuccess={(updated) => {
            setChallan(updated);
            showToast('Delivery confirmation recorded.');
          }}
        />
      )}

      {/* Record Return Modal */}
      {returnModalOpen && (
        <RecordReturnModal
          isOpen={returnModalOpen}
          onClose={() => setReturnModalOpen(false)}
          challan={challan}
          onSuccess={(updated) => {
            setChallan(updated);
            showToast('Goods return recorded successfully.');
          }}
        />
      )}

      {/* Inspection Modal */}
      {activeInspectionTx && (
        <ReturnInspectionModal
          isOpen={Boolean(activeInspectionTx)}
          onClose={() => setActiveInspectionTx(null)}
          challan={challan}
          transaction={activeInspectionTx}
          onSuccess={(updated) => {
            setChallan(updated);
            showToast('Return inspection result saved.');
          }}
        />
      )}

      {/* Actual Weighbridge Slip Modal */}
      {weighingModalOpen && (
        <ActualWeightModal
          isOpen={weighingModalOpen}
          onClose={() => setWeighingModalOpen(false)}
          challan={challan}
          currentUser={user}
          onSave={async (payload) => {
            await recordActualWeight(currentCompany.id, challan.id, payload, user);
            showToast('Weighbridge slip saved successfully.');
            await fetchChallan();
          }}
        />
      )}
    </div>
  );
}
