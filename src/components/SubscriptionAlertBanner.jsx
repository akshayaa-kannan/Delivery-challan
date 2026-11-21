import React, { useState } from 'react';
import { AlertTriangle, Zap, ArrowRight, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function SubscriptionAlertBanner({ onOpenSubscription }) {
  const { subscriptionStatus, simulatedDay, setSimulatedDay } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  // Only render if in alert period (1st or 2nd of month) and unpaid
  if (!subscriptionStatus?.isAlertPeriod || dismissed) {
    return null;
  }

  const { currentMonthFormatted, currentDay, amount, currency } = subscriptionStatus;

  return (
    <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-slate-950 px-4 py-2.5 shadow-md flex items-center justify-between gap-3 text-xs z-30 shrink-0 font-sans border-b border-amber-400">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="p-1.5 rounded-lg bg-slate-950 text-amber-400 shrink-0 shadow-sm">
          <AlertTriangle size={15} />
        </span>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
          <span className="font-black uppercase tracking-wider text-[11px] bg-slate-950/20 px-1.5 py-0.5 rounded text-slate-950">
            Day {currentDay} of Month: Subscription Due
          </span>
          <span className="font-semibold text-slate-950 truncate">
            Your monthly subscription (₹{amount}/month) for <strong>{currentMonthFormatted}</strong> is due for renewal!
          </span>
          <span className="text-slate-900 hidden md:inline">
            The <strong>3rd is the final deadline</strong> before workspace access is locked.
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onOpenSubscription}
          className="px-3.5 py-1.5 bg-slate-950 hover:bg-slate-900 text-amber-400 font-black rounded-lg transition-all flex items-center gap-1.5 shadow-sm cursor-pointer hover:scale-105 active:scale-95"
        >
          <Zap size={13} className="text-amber-400 fill-amber-400" />
          <span>Pay ₹{amount} Now</span>
          <ArrowRight size={13} />
        </button>

        {simulatedDay && (
          <button
            onClick={() => setSimulatedDay(null)}
            title="Reset simulated date"
            className="hidden sm:inline-block px-2 py-1 bg-white/30 hover:bg-white/40 text-[10px] font-bold rounded cursor-pointer"
          >
            Reset Sim
          </button>
        )}

        <button
          onClick={() => setDismissed(true)}
          className="p-1 hover:bg-slate-950/10 rounded-md transition-colors text-slate-950"
          title="Dismiss notification"
          aria-label="Dismiss"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
