import React, { useState } from 'react';
import { Lock, Zap, ShieldCheck, AlertOctagon, HelpCircle, LogOut, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { loadRazorpayScript } from '../utils/razorpay';
import { updateCompanySubscription } from '../utils/storage';

export default function SubscriptionLockOverlay({ onOpenSubscription }) {
  const { 
    currentCompany, 
    currentUser, 
    subscription, 
    subscriptionStatus, 
    recordPayment, 
    logout,
    simulatedDay,
    setSimulatedDay,
    reloadCompany
  } = useAuth();

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Only render if subscription is locked (Day 3+ and unpaid)
  if (!subscriptionStatus?.isLocked) {
    return null;
  }

  const { currentMonthFormatted, currentDay, amount, currency, planName } = subscriptionStatus;

  // Real Razorpay Payment
  const handleRazorpayPay = async () => {
    if (!currentCompany) return;
    setLoading(true);

    const sdkLoaded = await loadRazorpayScript();
    if (!sdkLoaded) {
      alert("Razorpay checkout failed to load. Please verify your internet connection.");
      setLoading(false);
      return;
    }

    const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID;
    if (!keyId) {
      alert("Payment gateway key (VITE_RAZORPAY_KEY_ID) is not configured in .env. Please configure it or use the Instant Test Payment simulation below.");
      setLoading(false);
      return;
    }
    const amountInPaise = (amount || 500) * 100;

    const options = {
      key: keyId,
      amount: amountInPaise,
      currency: currency || "INR",
      name: "Nayaruvi Delivery Challan",
      description: `Monthly Subscription (${currentMonthFormatted}) - ${currentCompany.displayName || currentCompany.legalName}`,
      image: currentCompany.logoUrl || "/favicon.svg",
      payment_capture: 1,
      handler: async function (response) {
        if (response.razorpay_payment_id) {
          try {
            await recordPayment({
              paymentId: response.razorpay_payment_id,
              planId: subscription?.planId || "pro_monthly",
              amount: amount || 500,
              currency: currency || "INR",
              billingMonth: subscriptionStatus.currentMonthKey
            });
            await reloadCompany();
            setSuccessMsg("Payment successful! Your workspace has been unlocked.");
          } catch (err) {
            console.error("Failed to save payment:", err);
            alert("Payment processed, but database sync encountered an error. Please refresh the page.");
          }
        }
      },
      prefill: {
        name: currentUser?.displayName || currentCompany?.displayName || "Subscriber",
        email: currentUser?.email || currentCompany?.businessEmail || "nayaruvi.official@gmail.com",
        contact: currentCompany?.businessPhone || ""
      },
      theme: {
        color: "#f59e0b" // Amber
      }
    };

    try {
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error("Razorpay initiation failed:", err);
      alert("Could not open Razorpay checkout.");
    } finally {
      setLoading(false);
    }
  };

  // Start or restore 14-day free trial
  const handleStartTrial = async () => {
    if (!currentCompany) return;
    setLoading(true);
    try {
      await updateCompanySubscription(currentCompany.id, {
        status: "TRIAL",
        planName: "14-Day Free Trial",
        planId: "trial",
        amount: 0,
        currency: "INR",
        billingCycle: "trial",
        trialDaysRemaining: 14,
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        isPaid: false
      });
      await reloadCompany();
      setSuccessMsg("14-Day Free Trial activated! Workspace access is restored.");
    } catch (err) {
      console.error("Trial activation error:", err);
      alert("Failed to activate trial.");
    } finally {
      setLoading(false);
    }
  };

  // Instant Test Payment Simulation (for demonstration & testing without real bank credentials)
  const handleSimulatePayment = async () => {
    if (!currentCompany) return;
    setLoading(true);
    try {
      const mockPayId = `pay_sim_${Date.now().toString(36)}`;
      await recordPayment({
        paymentId: mockPayId,
        planId: subscription?.planId || "pro_monthly",
        amount: amount || 500,
        currency: currency || "INR",
        billingMonth: subscriptionStatus.currentMonthKey
      });
      await reloadCompany();
      setSuccessMsg("Test payment applied! Workspace access is restored.");
    } catch (err) {
      console.error("Simulated payment error:", err);
      alert("Failed to record test payment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto font-sans animate-fade-in">
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col my-8">
        
        {/* Lockout Header */}
        <div className="p-8 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white text-center relative">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center text-red-400 mb-4 shadow-lg shadow-red-500/20">
            <Lock size={32} className="animate-pulse" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 text-[11px] font-black uppercase tracking-wider mb-2">
            <AlertOctagon size={13} />
            <span>Account Temporarily Locked</span>
          </div>

          <h2 className="text-2xl font-black text-white tracking-tight">
            Monthly Subscription Overdue
          </h2>

          <p className="text-xs text-slate-300 mt-2 max-w-sm mx-auto leading-relaxed">
            Subscription renewal was due on the <strong>1st & 2nd</strong>. The <strong>3rd is the final cutoff</strong>. Workspace access is locked until the subscription for <strong>{currentMonthFormatted}</strong> is paid.
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-5">
          {successMsg ? (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-center space-y-2">
              <CheckCircle2 size={36} className="text-emerald-500 mx-auto" />
              <div className="font-extrabold text-sm">{successMsg}</div>
              <p className="text-xs text-emerald-700">Please wait while your workspace unlocks...</p>
            </div>
          ) : (
            <>
              {/* Account & Bill Breakdown */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-medium">Company Workspace</span>
                  <span className="text-slate-900 font-extrabold">{currentCompany?.displayName || currentCompany?.legalName || "Your Company"}</span>
                </div>

                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-medium">Subscription Plan</span>
                  <span className="text-slate-900 font-bold">{planName}</span>
                </div>

                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-medium">Billing Period</span>
                  <span className="text-amber-700 font-black">{currentMonthFormatted} (Overdue)</span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-700 font-black uppercase tracking-wider text-[11px]">Total Renewal Amount</span>
                  <span className="text-2xl font-black text-slate-950">₹{amount}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5">
                <button
                  onClick={handleRazorpayPay}
                  disabled={loading}
                  className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-black rounded-xl text-sm transition-all shadow-lg shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={18} />
                      <span>Pay ₹{amount} via Razorpay & Unlock</span>
                    </>
                  )}
                </button>

                {/* Instant Dev / Demo Simulation Button */}
                <button
                  onClick={handleSimulatePayment}
                  disabled={loading}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200"
                  title="Simulate instant payment for demonstration"
                >
                  <Zap size={14} className="text-amber-500 fill-amber-500" />
                  <span>⚡ Instant Test Payment & Unlock (Demo Mode)</span>
                </button>

                {/* Free Trial Option */}
                <button
                  onClick={handleStartTrial}
                  disabled={loading}
                  className="w-full py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-emerald-200"
                  title="Continue exploring with 14-day free trial"
                >
                  <ShieldCheck size={14} className="text-emerald-600" />
                  <span>🎁 Continue with 14-Day Free Trial</span>
                </button>
              </div>

              {/* Developer / Testing Date Simulation Controls */}
              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/60 text-[11px] text-slate-700 space-y-1.5">
                <div className="font-bold flex items-center justify-between text-amber-900">
                  <span>🧪 Test Billing Cycle Simulator:</span>
                  {simulatedDay && (
                    <span className="text-[10px] bg-amber-200/80 px-1.5 py-0.5 rounded font-black">
                      Simulated: Day {simulatedDay}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <button
                    onClick={() => setSimulatedDay(1)}
                    className="px-2 py-1 bg-white hover:bg-amber-100 border border-amber-300 rounded text-[10px] font-bold text-slate-800 cursor-pointer"
                  >
                    Simulate Day 1 (Alert)
                  </button>
                  <button
                    onClick={() => setSimulatedDay(2)}
                    className="px-2 py-1 bg-white hover:bg-amber-100 border border-amber-300 rounded text-[10px] font-bold text-slate-800 cursor-pointer"
                  >
                    Simulate Day 2 (Alert)
                  </button>
                  <button
                    onClick={() => setSimulatedDay(3)}
                    className="px-2 py-1 bg-white hover:bg-amber-100 border border-amber-300 rounded text-[10px] font-bold text-slate-800 cursor-pointer"
                  >
                    Simulate Day 3 (Locked)
                  </button>
                  <button
                    onClick={() => setSimulatedDay(null)}
                    className="px-2 py-1 bg-white hover:bg-slate-200 border border-slate-300 rounded text-[10px] font-bold text-slate-600 cursor-pointer"
                  >
                    Reset to Real Today
                  </button>
                </div>
              </div>

              {/* Help & Support */}
              <div className="pt-2 text-center space-y-2">
                <p className="text-[11px] text-slate-500">
                  Need assistance with your subscription or payment receipt?
                </p>
                <div className="text-xs font-bold text-slate-700 flex flex-wrap justify-center gap-x-3 gap-y-1">
                  <a href="mailto:nayaruvi.official@gmail.com" className="text-amber-600 hover:underline">
                    nayaruvi.official@gmail.com
                  </a>
                  <span>•</span>
                  <span>8925137065 / 9498478894</span>
                </div>
              </div>
            </>
          )}

          {/* Logout Option */}
          <div className="pt-2 border-t border-slate-100 flex justify-center">
            <button
              onClick={logout}
              className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 font-semibold cursor-pointer"
            >
              <LogOut size={13} />
              <span>Log out or Switch Account</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
