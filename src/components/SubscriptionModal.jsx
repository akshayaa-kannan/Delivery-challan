import React, { useState } from 'react';
import { ShieldCheck, Zap, CheckCircle2, X, Loader2 } from 'lucide-react';
import { loadRazorpayScript } from '../utils/razorpay';
import { useAuth } from '../context/AuthContext';
import { getCurrentBillingMonth } from '../utils/subscriptionManager';

export default function SubscriptionModal({ isOpen, onSuccess, onClose }) {
  const { currentCompany, currentUser, reloadCompany, recordPayment } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState('monthly'); // 'monthly' | 'yearly'
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const planConfig = {
    monthly: {
      name: "Pro Monthly Subscription",
      amount: 50000, // in paise = ₹500
      displayAmount: "₹500",
      period: "30 Days"
    },
    yearly: {
      name: "Pro Annual Subscription",
      amount: 500000, // in paise = ₹5,000
      displayAmount: "₹5,000",
      period: "365 Days (2 Months Free)"
    }
  };

  const currentSelected = planConfig[selectedPlan];

  const handleSimulatePayment = async () => {
    if (!currentCompany) return;
    setLoading(true);
    try {
      const mockPayId = `pay_sim_${Date.now().toString(36)}`;
      await recordPayment({
        paymentId: mockPayId,
        planId: selectedPlan === 'yearly' ? 'pro_annual' : 'pro_monthly',
        amount: currentSelected.amount / 100,
        currency: "INR",
        billingMonth: getCurrentBillingMonth()
      });
      await reloadCompany();
      alert(`Test Payment recorded successfully! (Simulated ID: ${mockPayId})`);
      if (onSuccess) onSuccess(mockPayId);
      onClose();
    } catch (e) {
      console.error("Failed to record test payment:", e);
      alert("Failed to record payment in database.");
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!currentCompany) {
      alert("Please ensure your company profile is loaded before subscribing.");
      return;
    }

    setLoading(true);

    const res = await loadRazorpayScript();
    if (!res) {
      alert("Razorpay SDK failed to load. Please check your internet connection.");
      setLoading(false);
      return;
    }

    const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID;
    if (!keyId) {
      alert("Payment gateway key (VITE_RAZORPAY_KEY_ID) is not configured in .env. Please configure your Razorpay Key ID.");
      setLoading(false);
      return;
    }

    const options = {
      key: keyId,
      amount: currentSelected.amount,
      currency: "INR",
      name: currentCompany?.displayName || currentCompany?.legalName || "Nayaruvi Delivery Challan",
      description: `${currentSelected.name} - ${currentCompany?.displayName || 'Company Workspace'}`,
      image: currentCompany?.logoUrl || "/favicon.svg",
      payment_capture: 1,
      handler: async function (response) {
        if (response.razorpay_payment_id) {
          try {
            await recordPayment({
              paymentId: response.razorpay_payment_id,
              planId: selectedPlan === 'yearly' ? 'pro_annual' : 'pro_monthly',
              amount: currentSelected.amount / 100,
              currency: "INR",
              billingMonth: getCurrentBillingMonth()
            });

            await reloadCompany();
            alert(`Payment Successful! Payment ID: ${response.razorpay_payment_id}`);
            if (onSuccess) onSuccess(response.razorpay_payment_id);
            onClose();
          } catch (e) {
            console.error("Failed to update subscription in Firestore:", e);
            alert("Payment processed, but could not update database record. Please contact support.");
          }
        }
      },
      prefill: {
        name: currentUser?.displayName || currentCompany?.displayName || "Subscriber",
        email: currentUser?.email || currentCompany?.businessEmail || "user@company.com",
        contact: currentCompany?.businessPhone || ""
      },
      theme: {
        color: "#f59e0b" // Amber
      }
    };

    try {
      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch (error) {
      console.error("Razorpay initiation error:", error);
      alert("Could not initialize Razorpay checkout. Please verify your internet connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in font-sans">
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
          <div className="flex items-center gap-2 mb-2">
            <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Zap size={16} />
            </span>
            <span className="text-[11px] font-black uppercase tracking-wider text-amber-400">
              Company Cloud Subscription
            </span>
          </div>
          <h2 className="text-xl font-black text-white">
            Upgrade {currentCompany?.displayName || "Company"} Workspace
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Unlimited delivery challans, team collaboration, and cloud backup.
          </p>
        </div>

        {/* Plan Selector */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Monthly */}
            <div
              onClick={() => setSelectedPlan('monthly')}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                selectedPlan === 'monthly'
                  ? 'border-amber-500 bg-amber-50/40 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="text-xs font-bold text-slate-600">Monthly Pro</div>
              <div className="text-2xl font-black text-slate-900 mt-1">₹500</div>
              <div className="text-[10px] text-slate-500 font-medium">Billed every 30 days</div>
            </div>

            {/* Yearly */}
            <div
              onClick={() => setSelectedPlan('yearly')}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all relative ${
                selectedPlan === 'yearly'
                  ? 'border-amber-500 bg-amber-50/40 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <span className="absolute -top-2.5 right-3 bg-emerald-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                Save 17%
              </span>
              <div className="text-xs font-bold text-slate-600">Annual Pro</div>
              <div className="text-2xl font-black text-slate-900 mt-1">₹5,000</div>
              <div className="text-[10px] text-slate-500 font-medium">1 Year Access</div>
            </div>
          </div>

          {/* Feature Checklist */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2 text-xs text-slate-700">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
              <span>Unlimited delivery challans & customer records</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
              <span>Dedicated prefix & atomic concurrency-safe numbering</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
              <span>Multi-user team access with Owner, Admin, & Staff roles</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
              <span>Secure Razorpay checkout (UPI, Cards, NetBanking)</span>
            </div>
          </div>

          {/* Checkout Button */}
          <button
            onClick={handlePayment}
            disabled={loading}
            className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-black rounded-xl text-sm transition-all shadow-lg shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Opening Razorpay Checkout...</span>
              </>
            ) : (
              <>
                <ShieldCheck size={18} />
                <span>Pay {currentSelected.displayAmount} via Razorpay</span>
              </>
            )}
          </button>

          <button
            onClick={handleSimulatePayment}
            disabled={loading}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200"
            title="Record simulated payment without entering bank card"
          >
            <Zap size={14} className="text-amber-500 fill-amber-500" />
            <span>⚡ Instant Test Payment & Activate (Demo Mode)</span>
          </button>

          <p className="text-[10px] text-center text-slate-400">
            Transactions are encrypted with 256-bit SSL via Razorpay. Cancel anytime.
          </p>
        </div>
      </div>
    </div>
  );
}
