import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Shield, 
  FileText, 
  RefreshCw, 
  Mail, 
  Phone, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Send, 
  ShieldCheck, 
  Building2, 
  Lock,
  CreditCard,
  ExternalLink,
  Menu,
  X,
  Sparkles,
  ArrowRight,
  Users
} from 'lucide-react';

/**
 * Universal Public Header for Compliance & Marketing Pages
 */
export function PublicNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 font-black text-base shadow-md shadow-amber-500/20">
            N
          </div>
          <div>
            <span className="text-lg font-black text-white tracking-tight block leading-none">NAYARUVI</span>
            <span className="text-[9px] text-amber-400 font-extrabold uppercase tracking-widest">Delivery Challan SaaS</span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-5 lg:gap-6 text-xs font-bold text-slate-300">
          <Link to="/" className="hover:text-amber-400 transition-colors">Home</Link>
          <Link to="/about" className="hover:text-amber-400 transition-colors">About</Link>
          <Link to="/pricing" className="hover:text-amber-400 transition-colors">Pricing</Link>
          <Link to="/contact" className="hover:text-amber-400 transition-colors">Contact Us</Link>
          <Link to="/terms" className="hover:text-amber-400 transition-colors">Terms</Link>
          <Link to="/privacy-policy" className="hover:text-amber-400 transition-colors">Privacy</Link>
          <Link to="/refund-policy" className="hover:text-amber-400 transition-colors">Refund Policy</Link>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/login"
            className="hidden sm:inline-block px-3.5 py-2 text-xs font-bold text-slate-300 hover:text-white transition-colors"
          >
            Sign In
          </Link>
          <Link
            to="/register"
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md shadow-amber-500/10"
          >
            Start Free Trial
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-900/95 backdrop-blur-xl px-4 py-5 space-y-2.5">
          <Link to="/" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 rounded-lg">Home</Link>
          <Link to="/about" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 rounded-lg">About Nayaruvi</Link>
          <Link to="/pricing" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-xs font-bold text-amber-400 hover:bg-slate-800 rounded-lg">Pricing & Plans</Link>
          <Link to="/contact" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 rounded-lg">Contact Us</Link>
          <Link to="/terms" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 rounded-lg">Terms & Conditions</Link>
          <Link to="/privacy-policy" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 rounded-lg">Privacy Policy</Link>
          <Link to="/refund-policy" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 rounded-lg">Refund Policy</Link>
          <div className="pt-2 border-t border-slate-800">
            <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="block text-center py-2 text-xs font-bold text-slate-300 hover:text-white">Sign In</Link>
          </div>
        </div>
      )}
    </header>
  );
}

/**
 * Universal Public Footer for Razorpay Merchant Compliance
 */
export function PublicFooter() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 text-slate-400 text-xs py-14 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
        {/* Brand & Entity */}
        <div className="space-y-4 md:col-span-1">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 font-black text-sm">
              N
            </div>
            <div>
              <div className="text-sm font-black text-white">NAYARUVI DELIVERY CHALLAN</div>
              <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Nayaruvi Technologies</div>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Multi-tenant SaaS delivery challan management platform engineered for electrical contractors, manufacturers, suppliers, and distributors across India.
          </p>
        </div>

        {/* Quick Links */}
        <div className="space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-white">Platform</h4>
          <ul className="space-y-2 text-xs">
            <li><Link to="/" className="hover:text-amber-400 transition-colors">Home</Link></li>
            <li><Link to="/about" className="hover:text-amber-400 transition-colors">About Us</Link></li>
            <li><Link to="/pricing" className="hover:text-amber-400 transition-colors">Pricing & Plans</Link></li>
            <li><Link to="/login" className="hover:text-amber-400 transition-colors">Company Login</Link></li>
            <li><Link to="/register" className="hover:text-amber-400 transition-colors">Register Company</Link></li>
          </ul>
        </div>

        {/* Legal & Compliance (Razorpay Mandatory) */}
        <div className="space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-white">Legal & Compliance</h4>
          <ul className="space-y-2 text-xs">
            <li><Link to="/terms" className="hover:text-amber-400 transition-colors">Terms & Conditions</Link></li>
            <li><Link to="/privacy-policy" className="hover:text-amber-400 transition-colors">Privacy Policy</Link></li>
            <li><Link to="/refund-policy" className="hover:text-amber-400 transition-colors">Refund & Cancellation Policy</Link></li>
            <li><Link to="/contact" className="hover:text-amber-400 transition-colors">Contact Information</Link></li>
          </ul>
        </div>

        {/* Contact & Support (Phone & Email Only - No Physical Address) */}
        <div className="space-y-3 text-xs">
          <h4 className="text-xs font-black uppercase tracking-wider text-white">Contact & Support</h4>
          <div className="space-y-2 pt-1 text-[11px]">
            <div className="flex items-center gap-2">
              <Phone size={13} className="text-amber-400 shrink-0" />
              <span className="font-semibold text-slate-200">8925137065 / 9498478894</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail size={13} className="text-amber-400 shrink-0" />
              <a href="mailto:nayaruvi.official@gmail.com" className="font-semibold text-amber-400 hover:underline">
                nayaruvi.official@gmail.com
              </a>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={13} className="text-amber-400 shrink-0" />
              <span>Mon – Sat: 9:30 AM – 6:30 PM IST</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400">
        <div>
          © {new Date().getFullYear()} Nayaruvi Technologies / Nayaruvi Delivery Challan. All rights reserved.
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
          <ShieldCheck size={14} className="text-emerald-400" />
          <span>Payments securely processed by Razorpay (PCI-DSS Level 1 Compliant)</span>
        </div>
      </div>
    </footer>
  );
}

/**
 * 1. PRIVACY POLICY PAGE
 * Comprehensive, Indian IT Act 2000 & SPDI Rules compliant
 */
export function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
      <PublicNavbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-10">
        <div className="border-b border-slate-800 pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold mb-3 border border-amber-500/20">
            <Shield size={13} />
            <span>Official Legal Policy</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Privacy Policy</h1>
          <p className="text-xs text-slate-400 mt-2">
            Effective Date: October 24, 2026 | Last Updated: October 2026
          </p>
        </div>

        <div className="space-y-8 text-sm text-slate-300 leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-lg font-black text-white">1. Introduction & Scope</h2>
            <p>
              This Privacy Policy applies to the Nayaruvi Delivery Challan web application operated by <strong>Nayaruvi Technologies</strong> ("Company", "we", "our", or "us").
            </p>
            <p>
              We are committed to protecting your privacy and ensuring transparency in how we collect, store, handle, and safeguard your personal and business data in compliance with the Information Technology Act, 2000, and the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black text-white">2. Multi-Tenant Architectural Data Isolation</h2>
            <p>
              Nayaruvi is designed strictly as a multi-tenant SaaS application. Every registered business operates in a completely isolated logical partition bound by a unique Company ID (<code className="bg-slate-900 text-amber-400 px-1 py-0.5 rounded text-xs font-mono">companyId</code>).
            </p>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-white">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <span>Strict Cross-Tenant Data Partitioning Guarantee</span>
              </div>
              <p className="text-slate-400">
                Company A cannot view, query, update, download, or access delivery challans, customer records, or settings belonging to Company B under any circumstances. Access control is enforced at the database authorization level.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black text-white">3. Information We Collect</h2>
            <p>We collect information necessary to provide delivery challan management and subscription services:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-300">
              <li><strong>Account Information:</strong> Name, work email address, telephone number, login credentials, and user role.</li>
              <li><strong>Company Profile:</strong> Registered company name, display trade name, GSTIN (Goods and Services Tax Identification Number), registered physical address, business email, and phone numbers.</li>
              <li><strong>Company Branding Assets:</strong> Uploaded business logo images, custom millimeter dimensions (width/height), and document footer slogans.</li>
              <li><strong>Document & Transactional Records:</strong> Delivery challan numbers, dates, consignee/customer addresses, vehicle numbers, product line items, quantities, rates, and amounts.</li>
              <li><strong>Payment & Billing Data:</strong> Transaction ID, order ID, subscription plan, billing dates, and invoices generated by our payment partner Razorpay. We do NOT store your credit card, debit card, UPI PIN, or bank passwords on our servers.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black text-white">4. Payment Processing with Razorpay</h2>
            <p>
              We integrate with <strong>Razorpay Software Private Limited</strong> ("Razorpay") as our third-party payment gateway for processing subscription fees. When you pay for our services:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-300">
              <li>Your payment details are transmitted directly to Razorpay through 128-bit SSL encrypted channels.</li>
              <li>Razorpay is certified under <strong>PCI-DSS Level 1</strong> (Payment Card Industry Data Security Standard), the highest international standard for payment security.</li>
              <li>Razorpay’s collection and processing of your payment credentials are governed by Razorpay's Privacy Policy at <a href="https://razorpay.com/privacy/" target="_blank" rel="noopener noreferrer" className="text-amber-400 underline inline-flex items-center gap-1">razorpay.com/privacy <ExternalLink size={11} /></a>.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black text-white">5. How We Use Your Information</h2>
            <p>Your information is used strictly to:</p>
            <ul className="list-disc pl-5 space-y-1 text-xs text-slate-300">
              <li>Provision and maintain your company’s dedicated workspace.</li>
              <li>Automatically populate company letterheads on delivery challan PDFs and print layouts.</li>
              <li>Authenticate authorized staff members and maintain audit logs.</li>
              <li>Process subscription payments and issue GST tax invoices.</li>
              <li>Provide customer support, bug fixes, and critical system notifications.</li>
              <li>Comply with statutory tax and regulatory legal requirements under Indian law.</li>
            </ul>
            <p className="text-xs font-bold text-amber-400">
              We NEVER sell, rent, trade, or share your company’s commercial data with third-party marketers or advertisers.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black text-white">6. Data Retention & Deletion</h2>
            <p>
              We retain your data for as long as your workspace remains active. When you delete a delivery challan, it is moved to your dedicated Recycle Bin, where you can restore it or permanently erase it at your choice. If you wish to permanently delete your company account and all associated documents, submit a written request to <a href="mailto:nayaruvi.official@gmail.com" className="text-amber-400 font-bold">nayaruvi.official@gmail.com</a>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black text-white">7. Grievance Redressal Officer</h2>
            <p>
              In accordance with Information Technology Act, 2000 and rules made there under, the name and contact details of the Grievance Officer are provided below:
            </p>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5 text-xs">
              <div className="font-bold text-white">Mr. M. Manikandan</div>
              <div className="text-slate-400">Grievance Redressal Officer</div>
              <div className="text-slate-400">Nayaruvi Technologies / Nayaruvi Delivery Challan</div>
              <div className="text-amber-400 font-bold">Email: nayaruvi.official@gmail.com</div>
              <div className="text-slate-300">Phone: 8925137065 / 9498478894</div>
            </div>
          </section>
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}

/**
 * 2. TERMS & CONDITIONS PAGE
 * Commercial SaaS terms with Razorpay billing & Chennai jurisdiction
 */
export function TermsOfService() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
      <PublicNavbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-10">
        <div className="border-b border-slate-800 pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold mb-3 border border-amber-500/20">
            <FileText size={13} />
            <span>Customer Agreement</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Terms and Conditions</h1>
          <p className="text-xs text-slate-400 mt-2">
            Last Updated: October 2026 | Applicable to all registered business users
          </p>
        </div>

        <div className="space-y-8 text-sm text-slate-300 leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-lg font-black text-white">1. Agreement to Terms</h2>
            <p>
              These Terms and Conditions constitute a legally binding agreement made between you, whether personally or on behalf of an entity ("Customer", "User", "you"), and <strong>Nayaruvi Technologies</strong> ("Company", "we", "us", or "our"), concerning your access to and use of the <strong>Nayaruvi Delivery Challan</strong> SaaS website and software.
            </p>
            <p>
              By registering an account or accessing the website, you acknowledge that you have read, understood, and agreed to be bound by all of these Terms and Conditions.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black text-white">2. Services Offered</h2>
            <p>
              Nayaruvi provides an online multi-tenant SaaS application that allows registered businesses to generate, configure, print, export to vector PDF, and manage commercial delivery challans with dynamic company letterheads, customer lists, and atomic serial numbering.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black text-white">3. User Accounts & Security</h2>
            <p>
              When you create an account, you must provide accurate and complete registration data. You are solely responsible for maintaining the confidentiality of your account password and access tokens. You agree to notify us immediately of any unauthorized use of your account.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black text-white">4. Subscriptions, Fees & Payment Processing</h2>
            <div className="space-y-2 text-xs">
              <p>
                <strong>4.1 Free Trial:</strong> We offer a 14-day free trial for new company registrations. No payment information is required to access the trial.
              </p>
              <p>
                <strong>4.2 Subscription Plans:</strong> Following or during the trial, you may choose a paid subscription (e.g. Pro Monthly at ₹500/month or Pro Annual at ₹5,000/year).
              </p>
              <p>
                <strong>4.3 Currency & Taxes:</strong> All fees are stated in Indian Rupees (INR ₹). Applicable Goods and Services Tax (GST) will be charged in accordance with Indian tax laws. A valid GST tax invoice is issued upon payment.
              </p>
              <p>
                <strong>4.4 Payment Gateway:</strong> Payments are processed via <strong>Razorpay</strong>. By subscribing, you authorize Razorpay to charge your selected payment method (UPI, Card, NetBanking) on a recurring basis as per your chosen billing frequency until cancelled.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black text-white">5. Commercial Content & GST Responsibility</h2>
            <p>
              You retain full ownership of all delivery challan records, customer data, and logos entered into your workspace. You are solely responsible for ensuring that all information, including HSN codes, item descriptions, consignee details, and vehicle registration numbers, complies with GST rules and transport regulations under Section 31 of the CGST Act, 2017.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black text-white">6. Acceptable Use Policy</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 space-y-1 text-xs text-slate-300">
              <li>Attempt to bypass tenant boundaries or access records belonging to another company.</li>
              <li>Use the software for fraudulent document generation or fictitious billing.</li>
              <li>Reverse engineer, decompile, or copy the software code or layout without authorization.</li>
              <li>Introduce viruses, malware, or harmful scripts to the application.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black text-white">7. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by applicable law, Nayaruvi Technologies / Nayaruvi Delivery Challan shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or loss of profits or revenues, arising out of your use or inability to use the application. Our aggregate liability shall not exceed the subscription fees actually paid by you during the twelve (12) months preceding the claim.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black text-white">8. Governing Law & Jurisdiction</h2>
            <p>
              These Terms and Conditions shall be governed by and construed in accordance with the laws of India. Any legal dispute, controversy, or claim arising out of or relating to these Terms shall be subject to the exclusive jurisdiction of the competent courts located in <strong>Chennai, Tamil Nadu, India</strong>.
            </p>
          </section>
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}

/**
 * 3. REFUND & CANCELLATION POLICY
 * Mandatory Razorpay compliant refund/cancellation statement
 */
export function RefundPolicy() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
      <PublicNavbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-10">
        <div className="border-b border-slate-800 pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold mb-3 border border-amber-500/20">
            <RefreshCw size={13} />
            <span>Billing Compliance</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Refund & Cancellation Policy</h1>
          <p className="text-xs text-slate-400 mt-2">
            Last Updated: October 2026 | Dedicated Policy for Razorpay Subscriptions
          </p>
        </div>

        <div className="space-y-8 text-sm text-slate-300 leading-relaxed">
          <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-1.5">
            <div className="font-bold text-white text-sm flex items-center gap-2">
              <ShieldCheck size={18} className="text-amber-400" />
              <span>Customer Satisfaction & Transparent Cancellation Guarantee</span>
            </div>
            <p>
              We believe in complete transparency. Our customers have the freedom to test the software during the 14-day free trial without entering card details, cancel paid subscriptions at any time with a single click, and request refunds under our fair usage policy.
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-lg font-black text-white">1. 14-Day Free Trial (No Risk)</h2>
            <p>
              Every new company account begins with a 14-day complimentary trial. No payment method or credit card is required upfront. You have full access to generate delivery challans, test printing, customize your branding, and verify suitability before any payment is made.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black text-white">2. Subscription Cancellation Policy</h2>
            <ul className="list-disc pl-5 space-y-2 text-xs text-slate-300">
              <li>
                <strong>How to Cancel:</strong> You can cancel your subscription at any time by navigating to <strong>Settings &rarr; Subscription / Billing</strong> inside your workspace, or by sending an email with your registered company name to <a href="mailto:nayaruvi.official@gmail.com" className="text-amber-400 font-bold">nayaruvi.official@gmail.com</a>.
              </li>
              <li>
                <strong>Cancellation Effective Date:</strong> Upon cancellation, your subscription will remain active until the end of your current paid billing period (e.g., until the end of the current month or annual cycle).
              </li>
              <li>
                <strong>No Cancellation Fees:</strong> There are no cancellation penalties, termination charges, or hidden administrative fees.
              </li>
              <li>
                <strong>Data Retention Post-Cancellation:</strong> Your past delivery challans and company information remain preserved in encrypted storage so you can log in, view historical records, and export documents anytime.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black text-white">3. Refund Policy & Eligibility</h2>
            <p>
              We provide a <strong>7-Day Money-Back Guarantee</strong> for all first-time paid subscriptions:
            </p>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
              <div className="font-bold text-white">Refunds are approved under the following conditions:</div>
              <ul className="list-disc pl-5 space-y-1 text-slate-300">
                <li>You experienced a critical technical defect or service outage that our technical team was unable to resolve within 48 hours.</li>
                <li>You were inadvertently charged twice for the same billing cycle due to a technical glitch.</li>
                <li>You submitted a refund request in writing within 7 calendar days of your initial subscription purchase.</li>
              </ul>
            </div>
            <p className="text-xs text-slate-400">
              Refund requests submitted after 7 days from the initial payment date, or renewal charges where cancellation was not requested prior to the renewal date, are non-refundable.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black text-white">4. Refund Processing Timeline (Razorpay Mandatory)</h2>
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 text-xs space-y-2">
              <div className="font-bold text-white flex items-center gap-2 text-sm">
                <Clock size={16} className="text-emerald-400" />
                <span>5 to 7 Business Days Processing Window</span>
              </div>
              <p>
                Once your refund request is received and verified by our billing team, the refund will be initiated immediately. 
                <strong> The refund amount will be credited back to the customer's original payment method (Bank Account, Credit/Debit Card, or UPI) within 5 to 7 business days via the Razorpay payment gateway.</strong>
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black text-white">5. How to Initiate a Refund Request</h2>
            <p>To request a refund, please send an email to our billing team with the following details:</p>
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl font-mono text-xs text-slate-300 space-y-1">
              <div>To: <strong>nayaruvi.official@gmail.com</strong></div>
              <div>Subject: Refund Request - [Your Company Name]</div>
              <div>Body: Please include:</div>
              <div>1. Registered Business Name & Email Address</div>
              <div>2. Razorpay Payment ID or Invoice Number</div>
              <div>3. Reason for refund request</div>
            </div>
            <p className="text-xs text-slate-400">
              Our support team will acknowledge your request within 24 business hours and notify you once the refund has been initiated through Razorpay.
            </p>
          </section>
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}

/**
 * 4. CONTACT INFORMATION PAGE
 * Physical address, phone numbers, contact form, and Grievance Officer details
 */
export function ContactPage() {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    companyName: '',
    subject: 'General Inquiry',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    // Simulate inquiry submission
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
      <PublicNavbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold mb-3 border border-amber-500/20">
            <Phone size={13} />
            <span>Official Business Details</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Contact Information</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            Have questions about Nayaruvi Delivery Challan, subscriptions, or need technical assistance? Reach out to our team.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Official Contact Details */}
          <div className="space-y-4">
            <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <Building2 size={20} />
              </div>
              <h3 className="font-bold text-white text-base">Operating & Legal Entity</h3>
              <div className="text-xs text-slate-200 font-bold">NAYARUVI TECHNOLOGIES</div>
              <p className="text-xs text-slate-400">Product: Nayaruvi Delivery Challan SaaS</p>
            </div>

            <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <Phone size={20} />
              </div>
              <h3 className="font-bold text-white text-base">Phone Numbers</h3>
              <div className="space-y-1.5 text-xs">
                <div><span className="text-slate-400">Direct Line 1:</span> <a href="tel:8925137065" className="font-bold text-white hover:text-amber-400 transition-colors ml-1">8925137065</a></div>
                <div><span className="text-slate-400">Direct Line 2:</span> <a href="tel:9498478894" className="font-bold text-white hover:text-amber-400 transition-colors ml-1">9498478894</a></div>
              </div>
            </div>

            <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <Mail size={20} />
              </div>
              <h3 className="font-bold text-white text-base">Official Email Support</h3>
              <div className="space-y-1 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px] mb-1">Customer Support & Inquiries:</span>
                  <a href="mailto:nayaruvi.official@gmail.com" className="font-bold text-amber-400 hover:underline text-sm break-all">
                    nayaruvi.official@gmail.com
                  </a>
                </div>
              </div>
            </div>

            <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-2 text-xs">
              <div className="flex items-center gap-2 text-slate-300 font-bold">
                <Clock size={16} className="text-amber-400 shrink-0" />
                <span>Working Hours</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                Monday – Saturday: 9:30 AM – 6:30 PM IST<br />
                (Closed Sundays & National Holidays)
              </p>
            </div>
          </div>

          {/* Right Column: Interactive Contact Form & Grievance Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="p-8 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl">
              <h2 className="text-xl font-black text-white mb-1">Send Us a Message</h2>
              <p className="text-xs text-slate-400 mb-6">Our response time is typically within 2 to 4 business hours.</p>

              {submitted ? (
                <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-center space-y-3">
                  <CheckCircle2 size={40} className="mx-auto text-emerald-400" />
                  <h3 className="text-base font-bold text-white">Thank You for Reaching Out!</h3>
                  <p className="text-xs text-slate-300 max-w-md mx-auto">
                    We have received your message. A customer representative from Nayaruvi will get back to you shortly at <strong>{form.email}</strong>.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSubmitted(false);
                      setForm({ fullName: '', email: '', phone: '', companyName: '', subject: 'General Inquiry', message: '' });
                    }}
                    className="mt-3 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold uppercase text-slate-300 block mb-1">Your Full Name *</label>
                      <input
                        type="text"
                        required
                        value={form.fullName}
                        onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                        placeholder="e.g. Ramesh Kumar"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase text-slate-300 block mb-1">Email Address *</label>
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="e.g. ramesh@company.com"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold uppercase text-slate-300 block mb-1">Phone Number *</label>
                      <input
                        type="tel"
                        required
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        placeholder="e.g. +91 98765 43210"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase text-slate-300 block mb-1">Company / Organization</label>
                      <input
                        type="text"
                        value={form.companyName}
                        onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                        placeholder="e.g. Surya Electricals Pvt Ltd"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase text-slate-300 block mb-1">Inquiry Topic</label>
                    <select
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-amber-500 focus:outline-none"
                    >
                      <option value="General Inquiry">General Product Inquiry</option>
                      <option value="Subscription & Billing">Subscription & Billing (Razorpay)</option>
                      <option value="Custom Delivery Challan Template">Custom Delivery Challan Template</option>
                      <option value="Enterprise / Multi-Branch Plan">Enterprise / Multi-Branch Plan</option>
                      <option value="Technical Support">Technical Support & Bug Report</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase text-slate-300 block mb-1">Message / Details *</label>
                    <textarea
                      required
                      rows={4}
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      placeholder="Please describe how we can assist your business..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-amber-500 focus:outline-none resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full sm:w-auto px-8 py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md shadow-amber-500/10 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Send size={14} />
                    <span>{loading ? 'Sending Message...' : 'Submit Inquiry'}</span>
                  </button>
                </form>
              )}
            </div>

            {/* Grievance Redressal Card (RBI & Consumer Protection Requirement) */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2 text-xs">
              <h3 className="font-bold text-white flex items-center gap-2">
                <ShieldCheck size={16} className="text-amber-400" />
                <span>Grievance Redressal & Customer Escalation</span>
              </h3>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Under Indian IT & Consumer Protection Rules, for any unresolved billing, payment discrepancy, or data privacy complaints, you may directly escalate to our appointed Grievance Officer:
              </p>
              <div className="pt-2 text-[11px] text-slate-300 space-y-0.5">
                <div><strong>Officer:</strong> Mr. M. Manikandan (Grievance Redressal Officer)</div>
                <div><strong>Email:</strong> <a href="mailto:nayaruvi.official@gmail.com" className="text-amber-400 font-bold">nayaruvi.official@gmail.com</a></div>
                <div><strong>Direct Contact:</strong> <span className="font-bold text-white">8925137065 / 9498478894</span></div>
                <div><strong>Turnaround Time:</strong> Acknowledged within 48 hours and resolved within 30 days.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}

/**
 * 5. ABOUT US PAGE
 * Story, Mission, Architecture, and Corporate Details of Nayaruvi Delivery Challan
 */
export function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
      <PublicNavbar />
      
      {/* Hero */}
      <section className="relative pt-16 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden border-b border-slate-800">
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold mb-6 border border-amber-500/20">
            <Sparkles size={14} />
            <span>About Nayaruvi Technologies</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight mb-6">
            Building Modern Delivery Challan Infrastructure for{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-200">
              Indian Commerce.
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-3xl mx-auto leading-relaxed">
            <strong>Nayaruvi Delivery Challan</strong> is a dedicated multi-tenant cloud platform created by <strong>Nayaruvi Technologies</strong>. We empower Indian businesses — including electrical contractors, equipment manufacturers, machinery suppliers, and distributors — to generate, track, and print statutory delivery challans with bulletproof data isolation.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
        {/* Story & Philosophy */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
            <div className="inline-flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
              <Building2 size={14} />
              <span>Our Story</span>
            </div>
            <h2 className="text-2xl font-black text-white">Why We Built Nayaruvi</h2>
            <p>
              In traditional Indian manufacturing and contracting, goods dispatch often relied on physical paper challan books or error-prone spreadsheet templates. This created duplicate challan serial numbers, mismatched tax records, audit disputes under GST Section 31, and unprofessional letterheads.
            </p>
            <p>
              We established <strong>Nayaruvi Technologies</strong> in Chennai, Tamil Nadu, to engineer a single unified platform where businesses can set up their company profile, upload their branding, and issue legal delivery challans within seconds.
            </p>
            <p className="text-xs text-amber-300/90 font-medium bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
              💡 <em>Platform Note:</em> While independent companies (such as TekPower Energy Solutions and numerous other industrial suppliers) run their daily challan dispatches on our software, <strong>Nayaruvi Technologies</strong> is the SaaS platform operator and intellectual property owner.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-lg font-black text-white">Platform At A Glance</h3>
            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Software Classification:</span>
                <span className="font-bold text-white">Multi-Tenant B2B SaaS</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Headquarters:</span>
                <span className="font-bold text-white">Chennai, Tamil Nadu, India</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">GST Compliance:</span>
                <span className="font-bold text-emerald-400">CGST Act 2017 Section 31</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Payment Gateway:</span>
                <span className="font-bold text-amber-400">Razorpay (PCI-DSS Level 1)</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Standard Pricing:</span>
                <span className="font-bold text-white">₹500 / Month (14-Day Free Trial)</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Pillars */}
        <div className="space-y-8">
          <div className="text-center max-w-xl mx-auto">
            <h2 className="text-2xl font-black text-white">Our 4 Core Engineering Principles</h2>
            <p className="text-xs text-slate-400 mt-2">Every line of code in Nayaruvi is written around these guarantees.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-black">
                1
              </div>
              <h3 className="font-bold text-white text-sm">Tenant Isolation</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Zero cross-tenant leakage. Every subscribing company operates in a strict, isolated partition keyed by Company ID.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-black">
                2
              </div>
              <h3 className="font-bold text-white text-sm">Statutory Accuracy</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Built-in HSN/SAC code tracking, GSTIN validation, vehicle consignments, and multi-copy printing (Original, Duplicate, Triplicate).
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-black">
                3
              </div>
              <h3 className="font-bold text-white text-sm">Precision Branding</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Companies can scale and position their logo in exact millimeters for crisp, publication-grade A4 PDF exports.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-black">
                4
              </div>
              <h3 className="font-bold text-white text-sm">Fair & Honest Pricing</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                14 days full access for ₹0 with zero card requirement, followed by transparent ₹500/month subscriptions through Razorpay.
              </p>
            </div>
          </div>
        </div>

        {/* Corporate Details */}
        <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-6">
            <div>
              <div className="text-xs font-extrabold text-amber-400 uppercase tracking-wider">Corporate Entity Information</div>
              <h3 className="text-xl font-black text-white mt-1">NAYARUVI TECHNOLOGIES</h3>
              <p className="text-xs text-slate-400 mt-1">Provider of Nayaruvi Delivery Challan Cloud Software</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs text-slate-300">
            <div className="space-y-1.5">
              <div className="text-slate-400 font-bold uppercase text-[10px]">Direct Phone Lines</div>
              <div>Primary Line: <a href="tel:8925137065" className="font-bold text-white hover:text-amber-400 transition-colors">8925137065</a></div>
              <div>Secondary Line: <a href="tel:9498478894" className="font-bold text-white hover:text-amber-400 transition-colors">9498478894</a></div>
            </div>

            <div className="space-y-1.5">
              <div className="text-slate-400 font-bold uppercase text-[10px]">Official Email Support</div>
              <div>Inquiries: <a href="mailto:nayaruvi.official@gmail.com" className="font-bold text-amber-400 hover:underline break-all">nayaruvi.official@gmail.com</a></div>
              <div>Turnaround: <span className="text-slate-300">Within 2 to 4 hours</span></div>
            </div>

            <div className="space-y-1.5">
              <div className="text-slate-400 font-bold uppercase text-[10px]">Operating Hours</div>
              <div>Hours: <span className="text-slate-300 font-bold">Mon – Sat (9:30 AM – 6:30 PM IST)</span></div>
              <div className="text-slate-400">Digital-First Multi-Tenant SaaS Platform</div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck size={16} className="text-emerald-400" />
              <span>Statutory Merchant Verification for Razorpay Gateway Integration</span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/pricing"
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs transition-all shadow-md shadow-amber-500/20"
              >
                View Plans & Pricing
              </Link>
              <Link
                to="/contact"
                className="px-5 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-white font-bold text-xs transition-colors"
              >
                Contact Our Team
              </Link>
            </div>
          </div>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}
