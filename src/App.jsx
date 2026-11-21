import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Menu, Loader2 } from 'lucide-react';

// Context
import { AuthProvider, useAuth } from './context/AuthContext';

// Components
import Sidebar from './components/Sidebar';
import ChallanPreview from './components/ChallanPreview';
import SubscriptionModal from './components/SubscriptionModal';
import SubscriptionAlertBanner from './components/SubscriptionAlertBanner';
import SubscriptionLockOverlay from './components/SubscriptionLockOverlay';

// Pages
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import NewChallan from './pages/NewChallan';
import Challans from './pages/Challans';
import ChallanDetails from './pages/ChallanDetails';
import Deliveries from './pages/Deliveries';
import TransportHub from './pages/TransportHub';
import ReturnableGoods from './pages/ReturnableGoods';
import Customers from './pages/Customers';
import CustomerDetails from './pages/CustomerDetails';
import Products from './pages/Products';
import Inventory from './pages/Inventory';
import Reports from './pages/Reports';
import Branches from './pages/Branches';
import TeamManagement from './pages/TeamManagement';
import AuditLogs from './pages/AuditLogs';
import SubscriptionBilling from './pages/SubscriptionBilling';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Register from './pages/Register';
import AcceptInvite from './pages/AcceptInvite';
import Onboarding from './pages/Onboarding';
import RecycleBin from './pages/RecycleBin';
import PricingPage from './pages/PricingPage';
import { PrivacyPolicy, TermsOfService, RefundPolicy, ContactPage, AboutPage } from './pages/PublicPages';

// Utilities
import { createChallan, updateChallan } from './utils/storage';
import { downloadChallanPDF } from './utils/pdfGenerator';
import { defaultCompanyDetails } from './data/sampleData';

// Route Guard component
function RequireAuth({ children, allowedRoles }) {
  const { currentUser, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900 text-white font-sans">
        <Loader2 className="animate-spin text-amber-500" size={32} />
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, currentCompany, isStaff, isAdmin, role, logout } = useAuth();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [printingChallan, setPrintingChallan] = useState(null);
  const [printOptions, setPrintOptions] = useState({ paperSize: 'a4', copyType: 'original' });
  const [isPdfProcessing, setIsPdfProcessing] = useState(false);

  // Close mobile sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location]);

  // Compute dynamic company letterhead details from active tenant
  const companyLetterhead = currentCompany ? {
    companyName: currentCompany.displayName || currentCompany.legalName,
    address: `${currentCompany.address || ''}${currentCompany.city ? `,\n${currentCompany.city}` : ''}${currentCompany.state ? `, ${currentCompany.state}` : ''}${currentCompany.pincode ? ` - ${currentCompany.pincode}` : ''}`,
    gstNumber: currentCompany.gstin || '',
    mobileNumber: currentCompany.businessPhone || '',
    phoneNumber: currentCompany.businessPhone || '',
    footerTagline: currentCompany.footerTagline || 'Thank you for your business',
    logoUrl: currentCompany.logoUrl || null,
    logoSize: currentCompany.logoSize || 'medium',
    logoWidth: currentCompany.logoWidth || 46,
    logoHeight: currentCompany.logoHeight || 21,
    lockAspectRatio: currentCompany.lockAspectRatio !== undefined ? currentCompany.lockAspectRatio : true,
    email: currentCompany.businessEmail || ''
  } : defaultCompanyDetails;

  // Save/Update handler
  const handleSaveChallan = async (formData, id, printAfterSave) => {
    let savedChallan;
    if (id) {
      savedChallan = await updateChallan(id, formData);
    } else {
      savedChallan = await createChallan(formData);
    }

    if (printAfterSave) {
      setPrintingChallan(savedChallan);
      setTimeout(() => {
        window.print();
        setPrintingChallan(null);
        navigate(`/view/${savedChallan.id}`);
      }, 150);
    } else {
      navigate(`/view/${savedChallan.id}`);
    }
  };

  // Direct Print Trigger
  const triggerDirectPrint = (challan, options = {}) => {
    setPrintOptions({
      paperSize: options?.paperSize || 'a4',
      copyType: options?.copyType || 'original'
    });
    setPrintingChallan(challan);
    setTimeout(() => {
      window.print();
      setPrintingChallan(null);
    }, 150);
  };

  // Direct PDF Download Trigger
  const triggerPdfDownload = async (challan) => {
    setIsPdfProcessing(true);
    try {
      await downloadChallanPDF(challan, companyLetterhead);
    } catch (error) {
      console.error("PDF Download failed:", error);
      alert("An error occurred while generating the PDF. Please try again.");
    } finally {
      setIsPdfProcessing(false);
    }
  };

  return (
    <div className="flex print:block h-screen print:h-auto print:overflow-visible overflow-hidden bg-slate-50 print:bg-white text-slate-800 font-sans">
      {/* 1. Sidebar Component */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        onOpenSubscription={() => setIsSubscriptionModalOpen(true)}
      />

      {/* 2. Main Content Frame */}
      <div className={`flex-1 flex flex-col print:block min-w-0 overflow-hidden print:overflow-visible ${printingChallan ? 'print:hidden' : ''}`}>
        {/* Mobile Header bar */}
        <header className="lg:hidden shrink-0 flex items-center justify-between px-6 py-4 bg-[#1e293b] text-white shadow-md print:hidden">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 hover:bg-slate-800 rounded transition-colors cursor-pointer"
              aria-label="Open sidebar menu"
            >
              <Menu size={20} />
            </button>
            <span className="text-sm font-black text-amber-400">NAYARUVI</span>
          </div>
          <div className="text-xs text-slate-400 font-semibold truncate max-w-[150px]">
            {currentCompany?.displayName || "Workspace"}
          </div>
        </header>

        {/* Monthly Subscription Grace Period Alert Banner (1st & 2nd of each month) */}
        <SubscriptionAlertBanner onOpenSubscription={() => setIsSubscriptionModalOpen(true)} />

        {/* Primary Page Canvas (Scrollable) */}
        <main className="flex-1 print:block overflow-y-auto print:overflow-visible p-4 sm:p-6 lg:p-8 print:p-0">
          <Routes>
            <Route 
              path="/" 
              element={
                <Dashboard 
                  triggerDirectPrint={triggerDirectPrint} 
                  triggerPdfDownload={triggerPdfDownload} 
                  onOpenSubscription={() => setIsSubscriptionModalOpen(true)}
                />
              } 
            />
            <Route 
              path="/new" 
              element={
                <RequireAuth allowedRoles={['OWNER', 'ADMIN', 'MANAGER', 'OPERATIONS_STAFF', 'STAFF']}>
                  <NewChallan 
                    onSave={handleSaveChallan} 
                    triggerDirectPrint={triggerDirectPrint}
                    triggerPdfDownload={triggerPdfDownload}
                  />
                </RequireAuth>
              } 
            />
            <Route 
              path="/edit/:id" 
              element={
                <RequireAuth allowedRoles={['OWNER', 'ADMIN', 'MANAGER', 'OPERATIONS_STAFF', 'STAFF']}>
                  <NewChallan 
                    onSave={handleSaveChallan} 
                    triggerDirectPrint={triggerDirectPrint}
                    triggerPdfDownload={triggerPdfDownload}
                  />
                </RequireAuth>
              } 
            />
            <Route 
              path="/challans" 
              element={
                <Challans 
                  companyDetails={companyLetterhead}
                  triggerDirectPrint={triggerDirectPrint} 
                  triggerPdfDownload={triggerPdfDownload} 
                />
              } 
            />
            <Route 
              path="/view/:id" 
              element={
                <ChallanDetails 
                  companyDetails={companyLetterhead}
                  triggerDirectPrint={triggerDirectPrint}
                  triggerPdfDownload={triggerPdfDownload}
                />
              } 
            />
            <Route 
              path="/deliveries" 
              element={
                <RequireAuth allowedRoles={['OWNER', 'ADMIN', 'MANAGER', 'OPERATIONS_STAFF', 'WAREHOUSE_STAFF', 'STAFF']}>
                  <Deliveries />
                </RequireAuth>
              } 
            />
            <Route 
              path="/transport" 
              element={
                <RequireAuth allowedRoles={['OWNER', 'ADMIN', 'MANAGER', 'OPERATIONS_STAFF', 'WAREHOUSE_STAFF', 'STAFF']}>
                  <TransportHub />
                </RequireAuth>
              } 
            />
            <Route 
              path="/returnable-goods" 
              element={
                <RequireAuth allowedRoles={['OWNER', 'ADMIN', 'MANAGER', 'OPERATIONS_STAFF', 'WAREHOUSE_STAFF', 'STAFF']}>
                  <ReturnableGoods />
                </RequireAuth>
              } 
            />
            <Route 
              path="/customers" 
              element={
                <RequireAuth allowedRoles={['OWNER', 'ADMIN', 'MANAGER', 'OPERATIONS_STAFF', 'WAREHOUSE_STAFF', 'STAFF']}>
                  <Customers />
                </RequireAuth>
              } 
            />
            <Route 
              path="/customers/:id" 
              element={
                <RequireAuth allowedRoles={['OWNER', 'ADMIN', 'MANAGER', 'OPERATIONS_STAFF', 'WAREHOUSE_STAFF', 'STAFF']}>
                  <CustomerDetails 
                    triggerDirectPrint={triggerDirectPrint}
                    triggerPdfDownload={triggerPdfDownload}
                  />
                </RequireAuth>
              } 
            />
            <Route 
              path="/products" 
              element={
                <RequireAuth allowedRoles={['OWNER', 'ADMIN', 'MANAGER', 'OPERATIONS_STAFF', 'WAREHOUSE_STAFF', 'STAFF']}>
                  <Products />
                </RequireAuth>
              } 
            />
            <Route 
              path="/inventory" 
              element={
                <RequireAuth allowedRoles={['OWNER', 'ADMIN', 'MANAGER', 'OPERATIONS_STAFF', 'WAREHOUSE_STAFF', 'STAFF']}>
                  <Inventory />
                </RequireAuth>
              } 
            />
            <Route 
              path="/warehouses" 
              element={<Navigate to="/inventory" replace />} 
            />
            <Route 
              path="/transfers" 
              element={<Navigate to="/inventory" replace />} 
            />
            <Route 
              path="/stock-movements" 
              element={<Navigate to="/inventory" replace />} 
            />
            <Route 
              path="/reports" 
              element={<Reports />} 
            />
            <Route 
              path="/branches" 
              element={
                <RequireAuth allowedRoles={['OWNER', 'ADMIN', 'MANAGER', 'STAFF']}>
                  <Branches />
                </RequireAuth>
              } 
            />
            <Route 
              path="/team" 
              element={
                <RequireAuth allowedRoles={['OWNER', 'ADMIN', 'MANAGER', 'STAFF']}>
                  <TeamManagement />
                </RequireAuth>
              } 
            />
            <Route 
              path="/audit-logs" 
              element={
                <RequireAuth allowedRoles={['OWNER', 'ADMIN']}>
                  <AuditLogs />
                </RequireAuth>
              } 
            />
            <Route 
              path="/subscription" 
              element={
                <RequireAuth allowedRoles={['OWNER', 'ADMIN']}>
                  <SubscriptionBilling onOpenUpgradeModal={() => setIsSubscriptionModalOpen(true)} />
                </RequireAuth>
              } 
            />
            <Route 
              path="/accept-invite" 
              element={
                <RequireAuth>
                  <TeamManagement />
                </RequireAuth>
              } 
            />
            <Route 
              path="/settings" 
              element={
                <RequireAuth allowedRoles={['OWNER', 'ADMIN']}>
                  <Settings onOpenSubscription={() => setIsSubscriptionModalOpen(true)} />
                </RequireAuth>
              } 
            />
            <Route 
              path="/recycle-bin" 
              element={
                <RequireAuth allowedRoles={['OWNER', 'ADMIN']}>
                  <RecycleBin />
                </RequireAuth>
              } 
            />
          </Routes>
        </main>
      </div>

      {/* 3. Global Print Mount */}
      {printingChallan && (
        <div id="print-mount" className={`absolute -left-[9999px] top-0 print:left-0 print:relative print-${printOptions.paperSize}`}>
          <ChallanPreview 
            challan={printingChallan} 
            companyDetails={companyLetterhead} 
            paperSize={printOptions.paperSize}
            copyType={printOptions.copyType}
          />
        </div>
      )}

      {/* 4. Global PDF Processing Loader Overlay */}
      {isPdfProcessing && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xl flex flex-col items-center gap-3">
            <Loader2 className="animate-spin text-amber-500" size={28} />
            <div className="text-sm font-bold text-slate-800">Generating Document PDF...</div>
            <div className="text-xs text-slate-500 font-medium">Rendering letterhead and table rows.</div>
          </div>
        </div>
      )}

      {/* 5. Subscription Modal */}
      <SubscriptionModal 
        isOpen={isSubscriptionModalOpen} 
        onClose={() => setIsSubscriptionModalOpen(false)}
        onSuccess={() => setIsSubscriptionModalOpen(false)}
      />

      {/* 6. Unclosable Monthly Subscription Lockout Overlay (Day 3+ when unpaid) */}
      <SubscriptionLockOverlay onOpenSubscription={() => setIsSubscriptionModalOpen(true)} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

function AppRoutes() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950 text-white font-sans">
        <Loader2 className="animate-spin text-amber-500" size={36} />
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Pages & Razorpay Merchant Compliance Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/accept-invite" element={<AcceptInvite />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/about-us" element={<AboutPage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/contact-us" element={<ContactPage />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/terms-and-conditions" element={<TermsOfService />} />
      <Route path="/refund-policy" element={<RefundPolicy />} />
      <Route path="/cancellation-refund" element={<RefundPolicy />} />
      <Route path="/refunds" element={<RefundPolicy />} />

      {/* Onboarding Wizard */}
      <Route 
        path="/onboarding" 
        element={
          <RequireAuth>
            <Onboarding />
          </RequireAuth>
        } 
      />

      {/* Root Route: If authenticated -> Main App Workspace; If guest -> Public Landing Page */}
      <Route 
        path="/*" 
        element={
          currentUser ? (
            <MainLayout />
          ) : (
            <LandingPage />
          )
        } 
      />
    </Routes>
  );
}
