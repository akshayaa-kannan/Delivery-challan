import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Building2, 
  User, 
  Mail, 
  Phone, 
  Lock, 
  Eye, 
  EyeOff, 
  Globe, 
  MapPin, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const navigate = useNavigate();
  const { registerCompany } = useAuth();

  // Form step: 1 = Account Info, 2 = Company Info
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Account State
  const [account, setAccount] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  // Company State
  const [company, setCompany] = useState({
    legalName: '',
    displayName: '',
    businessType: 'Private Limited',
    gstin: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    businessEmail: '',
    businessPhone: '',
    website: ''
  });

  const businessTypes = [
    'Proprietorship',
    'Partnership',
    'LLP',
    'Private Limited',
    'Public Limited',
    'Other'
  ];

  const handleAccountChange = (e) => {
    setAccount({ ...account, [e.target.name]: e.target.value });
    setError('');
  };

  const handleCompanyChange = (e) => {
    setCompany({ ...company, [e.target.name]: e.target.value });
    setError('');
  };

  const validateStep1 = () => {
    if (!account.fullName.trim()) return 'Full Name is required.';
    if (!account.email.trim() || !/\S+@\S+\.\S+/.test(account.email)) return 'Valid email is required.';
    if (!account.phone.trim()) return 'Phone number is required.';
    if (!account.password || account.password.length < 6) return 'Password must be at least 6 characters.';
    if (account.password !== account.confirmPassword) return 'Passwords do not match.';
    return null;
  };

  const validateStep2 = () => {
    if (!company.legalName.trim()) return 'Legal Company Name is required.';
    if (!company.address.trim()) return 'Company address is required.';
    if (!company.city.trim()) return 'City is required.';
    if (!company.state.trim()) return 'State is required.';
    if (!company.pincode.trim()) return 'PIN code is required.';
    if (company.gstin && company.gstin.trim().length !== 15) {
      return 'GSTIN must be 15 characters if provided.';
    }
    return null;
  };

  const handleNext = (e) => {
    e.preventDefault();
    const err = validateStep1();
    if (err) {
      setError(err);
      return;
    }
    // Prefill business email & phone from account if empty
    setCompany(prev => ({
      ...prev,
      businessEmail: prev.businessEmail || account.email,
      businessPhone: prev.businessPhone || account.phone,
      displayName: prev.displayName || prev.legalName
    }));
    setError('');
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validateStep2();
    if (err) {
      setError(err);
      return;
    }

    setLoading(true);
    setError('');

    try {
      await registerCompany({ account, company });
      navigate('/onboarding');
    } catch (err) {
      console.error("Registration error:", err);
      let msg = "Failed to create account. Please check your details.";
      if (err.code === 'auth/email-already-in-use') {
        msg = "An account with this email already exists. Please log in instead.";
      } else if (err.code === 'auth/weak-password') {
        msg = "The password is too weak. Please use at least 6 characters.";
      } else if (err.code === 'auth/configuration-not-found') {
        msg = "Firebase Authentication is not activated in your Firebase Console yet! Open Firebase Console -> Authentication -> click 'Get Started' -> enable 'Email/Password' -> click 'Save'.";
      } else if (err.code === 'auth/operation-not-allowed') {
        msg = "Email/Password sign-in is disabled in your Firebase Console! Open Firebase Console -> Authentication -> Sign-in method -> enable Email/Password.";
      } else if (err.message) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        {/* Branding Header */}
        <div className="flex flex-col items-center">
          <Link to="/" className="flex items-center gap-2 mb-2">
            <div className="h-10 w-10 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shadow-amber-500/20">
              N
            </div>
            <span className="text-2xl font-black text-white tracking-tight">NAYARUVI</span>
          </Link>
          <h2 className="text-xl font-bold text-slate-200">Register Your Company</h2>
          <p className="text-xs text-slate-400 mt-1">Multi-tenant delivery challan platform for modern businesses</p>
        </div>

        {/* Invited Employee Notice Banner */}
        <div className="mt-4 p-3 bg-slate-800/90 border border-slate-700/80 rounded-xl flex items-center justify-between text-xs">
          <span className="text-slate-300">Invited to join an existing company team?</span>
          <Link 
            to="/accept-invite" 
            className="font-bold text-amber-400 hover:text-amber-300 underline flex items-center gap-1"
          >
            <span>Join with Invite Code</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        {/* Step Progress Pills */}
        <div className="flex items-center justify-center gap-3 mt-6">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
            step === 1 ? 'bg-amber-500 text-slate-950' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
          }`}>
            <span className="h-5 w-5 rounded-full bg-slate-900/40 flex items-center justify-center text-[10px]">1</span>
            <span>Account Details</span>
          </div>
          <div className="h-0.5 w-6 bg-slate-700" />
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
            step === 2 ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400 border border-slate-700'
          }`}>
            <span className="h-5 w-5 rounded-full bg-slate-900/40 flex items-center justify-center text-[10px]">2</span>
            <span>Company Profile</span>
          </div>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-xl px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-2xl rounded-2xl border border-slate-100">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-3 animate-shake">
              <AlertCircle size={18} className="shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {step === 1 ? (
            /* STEP 1: ACCOUNT INFORMATION */
            <form onSubmit={handleNext} className="space-y-4">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-500 border-b pb-2 mb-4">
                Personal & Login Credentials
              </h3>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    name="fullName"
                    required
                    value={account.fullName}
                    onChange={handleAccountChange}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full pl-10 pr-4 py-2.5 text-sm font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Work / Personal Email *
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="email"
                    name="email"
                    required
                    value={account.email}
                    onChange={handleAccountChange}
                    placeholder="name@company.com"
                    className="w-full pl-10 pr-4 py-2.5 text-sm font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Mobile Number *
                </label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="tel"
                    name="phone"
                    required
                    value={account.phone}
                    onChange={handleAccountChange}
                    placeholder="9876543210"
                    className="w-full pl-10 pr-4 py-2.5 text-sm font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Password *
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      required
                      value={account.password}
                      onChange={handleAccountChange}
                      placeholder="At least 6 characters"
                      className="w-full pl-10 pr-10 py-2.5 text-sm font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      required
                      value={account.confirmPassword}
                      onChange={handleAccountChange}
                      placeholder="Repeat password"
                      className="w-full pl-10 pr-10 py-2.5 text-sm font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded-xl transition-all shadow-md shadow-amber-500/10 cursor-pointer text-sm"
                >
                  <span>Continue to Company Details</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </form>
          ) : (
            /* STEP 2: COMPANY INFORMATION */
            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-500 border-b pb-2 mb-4">
                Company & Business Information
              </h3>

              {/* Legal Name & Display Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Legal Company Name *
                  </label>
                  <input
                    type="text"
                    name="legalName"
                    required
                    value={company.legalName}
                    onChange={handleCompanyChange}
                    placeholder="ABC Electricals Private Limited"
                    className="w-full px-3.5 py-2.5 text-sm font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Display Name / Brand
                  </label>
                  <input
                    type="text"
                    name="displayName"
                    value={company.displayName}
                    onChange={handleCompanyChange}
                    placeholder="ABC Electricals"
                    className="w-full px-3.5 py-2.5 text-sm font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Business Type & GSTIN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Business Type *
                  </label>
                  <select
                    name="businessType"
                    value={company.businessType}
                    onChange={handleCompanyChange}
                    className="w-full px-3.5 py-2.5 text-sm font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white"
                  >
                    {businessTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    GSTIN (Optional)
                  </label>
                  <input
                    type="text"
                    name="gstin"
                    maxLength={15}
                    value={company.gstin}
                    onChange={handleCompanyChange}
                    placeholder="33AAACL1234H1Z1"
                    className="w-full px-3.5 py-2.5 text-sm font-mono uppercase font-bold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Registered Address *
                </label>
                <textarea
                  name="address"
                  required
                  rows={2}
                  value={company.address}
                  onChange={handleCompanyChange}
                  placeholder="Plot No. 12, Industrial Area, Sector 5"
                  className="w-full px-3.5 py-2 text-sm font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              {/* City, State, Pincode */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    name="city"
                    required
                    value={company.city}
                    onChange={handleCompanyChange}
                    placeholder="Chennai"
                    className="w-full px-3 py-2 text-sm font-medium border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    State *
                  </label>
                  <input
                    type="text"
                    name="state"
                    required
                    value={company.state}
                    onChange={handleCompanyChange}
                    placeholder="Tamil Nadu"
                    className="w-full px-3 py-2 text-sm font-medium border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    PIN Code *
                  </label>
                  <input
                    type="text"
                    name="pincode"
                    required
                    value={company.pincode}
                    onChange={handleCompanyChange}
                    placeholder="600032"
                    className="w-full px-3 py-2 text-sm font-medium border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Business Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Business Email
                  </label>
                  <input
                    type="email"
                    name="businessEmail"
                    value={company.businessEmail}
                    onChange={handleCompanyChange}
                    placeholder="contact@company.com"
                    className="w-full px-3.5 py-2 text-sm font-medium border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Business Phone
                  </label>
                  <input
                    type="tel"
                    name="businessPhone"
                    value={company.businessPhone}
                    onChange={handleCompanyChange}
                    placeholder="044 - 24780224"
                    className="w-full px-3.5 py-2 text-sm font-medium border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Website */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Website (Optional)
                </label>
                <div className="relative">
                  <Globe size={16} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="url"
                    name="website"
                    value={company.website}
                    onChange={handleCompanyChange}
                    placeholder="https://company.com"
                    className="w-full pl-10 pr-4 py-2 text-sm font-medium border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={loading}
                  className="w-1/3 py-3 px-4 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition-all text-sm cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-2/3 flex items-center justify-center gap-2 py-3 px-4 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-black rounded-xl transition-all shadow-lg shadow-amber-500/20 cursor-pointer text-sm"
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Creating Tenant...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={18} />
                      <span>Complete Registration</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <p>
              Already have an account?{' '}
              <Link to="/login" className="font-bold text-amber-600 hover:text-amber-700 underline">
                Sign In
              </Link>
            </p>
            <Link to="/accept-invite" className="font-bold text-slate-600 hover:text-slate-900 underline">
              Have an Invite Code?
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
