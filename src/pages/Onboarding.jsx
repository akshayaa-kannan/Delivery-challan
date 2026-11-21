import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Image as ImageIcon, 
  Settings2, 
  FileText, 
  CreditCard, 
  Upload, 
  Trash2, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  Loader2,
  Zap,
  ShieldCheck,
  Sliders,
  Maximize2,
  Lock,
  Unlock,
  ArrowLeftRight,
  ArrowUpDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  updateCompany, 
  uploadCompanyLogo, 
  removeCompanyLogo, 
  getChallanSettings, 
  updateChallanSettings 
} from '../utils/tenantStorage';
import ChallanPreview from '../components/ChallanPreview';

export default function Onboarding() {
  const navigate = useNavigate();
  const { currentCompany, reloadCompany } = useAuth();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);

  // Step 1: Company Details
  const [companyForm, setCompanyForm] = useState({
    legalName: '',
    displayName: '',
    gstin: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    businessEmail: '',
    businessPhone: ''
  });

  // Step 2: Branding
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoSize, setLogoSize] = useState('medium');
  const [logoWidth, setLogoWidth] = useState(46);
  const [logoHeight, setLogoHeight] = useState(21);
  const [lockAspectRatio, setLockAspectRatio] = useState(true);

  // Step 3: Challan Config
  const [challanConfig, setChallanConfig] = useState({
    prefix: 'DC',
    startingNumber: 1,
    digits: 4,
    defaultCurrency: 'INR',
    footerText: 'Thank you for your business — Quality Products & Timely Delivery'
  });

  const handleWidthChange = (val) => {
    setLogoWidth(val);
    if (lockAspectRatio) {
      const ratio = logoWidth > 0 && logoHeight > 0 ? (logoWidth / logoHeight) : (46 / 21);
      const computedH = Math.max(8, Math.min(35, Math.round(val / ratio)));
      setLogoHeight(computedH);
    }
    setLogoSize('custom');
  };

  const handleHeightChange = (val) => {
    setLogoHeight(val);
    if (lockAspectRatio) {
      const ratio = logoWidth > 0 && logoHeight > 0 ? (logoWidth / logoHeight) : (46 / 21);
      const computedW = Math.max(15, Math.min(80, Math.round(val * ratio)));
      setLogoWidth(computedW);
    }
    setLogoSize('custom');
  };

  useEffect(() => {
    if (currentCompany) {
      setCompanyForm({
        legalName: currentCompany.legalName || '',
        displayName: currentCompany.displayName || currentCompany.legalName || '',
        gstin: currentCompany.gstin || '',
        address: currentCompany.address || '',
        city: currentCompany.city || '',
        state: currentCompany.state || '',
        pincode: currentCompany.pincode || '',
        country: currentCompany.country || 'India',
        businessEmail: currentCompany.businessEmail || '',
        businessPhone: currentCompany.businessPhone || ''
      });

      if (currentCompany.logoUrl) {
        setLogoPreview(currentCompany.logoUrl);
      }
      if (currentCompany.logoSize) {
        setLogoSize(currentCompany.logoSize);
      }
      if (currentCompany.logoWidth) {
        setLogoWidth(currentCompany.logoWidth);
      }
      if (currentCompany.logoHeight) {
        setLogoHeight(currentCompany.logoHeight);
      }
      if (currentCompany.lockAspectRatio !== undefined) {
        setLockAspectRatio(currentCompany.lockAspectRatio);
      }

      getChallanSettings(currentCompany.id).then((settings) => {
        if (settings) {
          setChallanConfig({
            prefix: settings.prefix || 'DC',
            startingNumber: settings.startingNumber || 1,
            digits: settings.digits || 4,
            defaultCurrency: settings.defaultCurrency || 'INR',
            footerText: settings.footerText || 'Thank you for your business'
          });
        }
      });
    }
  }, [currentCompany]);

  // Handle Logo Upload to Firebase Storage
  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !currentCompany) return;

    if (!file.type.startsWith('image/')) {
      alert("Please upload an image file (PNG, JPG, or SVG)");
      return;
    }

    setLogoUploading(true);
    try {
      const url = await uploadCompanyLogo(currentCompany.id, file);
      setLogoPreview(url);
      await reloadCompany();
    } catch (err) {
      console.error("Logo upload failed:", err);
      alert("Failed to upload logo. Please try again.");
    } finally {
      setLogoUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!currentCompany) return;
    setLogoUploading(true);
    try {
      await removeCompanyLogo(currentCompany.id, currentCompany.logoStoragePath);
      setLogoPreview(null);
      await reloadCompany();
    } catch (err) {
      console.error("Logo removal failed:", err);
    } finally {
      setLogoUploading(false);
    }
  };

  // Complete Onboarding
  const handleCompleteOnboarding = async () => {
    if (!currentCompany) return;
    setLoading(true);
    try {
      // 1. Save company details
      await updateCompany(currentCompany.id, {
        ...companyForm,
        logoSize,
        logoWidth,
        logoHeight,
        lockAspectRatio,
        footerTagline: challanConfig.footerText,
        onboardingComplete: true
      });

      // 2. Save challan configuration
      await updateChallanSettings(currentCompany.id, challanConfig);

      // 3. Reload company in context
      await reloadCompany();

      // 4. Redirect to Dashboard
      navigate('/');
    } catch (err) {
      console.error("Failed to complete onboarding:", err);
      alert("Could not complete setup. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Sample challan data for Step 4 Preview
  const sampleChallanPreviewData = {
    challanNumber: `${challanConfig.prefix}-0001`,
    date: new Date().toISOString().split('T')[0],
    customer: "LARSEN & TOUBRO LIMITED\nGate No. 3, Powai Campus, Mumbai - 400072\nGSTIN: 27AAACL1234H1Z1",
    vehicleNumber: "TN 01 AB 1234",
    remarks: "Standard delivery for review and verification",
    products: [
      { name: "APFC Automatic Panel 150 KVAR", quantity: 1, unit: "nos", rate: 45000, amount: 45000 },
      { name: "Capacitor Bank 25 KVAR Heavy Duty", quantity: 2, unit: "nos", rate: 12500, amount: 25000 },
      { name: "Spare Terminal Blocks & Accessories Kit", quantity: 3, unit: "set", rate: 2500, amount: 7500 }
    ],
    totalQuantity: 6,
    totalAmount: 77500
  };

  const sampleCompanyProps = {
    companyName: companyForm.displayName || companyForm.legalName || 'YOUR COMPANY NAME',
    address: `${companyForm.address}\n${companyForm.city}, ${companyForm.state} - ${companyForm.pincode}`,
    gstNumber: companyForm.gstin || 'NOT SPECIFIED',
    mobileNumber: companyForm.businessPhone || '9876543210',
    phoneNumber: companyForm.businessPhone || '',
    footerTagline: challanConfig.footerText,
    logoUrl: logoPreview,
    logoSize,
    logoWidth,
    logoHeight,
    lockAspectRatio
  };

  const steps = [
    { num: 1, title: 'Company Details', icon: Building2 },
    { num: 2, title: 'Branding & Logo', icon: ImageIcon },
    { num: 3, title: 'Challan Sequence', icon: Settings2 },
    { num: 4, title: 'Template Preview', icon: FileText },
    { num: 5, title: 'Subscription & Start', icon: CreditCard }
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Wizard Header */}
      <header className="border-b border-slate-800 bg-slate-950/70 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-lg">
            N
          </div>
          <div>
            <h1 className="text-base font-black text-white">NAYARUVI ONBOARDING</h1>
            <p className="text-xs text-slate-400">Configure your company workspace</p>
          </div>
        </div>
        <div className="text-xs text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
          Step {currentStep} of {steps.length}
        </div>
      </header>

      {/* Step Stepper Bar */}
      <div className="bg-slate-950 border-b border-slate-800/80 px-6 py-3 overflow-x-auto">
        <div className="max-w-4xl mx-auto flex items-center justify-between min-w-[550px]">
          {steps.map((st, idx) => {
            const Icon = st.icon;
            const isCompleted = currentStep > st.num;
            const isCurrent = currentStep === st.num;
            return (
              <React.Fragment key={st.num}>
                <button
                  onClick={() => setCurrentStep(st.num)}
                  className={`flex items-center gap-2 cursor-pointer transition-all ${
                    isCurrent
                      ? 'text-amber-400 font-bold'
                      : isCompleted
                      ? 'text-emerald-400 font-semibold'
                      : 'text-slate-500'
                  }`}
                >
                  <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs ${
                    isCurrent
                      ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/30'
                      : isCompleted
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {isCompleted ? <CheckCircle2 size={14} /> : st.num}
                  </div>
                  <span className="text-xs">{st.title}</span>
                </button>
                {idx < steps.length - 1 && (
                  <div className={`h-0.5 w-8 ${isCompleted ? 'bg-emerald-500/50' : 'bg-slate-800'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Wizard Body */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 sm:p-10 flex flex-col justify-center">
        <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          {/* STEP 1: COMPANY DETAILS */}
          {currentStep === 1 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <h2 className="text-lg font-black text-white">Confirm Company Details</h2>
                <p className="text-xs text-slate-400">These details will print automatically on your delivery challans.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-300 block mb-1">Legal Company Name</label>
                  <input
                    type="text"
                    value={companyForm.legalName}
                    onChange={(e) => setCompanyForm({ ...companyForm, legalName: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-300 block mb-1">Display Brand Name</label>
                  <input
                    type="text"
                    value={companyForm.displayName}
                    onChange={(e) => setCompanyForm({ ...companyForm, displayName: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-300 block mb-1">GSTIN Number</label>
                  <input
                    type="text"
                    value={companyForm.gstin}
                    onChange={(e) => setCompanyForm({ ...companyForm, gstin: e.target.value.toUpperCase() })}
                    placeholder="33AAACL1234H1Z1"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-300 block mb-1">Business Phone / Mobile</label>
                  <input
                    type="tel"
                    value={companyForm.businessPhone}
                    onChange={(e) => setCompanyForm({ ...companyForm, businessPhone: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-300 block mb-1">Registered Address</label>
                <textarea
                  rows={2}
                  value={companyForm.address}
                  onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-300 block mb-1">City</label>
                  <input
                    type="text"
                    value={companyForm.city}
                    onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-300 block mb-1">State</label>
                  <input
                    type="text"
                    value={companyForm.state}
                    onChange={(e) => setCompanyForm({ ...companyForm, state: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-300 block mb-1">PIN Code</label>
                  <input
                    type="text"
                    value={companyForm.pincode}
                    onChange={(e) => setCompanyForm({ ...companyForm, pincode: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: BRANDING */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-lg font-black text-white">Company Branding & Logo</h2>
                <p className="text-xs text-slate-400">
                  Upload your high-resolution company logo. It will appear at the top-left of every generated delivery challan and PDF.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-slate-900/80 rounded-xl border border-slate-700/60">
                {/* Logo Preview Box */}
                <div className="h-28 w-44 rounded-xl border-2 border-dashed border-slate-600 bg-white flex items-center justify-center p-2 relative shadow-inner overflow-hidden">
                  {logoPreview ? (
                    <img 
                      src={logoPreview} 
                      alt="Company Logo" 
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <div className="text-center text-slate-400">
                      <ImageIcon size={28} className="mx-auto mb-1 opacity-50" />
                      <span className="text-[10px] font-bold uppercase block">No Logo Uploaded</span>
                    </div>
                  )}

                  {logoUploading && (
                    <div className="absolute inset-0 bg-slate-900/70 flex items-center justify-center text-white text-xs font-bold">
                      <Loader2 size={20} className="animate-spin text-amber-400" />
                    </div>
                  )}
                </div>

                {/* Upload Actions */}
                <div className="flex-1 space-y-3 text-center sm:text-left">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                    <label className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs cursor-pointer shadow-md shadow-amber-500/10 transition-all">
                      <Upload size={14} />
                      <span>{logoPreview ? 'Change Logo' : 'Upload Logo'}</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleLogoUpload} 
                        className="hidden" 
                      />
                    </label>

                    {logoPreview && (
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="flex items-center gap-1.5 px-3 py-2.5 border border-red-500/40 text-red-400 hover:bg-red-500/10 rounded-xl text-xs font-bold transition-all"
                      >
                        <Trash2 size={14} />
                        <span>Remove Logo</span>
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Recommended dimensions: 300x120px or similar ratio. Transparent PNG or SVG renders best on white A4 paper.
                  </p>
                </div>
              </div>

              {/* Logo Sizing Control in Onboarding */}
              <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-700/80 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sliders size={16} className="text-amber-400" />
                    <h3 className="text-xs font-bold uppercase text-white tracking-wider">
                      Logo Width & Length (Height) Controls
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-amber-400 bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800">
                      {logoWidth} mm (W) × {logoHeight} mm (L)
                    </span>
                    <button
                      type="button"
                      onClick={() => setLockAspectRatio(!lockAspectRatio)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold border transition-colors cursor-pointer ${
                        lockAspectRatio
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                      }`}
                      title={lockAspectRatio ? "Click to unlock independent width & length" : "Click to lock proportional ratio"}
                    >
                      {lockAspectRatio ? <Lock size={12} className="text-amber-400" /> : <Unlock size={12} className="text-slate-400" />}
                      <span>{lockAspectRatio ? 'Locked Ratio' : 'Unlocked'}</span>
                    </button>
                  </div>
                </div>

                {/* Presets Row */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setLogoSize('small');
                      setLogoWidth(34);
                      setLogoHeight(16);
                    }}
                    className={`p-2 rounded-lg border text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                      logoSize === 'small' && logoWidth === 34 && logoHeight === 16
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <span>Small</span>
                    <span className="text-[10px] text-slate-400 font-normal">34 × 16 mm</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setLogoSize('medium');
                      setLogoWidth(46);
                      setLogoHeight(21);
                    }}
                    className={`p-2 rounded-lg border text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                      logoSize === 'medium' && logoWidth === 46 && logoHeight === 21
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <span>Medium</span>
                    <span className="text-[10px] text-slate-400 font-normal">46 × 21 mm</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setLogoSize('large');
                      setLogoWidth(58);
                      setLogoHeight(26);
                    }}
                    className={`p-2 rounded-lg border text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                      logoSize === 'large' && logoWidth === 58 && logoHeight === 26
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <span>Large</span>
                    <span className="text-[10px] text-slate-400 font-normal">58 × 26 mm</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setLogoSize('square');
                      setLogoWidth(28);
                      setLogoHeight(28);
                    }}
                    className={`p-2 rounded-lg border text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                      logoSize === 'square' || (logoWidth === 28 && logoHeight === 28)
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <span>Square / Crest</span>
                    <span className="text-[10px] text-slate-400 font-normal">28 × 28 mm</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setLogoSize('banner');
                      setLogoWidth(65);
                      setLogoHeight(18);
                    }}
                    className={`p-2 rounded-lg border text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-0.5 col-span-2 sm:col-span-1 ${
                      logoSize === 'banner' || (logoWidth === 65 && logoHeight === 18)
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <span>Wide Banner</span>
                    <span className="text-[10px] text-slate-400 font-normal">65 × 18 mm</span>
                  </button>
                </div>

                {/* Dual Sliders */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Width Slider */}
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span className="font-semibold flex items-center gap-1.5">
                        <ArrowLeftRight size={12} className="text-amber-400" />
                        Logo Width:
                      </span>
                      <span className="font-mono text-amber-400">{logoWidth} mm</span>
                    </div>
                    <input
                      type="range"
                      min={15}
                      max={80}
                      step={1}
                      value={logoWidth}
                      onChange={(e) => handleWidthChange(Number(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                      <span>15 mm (Min)</span>
                      <span>46 mm</span>
                      <span>80 mm (Max)</span>
                    </div>
                  </div>

                  {/* Length / Height Slider */}
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span className="font-semibold flex items-center gap-1.5">
                        <ArrowUpDown size={12} className="text-amber-400" />
                        Logo Length / Height:
                      </span>
                      <span className="font-mono text-amber-400">{logoHeight} mm</span>
                    </div>
                    <input
                      type="range"
                      min={8}
                      max={35}
                      step={1}
                      value={logoHeight}
                      onChange={(e) => handleHeightChange(Number(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                      <span>8 mm (Min)</span>
                      <span>21 mm</span>
                      <span>35 mm (Max)</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span>Exact dimensions ({logoWidth}mm W × {logoHeight}mm L) will be applied to delivery challans and PDFs.</span>
                  <span className="text-amber-400 font-bold">Preview in Step 4</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: CHALLAN CONFIGURATION */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-lg font-black text-white">Challan Numbering & Footer Settings</h2>
                <p className="text-xs text-slate-400">
                  Every company on Nayaruvi has its own isolated sequence. Numbering automatically increments and prevents duplicates.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-300 block mb-1">Challan Prefix</label>
                  <input
                    type="text"
                    value={challanConfig.prefix}
                    onChange={(e) => setChallanConfig({ ...challanConfig, prefix: e.target.value.toUpperCase() })}
                    placeholder="e.g. ABC or TEK"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm font-bold text-white uppercase font-mono focus:border-amber-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Your first challan: <strong className="text-amber-400">{challanConfig.prefix || 'DC'}-{String(challanConfig.startingNumber || challanConfig.currentSequence || 1).padStart(challanConfig.digits || 4, '0')}</strong></span>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-300 block mb-1">Starting Number</label>
                  <input
                    type="number"
                    min={1}
                    value={challanConfig.startingNumber || 1}
                    onChange={(e) => {
                      const num = Math.max(1, parseInt(e.target.value, 10) || 1);
                      setChallanConfig({ ...challanConfig, startingNumber: num, currentSequence: num });
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm font-bold text-white focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-300 block mb-1">Number of Digits</label>
                  <select
                    value={challanConfig.digits}
                    onChange={(e) => setChallanConfig({ ...challanConfig, digits: parseInt(e.target.value, 10) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm font-bold text-white focus:border-amber-500"
                  >
                    <option value={3}>3 digits (e.g. ABC-001)</option>
                    <option value={4}>4 digits (e.g. ABC-0001)</option>
                    <option value={5}>5 digits (e.g. ABC-00001)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-300 block mb-1">Footer Tagline / Slogan</label>
                <input
                  type="text"
                  value={challanConfig.footerText}
                  onChange={(e) => setChallanConfig({ ...challanConfig, footerText: e.target.value })}
                  placeholder="e.g. Power Quality Solution Provider & Panel Builders"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:border-amber-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Appears inside the dark banner at the bottom of every page.</span>
              </div>
            </div>
          )}

          {/* STEP 4: TEMPLATE PREVIEW */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-black text-white">Live Challan Preview</h2>
                  <p className="text-xs text-slate-400">Review how your business delivery challan will look when printed or saved as PDF.</p>
                </div>
                <div className="text-xs bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/30 font-bold">
                  Dynamic Tenant Template
                </div>
              </div>

              {/* Scaled Preview Frame */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-700 max-h-[550px] overflow-y-auto">
                <div className="transform scale-95 origin-top">
                  <ChallanPreview 
                    challan={sampleChallanPreviewData} 
                    companyDetails={sampleCompanyProps} 
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: SUBSCRIPTION & LAUNCH */}
          {currentStep === 5 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-lg font-black text-white">Select Your Plan & Launch</h2>
                <p className="text-xs text-slate-400">
                  Your 14-Day Free Trial is automatically activated. You can subscribe anytime to keep unlimited cloud sync.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 14-Day Trial Card (Active) */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/60 to-slate-900 border-2 border-emerald-500/80 shadow-lg relative">
                  <span className="absolute top-4 right-4 bg-emerald-500 text-slate-950 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                    Active Free Trial
                  </span>
                  <div className="h-9 w-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
                    <ShieldCheck size={20} />
                  </div>
                  <h3 className="text-base font-black text-white">14-Day Free Trial</h3>
                  <div className="text-2xl font-black text-emerald-400 mt-1">₹0 <span className="text-xs text-slate-400 font-normal">/ 14 days</span></div>
                  <ul className="mt-4 space-y-2 text-xs text-slate-300">
                    <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> Full Access to Delivery Challan Creator</li>
                    <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> A4 Printing & Vector PDF Downloads</li>
                    <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> Cloud Sync & Recycle Bin</li>
                  </ul>
                </div>

                {/* Monthly Pro Plan */}
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-700 hover:border-amber-500/50 transition-all shadow-lg relative">
                  <div className="h-9 w-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
                    <Zap size={20} />
                  </div>
                  <h3 className="text-base font-black text-white">Pro Monthly Subscription</h3>
                  <div className="text-2xl font-black text-amber-400 mt-1">₹500 <span className="text-xs text-slate-400 font-normal">/ month</span></div>
                  <ul className="mt-4 space-y-2 text-xs text-slate-300">
                    <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-amber-400" /> Unlimited Delivery Challans</li>
                    <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-amber-400" /> Team Collaboration & Roles</li>
                    <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-amber-400" /> Razorpay Secured Billing</li>
                  </ul>
                </div>
              </div>

              <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 text-xs text-slate-300 flex items-center gap-3">
                <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                <span>You can begin creating challans right now under your 14-day trial!</span>
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-700/80 mt-6">
            <button
              type="button"
              disabled={currentStep === 1 || loading}
              onClick={() => setCurrentStep(prev => prev - 1)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-700/50 disabled:opacity-30 text-xs font-bold cursor-pointer transition-all"
            >
              <ArrowLeft size={14} />
              <span>Previous</span>
            </button>

            {currentStep < 5 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(prev => prev + 1)}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs cursor-pointer shadow-md shadow-amber-500/20 transition-all"
              >
                <span>Next Step</span>
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                disabled={loading}
                onClick={handleCompleteOnboarding}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-black rounded-xl text-xs cursor-pointer shadow-lg shadow-emerald-500/20 transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Finalizing Setup...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Launch Company Workspace</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
