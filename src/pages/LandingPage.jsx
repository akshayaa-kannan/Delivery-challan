import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Building2, 
  FileText, 
  ShieldCheck, 
  Printer, 
  Download, 
  Users, 
  CheckCircle2, 
  ArrowRight, 
  Zap, 
  RotateCcw, 
  Sparkles,
  Layers,
  ChevronRight,
  Mail,
  Phone,
  HelpCircle,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PublicFooter } from './PublicPages';

export default function LandingPage() {
  const { currentUser, currentCompany } = useAuth();
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'yearly'
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* 1. Main Navigation Bar */}
      <nav className="border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shadow-amber-500/20">
              N
            </div>
            <div>
              <span className="text-xl font-black text-white tracking-tight block leading-none">NAYARUVI</span>
              <span className="text-[10px] text-amber-400 font-extrabold uppercase tracking-widest">Delivery Challan SaaS</span>
            </div>
          </Link>

          {/* Desktop Nav Links: Explicitly visible on md screens & above */}
          <div className="hidden md:flex items-center gap-3 lg:gap-4 xl:gap-5 text-xs font-bold text-slate-300">
            <a href="#features" className="hover:text-amber-400 transition-colors">Features</a>
            <Link to="/about" className="hover:text-amber-400 transition-colors">About</Link>
            <Link to="/pricing" className="text-amber-400 hover:text-amber-300 font-extrabold transition-colors">Pricing</Link>
            <Link to="/contact" className="hover:text-amber-400 transition-colors">Contact</Link>
            <Link to="/privacy-policy" className="hover:text-amber-400 transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-amber-400 transition-colors">Terms</Link>
            <Link to="/refund-policy" className="hover:text-amber-400 transition-colors">Refunds</Link>
          </div>

          {/* Auth Actions & Mobile Menu Button */}
          <div className="flex items-center gap-2 sm:gap-3">
            {currentUser ? (
              <Link
                to="/"
                className="flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md shadow-amber-500/20"
              >
                <span>Workspace</span>
                <ArrowRight size={14} />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="hidden sm:inline-block px-3 py-2 text-xs font-bold text-slate-300 hover:text-white transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="flex items-center gap-1.5 px-4 sm:px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs transition-all shadow-lg shadow-amber-500/20"
                >
                  <span>Start Free Trial</span>
                  <ArrowRight size={14} />
                </Link>
              </>
            )}

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-800 bg-slate-900/95 backdrop-blur-xl px-4 py-6 space-y-3 shadow-2xl">
            <div className="flex flex-col space-y-2 text-sm font-semibold text-slate-200">
              <a 
                href="#features" 
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-800 hover:text-amber-400 transition-colors"
              >
                Features
              </a>
              <Link 
                to="/about" 
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-800 hover:text-amber-400 transition-colors"
              >
                About Nayaruvi
              </Link>
              <Link 
                to="/pricing" 
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-amber-400 hover:bg-slate-800 transition-colors font-bold"
              >
                Pricing & Subscription
              </Link>
              <Link 
                to="/contact" 
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-800 hover:text-amber-400 transition-colors"
              >
                Contact Information
              </Link>
              <Link 
                to="/privacy-policy" 
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-800 hover:text-amber-400 transition-colors"
              >
                Privacy Policy
              </Link>
              <Link 
                to="/terms" 
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-800 hover:text-amber-400 transition-colors"
              >
                Terms & Conditions
              </Link>
              <Link 
                to="/refund-policy" 
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-800 hover:text-amber-400 transition-colors"
              >
                Refund / Cancellation Policy
              </Link>
            </div>

            <div className="pt-4 border-t border-slate-800 flex flex-col gap-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-xl border border-slate-700 text-xs font-bold text-slate-200 hover:bg-slate-800"
              >
                Sign In to Workspace
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black shadow-md shadow-amber-500/20"
              >
                Get Started with 14-Day Free Trial
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* 2. Hero Section */}
      <section className="relative pt-20 pb-28 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-amber-500/10 blur-[130px] rounded-full pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 border border-slate-700 text-amber-400 text-xs font-bold mb-8">
            <Sparkles size={14} />
            <span>Multi-Tenant Delivery Challan Software for Growing Businesses</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-[1.1] mb-6">
            Create, Manage and Print Delivery Challans for Your Business —{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-200">
              All in One Place.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
            Whether you are an electrical contractor, manufacturer, machinery supplier, or distributor: register your company, upload your logo, and generate professional A4 delivery challans with isolated tenant security.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-2xl text-sm transition-all shadow-xl shadow-amber-500/20 hover:scale-105 transform"
            >
              <span>Get Started with 14-Day Free Trial</span>
              <ArrowRight size={16} />
            </Link>

            <a
              href="#features"
              className="w-full sm:w-auto px-8 py-4 bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold rounded-2xl text-sm border border-slate-700 transition-all"
            >
              Explore Features
            </a>
          </div>

          <div className="mt-8 flex items-center justify-center gap-6 text-xs text-slate-400 font-semibold">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={16} className="text-emerald-400" />
              <span>No credit card required for trial</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={16} className="text-emerald-400" />
              <span>Strict Firebase tenant isolation</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={16} className="text-emerald-400" />
              <span>Standard A4 vector print layout</span>
            </div>
          </div>
        </div>

        {/* Challan Mockup Preview Graphic */}
        <div className="mt-16 max-w-4xl mx-auto bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl shadow-black/80">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-500/80" />
              <div className="h-3 w-3 rounded-full bg-amber-500/80" />
              <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
              <span className="ml-2 font-mono text-[11px] text-slate-500">app.nayaruvi.com/challans/DC-0001</span>
            </div>
            <span className="font-bold text-amber-400">Live Delivery Challan Render</span>
          </div>

          <div className="bg-white rounded-xl p-6 text-slate-900 mt-4 shadow-inner">
            <div className="flex justify-between items-start border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-28 bg-slate-900 text-white rounded-lg flex items-center justify-center font-black text-amber-400 text-lg">
                  ABC
                </div>
                <div>
                  <div className="font-extrabold text-sm text-slate-900">ABC ELECTRICALS PVT LTD</div>
                  <div className="text-[10px] text-slate-500">Chennai Industrial Estate • GSTIN: 33AAACL1234H1Z1</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-mono font-black text-red-600">DC NO: ABC-0001</div>
                <div className="text-[10px] text-slate-500">Date: 21/10/2026</div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 text-[11px]">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-700 block mb-1">To (Consignee):</span>
                <span className="font-medium text-slate-900">LARSEN & TOUBRO LIMITED<br />Powai Campus, Mumbai - 400072</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex flex-col justify-center">
                <div><span className="font-bold text-slate-700">Vehicle No:</span> <span className="font-mono">TN 01 AB 1234</span></div>
                <div><span className="font-bold text-slate-700">Driver Name:</span> Ramesh K</div>
              </div>
            </div>

            <div className="mt-4 border border-slate-200 rounded-lg overflow-hidden text-[10px]">
              <div className="bg-slate-100 font-bold p-2 grid grid-cols-12 text-slate-700">
                <div className="col-span-1">S.No</div>
                <div className="col-span-6">Product Description</div>
                <div className="col-span-2 text-right">Quantity</div>
                <div className="col-span-3 text-right">Amount (₹)</div>
              </div>
              <div className="p-2 grid grid-cols-12 border-t border-slate-200 text-slate-800">
                <div className="col-span-1">1</div>
                <div className="col-span-6 font-semibold">Automatic Power Factor Correction (APFC) Panel 150 KVAR</div>
                <div className="col-span-2 text-right font-mono">1 nos</div>
                <div className="col-span-3 text-right font-mono font-bold">45,000.00</div>
              </div>
              <div className="p-2 grid grid-cols-12 border-t border-slate-200 text-slate-800">
                <div className="col-span-1">2</div>
                <div className="col-span-6 font-semibold">Capacitor Bank 25 KVAR Heavy Duty</div>
                <div className="col-span-2 text-right font-mono">2 nos</div>
                <div className="col-span-3 text-right font-mono font-bold">25,000.00</div>
              </div>
              <div className="p-2 bg-slate-50 font-bold grid grid-cols-12 border-t border-slate-200 text-slate-900">
                <div className="col-span-7 text-right">TOTAL</div>
                <div className="col-span-2 text-right font-mono">3 nos</div>
                <div className="col-span-3 text-right font-mono text-emerald-700 font-black">₹ 70,000.00</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Features Grid */}
      <section id="features" className="py-24 bg-slate-900/50 border-t border-slate-800 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-black uppercase tracking-widest text-amber-400 mb-2">Engineered for Businesses</h2>
            <h3 className="text-3xl sm:text-4xl font-black text-white">Everything You Need to Issue Delivery Challans</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl hover:border-amber-500/40 transition-all">
              <div className="h-12 w-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4">
                <ShieldCheck size={24} />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Strict Tenant Isolation</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Company A can never view or modify Company B's records. Enforced via production-grade Firestore Security Rules and server-side authorization.
              </p>
            </div>

            <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl hover:border-amber-500/40 transition-all">
              <div className="h-12 w-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4">
                <Layers size={24} />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Company-Specific Numbering</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Configure your custom prefix (e.g. ABC, TEK, XYZ). Concurrency-safe transactions guarantee duplicate numbers are impossible even with multiple staff members.
              </p>
            </div>

            <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl hover:border-amber-500/40 transition-all">
              <div className="h-12 w-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
                <Printer size={24} />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">A4 Print & Vector PDF</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Clean, vector-crisp A4 documents with your uploaded company logo, GSTIN, receiver details, itemized totals, remarks, and authorised signatures.
              </p>
            </div>

            <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl hover:border-amber-500/40 transition-all">
              <div className="h-12 w-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4">
                <Users size={24} />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Role-Based Team Access</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Assign OWNER, ADMIN, STAFF, or VIEWER roles. Staff can create and print challans, while owners retain control over billing, logos, and company profiles.
              </p>
            </div>

            <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl hover:border-amber-500/40 transition-all">
              <div className="h-12 w-12 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center mb-4">
                <RotateCcw size={24} />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Recycle Bin Recovery</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Accidentally deleted a challan? Soft-delete retains it in your company's private recycle bin where it can be restored with a single click.
              </p>
            </div>

            <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl hover:border-amber-500/40 transition-all">
              <div className="h-12 w-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4">
                <Zap size={24} />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Instant Autocomplete Library</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Smart suggestions for customer addresses and product descriptions remember past entries, saving precious time when creating delivery documents.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. How It Works Section */}
      <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8 border-t border-slate-800">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-16">
            <h2 className="text-xs font-black uppercase tracking-widest text-amber-400 mb-2">Simple 3-Step Process</h2>
            <h3 className="text-3xl font-black text-white">How Nayaruvi Works</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center">
              <div className="h-12 w-12 rounded-full bg-amber-500 text-slate-950 font-black text-lg flex items-center justify-center mx-auto mb-4">
                1
              </div>
              <h4 className="text-base font-bold text-white mb-2">Register Company Profile</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Sign up with your business credentials, enter your address, GSTIN, and upload your company letterhead logo.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center">
              <div className="h-12 w-12 rounded-full bg-amber-500 text-slate-950 font-black text-lg flex items-center justify-center mx-auto mb-4">
                2
              </div>
              <h4 className="text-base font-bold text-white mb-2">Configure Sequence</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Select your preferred challan prefix and number format. Atomic counters will manage your sequence automatically.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center">
              <div className="h-12 w-12 rounded-full bg-amber-500 text-slate-950 font-black text-lg flex items-center justify-center mx-auto mb-4">
                3
              </div>
              <h4 className="text-base font-bold text-white mb-2">Generate & Print</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Add products, client details, vehicle numbers, and generate print-ready A4 delivery challans with one click.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Pricing Section */}
      <section id="pricing" className="py-24 bg-slate-900/40 border-t border-slate-800 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-12">
            <h2 className="text-xs font-black uppercase tracking-widest text-amber-400 mb-2">Simple & Transparent</h2>
            <h3 className="text-3xl sm:text-4xl font-black text-white">Choose the Right Plan for Your Business</h3>
            
            {/* Billing toggle */}
            <div className="mt-6 inline-flex items-center gap-2 p-1 bg-slate-900 border border-slate-800 rounded-xl">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  billingCycle === 'monthly' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                Monthly Billing
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  billingCycle === 'yearly' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Annual Billing</span>
                <span className="text-[9px] bg-emerald-500 text-slate-950 px-1.5 py-0.5 rounded font-black">SAVE 17%</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* 14-Day Free Trial */}
            <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Free Trial</div>
                <h4 className="text-2xl font-black text-white mt-1">14-Day Access</h4>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white">₹0</span>
                  <span className="text-xs text-slate-400">/ 14 days</span>
                </div>
                <p className="text-xs text-slate-400 mt-2">Test all features with full cloud sync before subscribing.</p>

                <div className="mt-8 space-y-3 text-xs text-slate-300">
                  <div className="flex items-center gap-2.5"><CheckCircle2 size={16} className="text-emerald-400 shrink-0" /> Full Delivery Challan Creator</div>
                  <div className="flex items-center gap-2.5"><CheckCircle2 size={16} className="text-emerald-400 shrink-0" /> Standard A4 Print & Vector PDF Export</div>
                  <div className="flex items-center gap-2.5"><CheckCircle2 size={16} className="text-emerald-400 shrink-0" /> Dynamic Company Logo & Branding</div>
                  <div className="flex items-center gap-2.5"><CheckCircle2 size={16} className="text-emerald-400 shrink-0" /> Up to 3 Team Members</div>
                </div>
              </div>

              <div className="mt-8">
                <Link
                  to="/register"
                  className="w-full flex items-center justify-center py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-colors"
                >
                  Start 14-Day Free Trial
                </Link>
              </div>
            </div>

            {/* Pro Subscription */}
            <div className="p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-2 border-amber-500/80 shadow-2xl relative flex flex-col justify-between">
              <span className="absolute top-5 right-5 px-3 py-1 bg-amber-500 text-slate-950 font-black text-[10px] uppercase rounded-full tracking-wider">
                Most Popular
              </span>

              <div>
                <div className="text-xs font-extrabold text-amber-400 uppercase tracking-wider">Unlimited Pro</div>
                <h4 className="text-2xl font-black text-white mt-1">
                  {billingCycle === 'monthly' ? 'Monthly Subscription' : 'Annual Subscription'}
                </h4>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white">
                    {billingCycle === 'monthly' ? '₹500' : '₹5,000'}
                  </span>
                  <span className="text-xs text-slate-400">
                    {billingCycle === 'monthly' ? '/ month' : '/ year (2 months free)'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-2">Unlimited delivery challans and team collaboration.</p>

                <div className="mt-8 space-y-3 text-xs text-slate-200">
                  <div className="flex items-center gap-2.5"><CheckCircle2 size={16} className="text-amber-400 shrink-0" /> Unlimited Delivery Challans</div>
                  <div className="flex items-center gap-2.5"><CheckCircle2 size={16} className="text-amber-400 shrink-0" /> Custom Prefix & Atomic Challan Sequences</div>
                  <div className="flex items-center gap-2.5"><CheckCircle2 size={16} className="text-amber-400 shrink-0" /> Recycle Bin with Instant Recovery</div>
                  <div className="flex items-center gap-2.5"><CheckCircle2 size={16} className="text-amber-400 shrink-0" /> Unlimited Team Members & Role Control</div>
                  <div className="flex items-center gap-2.5"><CheckCircle2 size={16} className="text-amber-400 shrink-0" /> Secure Razorpay Subscription Billing</div>
                </div>
              </div>

              <div className="mt-8">
                <Link
                  to="/register"
                  className="w-full flex items-center justify-center py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs transition-all shadow-lg shadow-amber-500/20"
                >
                  Get Started with Pro
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Razorpay Merchant Compliance Hub */}
      <section className="border-t border-slate-800 bg-slate-900/60 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold mb-3 border border-amber-500/20">
              <ShieldCheck size={14} className="text-emerald-400" />
              <span>Razorpay Verified Merchant Policies</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">Trust, Legal & Business Compliance</h2>
            <p className="text-xs text-slate-400 mt-2 max-w-xl mx-auto">
              Transparent commercial terms, payment security standards, and registered Indian entity information.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <Link 
              to="/about"
              className="p-6 rounded-2xl bg-slate-950 border border-slate-800 hover:border-amber-500/60 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="text-amber-400 font-extrabold text-xs uppercase tracking-wider mb-1">Company Story</div>
                <div className="text-white font-bold text-sm group-hover:text-amber-400 transition-colors">About Nayaruvi</div>
                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                  The SaaS platform provider behind modern Indian delivery challan infrastructure.
                </p>
              </div>
              <span className="text-[11px] font-bold text-amber-400 mt-4 flex items-center gap-1">
                Read About Us &rarr;
              </span>
            </Link>

            <Link 
              to="/pricing"
              className="p-6 rounded-2xl bg-slate-950 border border-slate-800 hover:border-amber-500/60 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="text-amber-400 font-extrabold text-xs uppercase tracking-wider mb-1">Subscriptions</div>
                <div className="text-white font-bold text-sm group-hover:text-amber-400 transition-colors">Pricing & Plans</div>
                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                  Transparent INR pricing (₹500/mo or ₹5,000/yr) with 14-day free trial.
                </p>
              </div>
              <span className="text-[11px] font-bold text-amber-400 mt-4 flex items-center gap-1">
                View Plans &rarr;
              </span>
            </Link>

            <Link 
              to="/contact"
              className="p-6 rounded-2xl bg-slate-950 border border-slate-800 hover:border-amber-500/60 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="text-amber-400 font-extrabold text-xs uppercase tracking-wider mb-1">Entity Details</div>
                <div className="text-white font-bold text-sm group-hover:text-amber-400 transition-colors">Contact Information</div>
                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                  Direct phone lines (8925137065 / 9498478894), support email (nayaruvi.official@gmail.com), and inquiry form.
                </p>
              </div>
              <span className="text-[11px] font-bold text-amber-400 mt-4 flex items-center gap-1">
                Contact Support &rarr;
              </span>
            </Link>

            <Link 
              to="/privacy-policy"
              className="p-6 rounded-2xl bg-slate-950 border border-slate-800 hover:border-amber-500/60 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="text-amber-400 font-extrabold text-xs uppercase tracking-wider mb-1">IT Act 2000</div>
                <div className="text-white font-bold text-sm group-hover:text-amber-400 transition-colors">Privacy Policy</div>
                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                  Multi-tenant database isolation, PCI-DSS payment partner notice, and data rights.
                </p>
              </div>
              <span className="text-[11px] font-bold text-amber-400 mt-4 flex items-center gap-1">
                Read Privacy Policy &rarr;
              </span>
            </Link>

            <Link 
              to="/terms"
              className="p-6 rounded-2xl bg-slate-950 border border-slate-800 hover:border-amber-500/60 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="text-amber-400 font-extrabold text-xs uppercase tracking-wider mb-1">User Agreement</div>
                <div className="text-white font-bold text-sm group-hover:text-amber-400 transition-colors">Terms & Conditions</div>
                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                  Commercial SaaS terms, recurring Razorpay billing, and Chennai jurisdiction.
                </p>
              </div>
              <span className="text-[11px] font-bold text-amber-400 mt-4 flex items-center gap-1">
                Read Terms &rarr;
              </span>
            </Link>

            <Link 
              to="/refund-policy"
              className="p-6 rounded-2xl bg-slate-950 border border-slate-800 hover:border-amber-500/60 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="text-amber-400 font-extrabold text-xs uppercase tracking-wider mb-1">Razorpay Standard</div>
                <div className="text-white font-bold text-sm group-hover:text-amber-400 transition-colors">Refund Policy</div>
                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                  7-day money-back guarantee, cancellation steps, and 5-7 business day refund timeline.
                </p>
              </div>
              <span className="text-[11px] font-bold text-amber-400 mt-4 flex items-center gap-1">
                View Refund Terms &rarr;
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* 7. Full Public Footer */}
      <PublicFooter />
    </div>
  );
}
