import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  CheckCircle2, 
  X, 
  ArrowRight, 
  ShieldCheck, 
  CreditCard, 
  Lock, 
  Sparkles, 
  HelpCircle,
  Zap,
  Building2,
  FileText,
  Clock,
  PhoneCall
} from 'lucide-react';
import { PublicNavbar, PublicFooter } from './PublicPages';
import { useAuth } from '../context/AuthContext';

export default function PricingPage() {
  const { currentUser } = useAuth();
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'yearly'

  const plans = [
    {
      id: 'trial',
      name: '14-Day Free Trial',
      tagline: 'Test the full platform risk-free',
      price: '₹0',
      period: 'for 14 days',
      badge: 'No Card Required',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      description: 'Ideal for trying out Nayaruvi and seeing how seamlessly it fits into your workflow.',
      features: [
        'Up to 15 Delivery Challans',
        'Custom Company Logo & Millimeter Sizing',
        'Standard & Professional Templates',
        'Browser Printing & Vector PDF Downloads',
        'Company Settings & Address Profile',
        'Community & Email Support'
      ],
      notIncluded: [
        'Unlimited Monthly Challans',
        'Multi-User Team Roles',
        'Recycle Bin Instant Recovery',
        'Priority Phone Support'
      ],
      ctaText: currentUser ? 'Current Workspace' : 'Start Free Trial',
      ctaLink: currentUser ? '/' : '/register',
      highlighted: false
    },
    {
      id: 'pro',
      name: 'Pro Unlimited',
      tagline: 'Everything growing businesses need',
      price: billingCycle === 'monthly' ? '₹500' : '₹5,000',
      period: billingCycle === 'monthly' ? '/ month' : '/ year (Get 2 Months Free)',
      badge: 'Most Popular',
      badgeColor: 'bg-amber-500 text-slate-950 font-black',
      description: 'Full unmetered delivery challan creation with team collaboration and dedicated customer support.',
      features: [
        'UNLIMITED Delivery Challans',
        'Custom Prefixes & Atomic Sequence Numbers',
        'Custom Logo Length & Width Control',
        'Multi-User Team Management (Owner, Admin, Staff)',
        'Recycle Bin & Instant Trash Restoration',
        'Vector PDF Generation & High-Res Printing',
        'Customer Directory & Auto-Suggestions',
        'GSTIN Compliance & HSN/SAC Support',
        'Secure Razorpay Automated Subscription',
        'Priority Email & Telephone Support'
      ],
      notIncluded: [],
      ctaText: currentUser ? 'Manage Subscription' : 'Upgrade to Pro',
      ctaLink: currentUser ? '/settings' : '/register',
      highlighted: true
    },
    {
      id: 'enterprise',
      name: 'Enterprise / Custom',
      tagline: 'Tailored for multi-branch organizations',
      price: 'Custom',
      period: 'billed annually',
      badge: 'High Volume',
      badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      description: 'Custom configurations for large enterprises managing multiple manufacturing units or branches.',
      features: [
        'Everything in Pro Unlimited',
        'Multi-Branch & Warehouse Partitioning',
        'Dedicated Cloud Firestore Instance Option',
        'Custom Challan Template Layouts',
        'Custom ERP & Inventory Integrations',
        '99.9% Uptime Service Level Agreement (SLA)',
        'Dedicated Account Manager & Training'
      ],
      notIncluded: [],
      ctaText: 'Contact Enterprise Sales',
      ctaLink: '/contact',
      highlighted: false
    }
  ];

  const comparisonFeatures = [
    { name: 'Delivery Challan Generation', trial: '15 documents', pro: 'Unlimited', enterprise: 'Unlimited' },
    { name: 'Custom Challan Prefix & Sequence', trial: 'Basic', pro: 'Full Control', enterprise: 'Multi-branch series' },
    { name: 'Logo Custom Width & Length (mm)', trial: 'Yes', pro: 'Yes', enterprise: 'Yes' },
    { name: 'PDF Export & Direct A4 Print', trial: 'Yes', pro: 'Yes (High-Res)', enterprise: 'Yes (Custom Templates)' },
    { name: 'Team Collaboration & Roles', trial: '1 User', pro: 'Unlimited Users', enterprise: 'Custom RBAC' },
    { name: 'Recycle Bin & Document Recovery', trial: 'No', pro: 'Yes', enterprise: 'Yes' },
    { name: 'Data Isolation & Encryption', trial: 'Yes', pro: 'Yes', enterprise: 'Dedicated Partition' },
    { name: 'GST Compliant Invoices & Challans', trial: 'Yes', pro: 'Yes', enterprise: 'Yes' },
    { name: 'Support Availability', trial: 'Email', pro: 'Priority Email & Phone', enterprise: 'Dedicated Manager (24/7)' }
  ];

  const faqs = [
    {
      q: 'How does the 14-day free trial work?',
      a: 'When you sign up, your company account is automatically activated with our 14-day Free Trial. You do not need to enter credit card, debit card, or UPI details to start. You can test all features and generate real delivery challans.'
    },
    {
      q: 'Which payment methods are accepted for subscriptions?',
      a: 'We process all subscription payments securely through Razorpay. We support UPI (Google Pay, PhonePe, Paytm, BHIM), Credit Cards, Debit Cards, Netbanking (50+ Indian banks), and digital wallets.'
    },
    {
      q: 'Can I cancel my subscription at any time?',
      a: 'Yes, absolutely. You can cancel your subscription at any time directly through your company Settings page or by emailing nayaruvi.official@gmail.com. There are no lock-in periods or cancellation fees.'
    },
    {
      q: 'Are my business and challan data safe if my subscription expires?',
      a: 'Yes. If your subscription expires, your company profile, previous challans, and customer directories remain safely encrypted and preserved in your workspace so you can export your records or renew at your convenience.'
    },
    {
      q: 'Will I receive an invoice or receipt for my subscription payment?',
      a: 'Yes! Upon successful subscription payment via Razorpay, an official digital invoice receipt with complete payment and transaction details is automatically generated and emailed to your registered billing email.'
    },
    {
      q: 'What is the refund policy for subscriptions?',
      a: 'We offer a 7-day money-back satisfaction guarantee on new paid subscriptions. If you experience technical failure or billing discrepancy, contact nayaruvi.official@gmail.com within 7 days for a full refund processed to your original payment method within 5 to 7 business days.'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-950">
      <PublicNavbar />

      {/* Hero Header */}
      <section className="pt-16 pb-12 px-4 sm:px-6 lg:px-8 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold mb-6">
          <Sparkles size={14} />
          <span>Simple, Transparent Pricing for Indian Businesses</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-4">
          Choose the Perfect Plan for Your Business
        </h1>
        <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
          No hidden fees. No complicated setups. Start with our 14-day trial, then upgrade to unlimited professional challan generation.
        </p>

        {/* Monthly vs Annual Toggle */}
        <div className="mt-8 flex items-center justify-center gap-3">
          <span className={`text-xs font-bold ${billingCycle === 'monthly' ? 'text-white' : 'text-slate-400'}`}>
            Monthly Billing
          </span>
          <button
            type="button"
            onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
            className="w-14 h-7 bg-slate-800 rounded-full p-1 transition-colors relative cursor-pointer border border-slate-700"
            aria-label="Toggle billing frequency"
          >
            <div 
              className={`w-5 h-5 rounded-full bg-amber-500 transition-transform ${
                billingCycle === 'yearly' ? 'translate-x-7' : 'translate-x-0'
              }`}
            />
          </button>
          <span className={`text-xs font-bold flex items-center gap-1.5 ${billingCycle === 'yearly' ? 'text-white' : 'text-slate-400'}`}>
            <span>Annual Billing</span>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Save 17%
            </span>
          </span>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {plans.map((p) => (
            <div
              key={p.id}
              className={`rounded-2xl p-8 flex flex-col justify-between transition-all relative ${
                p.highlighted
                  ? 'bg-slate-900 border-2 border-amber-500 shadow-2xl shadow-amber-500/10 lg:-translate-y-2'
                  : 'bg-slate-900/60 border border-slate-800 hover:border-slate-700'
              }`}
            >
              {p.highlighted && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-full shadow-md">
                  Most Popular
                </div>
              )}

              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h3 className="text-xl font-black text-white">{p.name}</h3>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${p.badgeColor}`}>
                    {p.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-6">{p.tagline}</p>

                <div className="mb-6 flex items-baseline gap-1.5 pb-6 border-b border-slate-800">
                  <span className="text-4xl font-black text-white tracking-tight">{p.price}</span>
                  <span className="text-xs text-slate-400 font-medium">{p.period}</span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed mb-6">{p.description}</p>

                <div className="space-y-3 mb-8">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    What's included:
                  </span>
                  {p.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-200">
                      <CheckCircle2 size={16} className="text-amber-400 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                  {p.notIncluded.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-500 line-through">
                      <X size={16} className="text-slate-600 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Link
                  to={p.ctaLink}
                  className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-xs font-black transition-all ${
                    p.highlighted
                      ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-lg shadow-amber-500/20'
                      : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                  }`}
                >
                  <span>{p.ctaText}</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Razorpay Trust & Payment Methods Banner */}
      <section className="border-y border-slate-800 bg-slate-900/50 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div className="space-y-1">
            <div className="flex items-center justify-center md:justify-start gap-2 text-sm font-bold text-white">
              <ShieldCheck className="text-emerald-400" size={18} />
              <span>100% Secure Payments Powered by Razorpay</span>
            </div>
            <p className="text-xs text-slate-400">
              PCI-DSS Level 1 Compliant. Supports UPI, RuPay, Visa, Mastercard, NetBanking & Corporate Cards.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-mono font-bold text-slate-300">
            <span className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg">UPI</span>
            <span className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg">Cards</span>
            <span className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg">NetBanking</span>
            <span className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg">Wallets</span>
            <span className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg">GST Invoice</span>
          </div>
        </div>
      </section>

      {/* Detailed Plan Comparison Table */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-black text-white">Compare Plan Features</h2>
          <p className="text-xs text-slate-400 mt-2">Detailed breakdown of platform capabilities across all tiers</p>
        </div>

        <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/60 shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-300 uppercase tracking-wider font-extrabold border-b border-slate-800">
                <tr>
                  <th className="py-4 px-6">Feature</th>
                  <th className="py-4 px-6 text-center">14-Day Trial</th>
                  <th className="py-4 px-6 text-center text-amber-400 bg-amber-500/5">Pro Unlimited</th>
                  <th className="py-4 px-6 text-center">Enterprise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {comparisonFeatures.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-6 font-bold text-white">{row.name}</td>
                    <td className="py-3.5 px-6 text-center text-slate-400">{row.trial}</td>
                    <td className="py-3.5 px-6 text-center font-bold text-amber-300 bg-amber-500/5">{row.pro}</td>
                    <td className="py-3.5 px-6 text-center text-slate-300">{row.enterprise}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Pricing FAQs */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-black text-white">Frequently Asked Questions</h2>
          <p className="text-xs text-slate-400 mt-2">Everything you need to know about billing and subscriptions</p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div key={idx} className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <HelpCircle size={15} className="text-amber-400 shrink-0" />
                <span>{faq.q}</span>
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed pl-6">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 text-center">
        <div className="bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-amber-500/5 border border-amber-500/30 rounded-3xl p-10 sm:p-14">
          <h2 className="text-2xl sm:text-4xl font-black text-white mb-3">
            Ready to Streamline Your Delivery Challans?
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto mb-8">
            Join hundreds of manufacturers, electrical vendors, and distributors using Nayaruvi across India.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="w-full sm:w-auto px-8 py-3.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
            >
              <span>Get Started in 2 Minutes</span>
              <ArrowRight size={15} />
            </Link>
            <Link
              to="/contact"
              className="w-full sm:w-auto px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs border border-slate-700 transition-colors"
            >
              Talk to Our Team
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
