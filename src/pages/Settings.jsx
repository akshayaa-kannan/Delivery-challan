import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Settings2, 
  Users, 
  CreditCard, 
  Save, 
  Upload, 
  Trash2, 
  Plus, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Shield,
  ShieldCheck,
  Zap,
  Sliders,
  Maximize2,
  Eye,
  Sparkles,
  Lock,
  Unlock,
  ArrowLeftRight,
  ArrowUpDown,
  Calendar,
  Clock,
  AlertTriangle,
  KeyRound,
  Copy,
  Check,
  Printer,
  FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { registerOrUpdateMemberAuth, sendMemberPasswordReset } from '../utils/memberAuth.js';
import { DEFAULT_TERMS_AND_CONDITIONS } from '../utils/indianBusiness';
import { 
  updateCompany, 
  uploadCompanyLogo, 
  removeCompanyLogo, 
  getChallanSettings, 
  updateChallanSettings,
  getCompanyMembers,
  addCompanyMember,
  updateMemberRole,
  removeCompanyMember
} from '../utils/tenantStorage';

export default function Settings({ onOpenSubscription }) {
  const { 
    currentCompany, 
    isOwner, 
    isAdmin, 
    role, 
    reloadCompany, 
    subscription, 
    subscriptionStatus, 
    simulatedDay, 
    setSimulatedDay, 
    recordPayment 
  } = useAuth();
  
  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState('');
  const [error, setError] = useState('');

  // Profile State
  const [profile, setProfile] = useState({
    legalName: '',
    displayName: '',
    gstin: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    businessEmail: '',
    businessPhone: '',
    website: '',
    footerTagline: ''
  });
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoSize, setLogoSize] = useState('medium');
  const [logoWidth, setLogoWidth] = useState(46);
  const [logoHeight, setLogoHeight] = useState(21);
  const [lockAspectRatio, setLockAspectRatio] = useState(true);

  // Challan Settings State
  const [challanConfig, setChallanConfig] = useState({
    prefix: 'DC',
    startingNumber: 1,
    currentSequence: 1,
    digits: 4,
    defaultCurrency: 'INR',
    footerText: 'Thank you for your business'
  });

  // Document Output & Print Settings State
  const [docOutputConfig, setDocOutputConfig] = useState({
    defaultPaperSize: 'a4',
    defaultCopyType: 'original',
    hideRates: false,
    hideTax: false,
    hideHsn: false,
    hideSku: false,
    termsAndConditions: DEFAULT_TERMS_AND_CONDITIONS,
    signatoryTitle: 'Authorised Signatory',
    receiverTitle: "Receiver's Acknowledgment",
    footerTagline: 'Thank you for your business'
  });

  // Team Members State
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', displayName: '', role: 'STAFF', password: '' });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [passwordModalMember, setPasswordModalMember] = useState(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [passwordModalLoading, setPasswordModalLoading] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState(null);

  useEffect(() => {
    if (currentCompany) {
      setProfile({
        legalName: currentCompany.legalName || '',
        displayName: currentCompany.displayName || '',
        gstin: currentCompany.gstin || '',
        address: currentCompany.address || '',
        city: currentCompany.city || '',
        state: currentCompany.state || '',
        pincode: currentCompany.pincode || '',
        businessEmail: currentCompany.businessEmail || '',
        businessPhone: currentCompany.businessPhone || '',
        website: currentCompany.website || '',
        footerTagline: currentCompany.footerTagline || ''
      });

      setLogoSize(currentCompany.logoSize || 'medium');
      setLogoWidth(currentCompany.logoWidth || 46);
      setLogoHeight(currentCompany.logoHeight || 21);
      setLockAspectRatio(currentCompany.lockAspectRatio !== undefined ? currentCompany.lockAspectRatio : true);

      const savedDocSettings = currentCompany.documentSettings || currentCompany.docOutputConfig || {};
      setDocOutputConfig({
        defaultPaperSize: savedDocSettings.defaultPaperSize || 'a4',
        defaultCopyType: savedDocSettings.defaultCopyType || 'original',
        hideRates: savedDocSettings.hideRates || false,
        hideTax: savedDocSettings.hideTax || false,
        hideHsn: savedDocSettings.hideHsn || false,
        hideSku: savedDocSettings.hideSku || false,
        termsAndConditions: savedDocSettings.termsAndConditions || currentCompany.termsAndConditions || DEFAULT_TERMS_AND_CONDITIONS,
        signatoryTitle: savedDocSettings.signatoryTitle || 'Authorised Signatory',
        receiverTitle: savedDocSettings.receiverTitle || "Receiver's Acknowledgment",
        footerTagline: savedDocSettings.footerTagline || currentCompany.footerTagline || 'Thank you for your business'
      });

      getChallanSettings(currentCompany.id).then((st) => {
        if (st) setChallanConfig(st);
      });

      loadMembers();
    }
  }, [currentCompany?.id]);

  const loadMembers = async () => {
    if (!currentCompany) return;
    setMembersLoading(true);
    try {
      const data = await getCompanyMembers(currentCompany.id);
      setMembers(data);
    } catch (e) {
      console.error("Error loading team members:", e);
    } finally {
      setMembersLoading(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!currentCompany) return;
    setSaving(true);
    setError('');
    setSavedSuccess('');

    try {
      await updateCompany(currentCompany.id, {
        ...profile,
        logoSize,
        logoWidth,
        logoHeight,
        lockAspectRatio,
        footerTagline: profile.footerTagline
      });
      await reloadCompany();
      setSavedSuccess("Company profile updated successfully!");
      setTimeout(() => setSavedSuccess(''), 3500);
    } catch (err) {
      console.error("Profile save error:", err);
      setError("Failed to update profile. " + (err.message || ''));
    } finally {
      setSaving(false);
    }
  };

  const handleQuickSaveLogoDimensions = async (newWidth, newHeight, newLock, newSize) => {
    if (!currentCompany) return;
    setSaving(true);
    try {
      await updateCompany(currentCompany.id, {
        logoSize: newSize !== undefined ? newSize : logoSize,
        logoWidth: newWidth !== undefined ? newWidth : logoWidth,
        logoHeight: newHeight !== undefined ? newHeight : logoHeight,
        lockAspectRatio: newLock !== undefined ? newLock : lockAspectRatio
      });
      await reloadCompany();
      setSavedSuccess("Logo dimensions updated for all challans and PDFs!");
      setTimeout(() => setSavedSuccess(''), 3000);
    } catch (err) {
      console.error("Logo config save error:", err);
      setError("Failed to update logo dimensions.");
    } finally {
      setSaving(false);
    }
  };

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

  const handleSaveChallanConfig = async (e) => {
    e.preventDefault();
    if (!currentCompany) return;
    setSaving(true);
    setError('');
    setSavedSuccess('');

    try {
      const configToSave = {
        ...challanConfig,
        currentSequence: Math.max(1, parseInt(challanConfig.currentSequence, 10) || 1)
      };
      await updateChallanSettings(currentCompany.id, configToSave);
      setChallanConfig(configToSave);
      await reloadCompany();
      setSavedSuccess("Challan numbering settings saved!");
      setTimeout(() => setSavedSuccess(''), 3500);
    } catch (err) {
      console.error("Settings save error:", err);
      setError("Failed to save challan settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDocOutput = async (e) => {
    e.preventDefault();
    if (!currentCompany || !isAdmin) return;
    setSaving(true);
    setError('');
    setSavedSuccess('');

    try {
      await updateCompany(currentCompany.id, {
        documentSettings: docOutputConfig,
        docOutputConfig: docOutputConfig,
        footerTagline: docOutputConfig.footerTagline,
        termsAndConditions: docOutputConfig.termsAndConditions
      });
      await updateChallanSettings(currentCompany.id, {
        documentSettings: docOutputConfig,
        termsAndConditions: docOutputConfig.termsAndConditions
      });
      await reloadCompany();
      setSavedSuccess("Document output & print settings saved successfully!");
      setTimeout(() => setSavedSuccess(''), 3500);
    } catch (err) {
      console.error("Doc output save error:", err);
      setError("Failed to save document output settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !currentCompany) return;

    setLogoUploading(true);
    try {
      await uploadCompanyLogo(currentCompany.id, file);
      await reloadCompany();
      setSavedSuccess("Logo uploaded successfully!");
      setTimeout(() => setSavedSuccess(''), 3500);
    } catch (err) {
      console.error("Logo upload error:", err);
      setError("Failed to upload logo.");
    } finally {
      setLogoUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!currentCompany || !window.confirm("Remove company logo?")) return;
    setLogoUploading(true);
    try {
      await removeCompanyLogo(currentCompany.id, currentCompany.logoStoragePath);
      await reloadCompany();
      setSavedSuccess("Logo removed.");
      setTimeout(() => setSavedSuccess(''), 3500);
    } catch (err) {
      console.error("Logo remove error:", err);
    } finally {
      setLogoUploading(false);
    }
  };

  const handleInviteMember = async (e) => {
    e.preventDefault();
    if (!inviteForm.email.trim() || !currentCompany) return;
    setInviteLoading(true);
    setError('');

    try {
      const passwordToUse = inviteForm.password.trim() || "password123";
      const res = await registerOrUpdateMemberAuth({
        companyId: currentCompany.id,
        email: inviteForm.email.trim(),
        password: passwordToUse,
        displayName: inviteForm.displayName.trim() || inviteForm.email.split('@')[0],
        role: inviteForm.role
      });
      await loadMembers();
      setInviteModalOpen(false);
      setCreatedCredentials({
        displayName: inviteForm.displayName.trim() || inviteForm.email.split('@')[0],
        email: inviteForm.email.trim(),
        password: passwordToUse,
        role: inviteForm.role
      });
      setInviteForm({ email: '', displayName: '', role: 'STAFF', password: '' });
      setSavedSuccess(`Member ${res.email} added with role ${res.role}!`);
      setTimeout(() => setSavedSuccess(''), 4500);
    } catch (err) {
      console.error("Failed to add member:", err);
      setError("Failed to add team member: " + (err.message || ''));
    } finally {
      setInviteLoading(false);
    }
  };

  const handleSavePasswordForMember = async (e) => {
    e.preventDefault();
    if (!passwordModalMember || !newPasswordInput.trim() || !currentCompany) return;
    setPasswordModalLoading(true);
    try {
      const cleanPass = newPasswordInput.trim();
      await registerOrUpdateMemberAuth({
        companyId: currentCompany.id,
        email: passwordModalMember.email,
        password: cleanPass,
        displayName: passwordModalMember.displayName,
        role: passwordModalMember.role
      });
      await loadMembers();
      setSavedSuccess(`Login password updated for ${passwordModalMember.displayName || passwordModalMember.email}!`);
      setCreatedCredentials({
        displayName: passwordModalMember.displayName || passwordModalMember.email.split('@')[0],
        email: passwordModalMember.email,
        password: cleanPass,
        role: passwordModalMember.role
      });
      setPasswordModalMember(null);
      setNewPasswordInput('');
      setTimeout(() => setSavedSuccess(''), 4500);
    } catch (err) {
      console.error("Failed to set member password:", err);
      alert("Failed to set password: " + (err.message || ''));
    } finally {
      setPasswordModalLoading(false);
    }
  };

  const handleSendResetEmail = async (memberEmail) => {
    if (!memberEmail) return;
    try {
      await sendMemberPasswordReset(memberEmail);
      alert(`Password setup email sent to ${memberEmail}! Please check the inbox.`);
    } catch (err) {
      alert("Failed to send reset email: " + (err.message || ''));
    }
  };

  const handleRoleChange = async (memberUid, newRole) => {
    if (!currentCompany) return;
    try {
      await updateMemberRole(currentCompany.id, memberUid, newRole);
      await loadMembers();
      setSavedSuccess(`Member role successfully updated to ${newRole}!`);
      setTimeout(() => setSavedSuccess(''), 3500);
    } catch (e) {
      console.error("Error updating role:", e);
      setError("Failed to update member role: " + (e.message || ''));
    }
  };

  const handleRemoveMember = async (memberUid) => {
    if (!currentCompany || !window.confirm("Remove this member from company?")) return;
    try {
      await removeCompanyMember(currentCompany.id, memberUid);
      await loadMembers();
    } catch (e) {
      console.error("Error removing member:", e);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Company Settings</h1>
          <p className="text-xs font-medium text-slate-500 mt-1">
            Manage company profile, letterhead branding, numbering rules, team, and billing
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            Role: <strong className="text-amber-600">{role}</strong>
          </span>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{savedSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2 animate-shake">
          <AlertCircle size={16} className="text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 font-bold text-xs transition-colors cursor-pointer shrink-0 ${
            activeTab === 'profile'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 size={16} />
          <span>Company Profile & Branding</span>
        </button>

        <button
          onClick={() => setActiveTab('challan')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 font-bold text-xs transition-colors cursor-pointer shrink-0 ${
            activeTab === 'challan'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Settings2 size={16} />
          <span>Challan Numbering & Format</span>
        </button>

        <button
          onClick={() => setActiveTab('team')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 font-bold text-xs transition-colors cursor-pointer shrink-0 ${
            activeTab === 'team'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users size={16} />
          <span>Team & Roles ({members.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('billing')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 font-bold text-xs transition-colors cursor-pointer shrink-0 ${
            activeTab === 'billing'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CreditCard size={16} />
          <span>Subscription & Billing</span>
        </button>

        <button
          onClick={() => setActiveTab('document')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 font-bold text-xs transition-colors cursor-pointer shrink-0 ${
            activeTab === 'document'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Printer size={16} />
          <span>Document & Print Output</span>
        </button>
      </div>

      {/* TAB CONTENT */}

      {/* 1. COMPANY PROFILE */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="h-20 w-36 bg-white rounded-xl border border-slate-200 flex items-center justify-center p-2 relative overflow-hidden">
              {currentCompany?.logoUrl ? (
                <img src={currentCompany.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
              ) : (
                <span className="text-[10px] font-bold text-slate-400 uppercase">No Logo</span>
              )}
              {logoUploading && (
                <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center">
                  <Loader2 size={18} className="animate-spin text-white" />
                </div>
              )}
            </div>

            <div className="space-y-2 text-center sm:text-left">
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold cursor-pointer">
                  <Upload size={13} />
                  <span>Upload Logo</span>
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                </label>
                {currentCompany?.logoUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-xs font-bold cursor-pointer"
                  >
                    <Trash2 size={13} />
                    <span>Remove</span>
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-500">Logo renders on delivery challans and A4 PDFs.</p>
            </div>
          </div>

          {/* Logo Dimensions & Scaling Controls */}
          <div className="p-5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sliders size={18} className="text-amber-500" />
                <h3 className="text-xs font-black uppercase text-slate-800 tracking-wide">
                  Logo Width & Length (Height) Controls
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-600 bg-white px-2.5 py-1 rounded-md border border-slate-200 font-mono">
                  {logoWidth} mm (W) × {logoHeight} mm (L)
                </span>
                <button
                  type="button"
                  onClick={() => setLockAspectRatio(!lockAspectRatio)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold border transition-colors cursor-pointer ${
                    lockAspectRatio
                      ? 'bg-amber-500/15 border-amber-400 text-amber-800'
                      : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'
                  }`}
                  title={lockAspectRatio ? "Click to unlock independent width & length" : "Click to lock proportional ratio"}
                >
                  {lockAspectRatio ? <Lock size={12} className="text-amber-600" /> : <Unlock size={12} className="text-slate-400" />}
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
                className={`py-2 px-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                  logoSize === 'small' && logoWidth === 34 && logoHeight === 16
                    ? 'bg-amber-500/15 border-amber-500 text-amber-700 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
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
                className={`py-2 px-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                  logoSize === 'medium' && logoWidth === 46 && logoHeight === 21
                    ? 'bg-amber-500/15 border-amber-500 text-amber-700 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <span>Medium (Default)</span>
                <span className="text-[10px] text-slate-400 font-normal">46 × 21 mm</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setLogoSize('large');
                  setLogoWidth(58);
                  setLogoHeight(26);
                }}
                className={`py-2 px-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                  logoSize === 'large' && logoWidth === 58 && logoHeight === 26
                    ? 'bg-amber-500/15 border-amber-500 text-amber-700 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
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
                className={`py-2 px-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                  logoSize === 'square' || (logoWidth === 28 && logoHeight === 28)
                    ? 'bg-amber-500/15 border-amber-500 text-amber-700 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
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
                className={`py-2 px-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-0.5 col-span-2 sm:col-span-1 ${
                  logoSize === 'banner' || (logoWidth === 65 && logoHeight === 18)
                    ? 'bg-amber-500/15 border-amber-500 text-amber-700 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <span>Wide Banner</span>
                <span className="text-[10px] text-slate-400 font-normal">65 × 18 mm</span>
              </button>
            </div>

            {/* DUAL SLIDERS: Width & Length (Height) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Width Slider */}
              <div className="bg-white p-3.5 rounded-lg border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 flex items-center gap-1.5">
                    <ArrowLeftRight size={13} className="text-amber-500" />
                    <span>Logo Width (Horizontal):</span>
                  </span>
                  <span className="font-mono font-bold text-amber-600 text-xs">
                    {logoWidth} mm <span className="text-slate-400 font-normal">({Math.round(logoWidth * 3.78)} px)</span>
                  </span>
                </div>
                <input
                  type="range"
                  min={15}
                  max={80}
                  step={1}
                  value={logoWidth}
                  onChange={(e) => handleWidthChange(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-100 rounded-lg appearance-none"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>15 mm (Min)</span>
                  <span>34 mm</span>
                  <span>46 mm</span>
                  <span>58 mm</span>
                  <span>80 mm (Max)</span>
                </div>
              </div>

              {/* Length / Height Slider */}
              <div className="bg-white p-3.5 rounded-lg border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 flex items-center gap-1.5">
                    <ArrowUpDown size={13} className="text-amber-500" />
                    <span>Logo Length / Height (Vertical):</span>
                  </span>
                  <span className="font-mono font-bold text-amber-600 text-xs">
                    {logoHeight} mm <span className="text-slate-400 font-normal">({Math.round(logoHeight * 3.78)} px)</span>
                  </span>
                </div>
                <input
                  type="range"
                  min={8}
                  max={35}
                  step={1}
                  value={logoHeight}
                  onChange={(e) => handleHeightChange(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-100 rounded-lg appearance-none"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>8 mm (Min)</span>
                  <span>16 mm</span>
                  <span>21 mm</span>
                  <span>26 mm</span>
                  <span>35 mm (Max)</span>
                </div>
              </div>
            </div>

            {/* LIVE LETTERHEAD HEADER PREVIEW */}
            <div className="mt-4 pt-3 border-t border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <Eye size={14} className="text-amber-500" />
                  <span>Live Challan & PDF Header Preview</span>
                </div>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleQuickSaveLogoDimensions(logoWidth, logoHeight, lockAspectRatio, logoSize)}
                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-xs"
                >
                  {saving ? 'Saving...' : 'Apply Logo Dimensions Now'}
                </button>
              </div>

              {/* Realistic A4 Mini Header Box */}
              <div className="bg-white p-5 rounded-xl border border-slate-300 shadow-sm select-none">
                <div className="flex justify-between items-start gap-4">
                  {/* Left: Resizable Logo Box with Width and Height */}
                  <div className="shrink-0 flex items-start">
                    {currentCompany?.logoUrl ? (
                      <img
                        src={currentCompany.logoUrl}
                        alt="Logo Preview"
                        style={{
                          width: `${Math.round(logoWidth * 3.78)}px`,
                          height: `${Math.round(logoHeight * 3.78)}px`,
                          maxWidth: '280px',
                          maxHeight: '120px',
                          objectFit: lockAspectRatio ? 'contain' : 'fill'
                        }}
                        className="transition-all duration-150 border border-dashed border-amber-400/80 p-0.5 rounded bg-slate-50"
                      />
                    ) : (
                      <div
                        style={{
                          width: `${Math.round(logoWidth * 3.78)}px`,
                          height: `${Math.round(logoHeight * 3.78)}px`
                        }}
                        className="bg-slate-900 text-white rounded-lg flex items-center justify-center font-black text-amber-400 text-lg transition-all duration-150"
                      >
                        {(profile.displayName || profile.legalName || 'DC').slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Right: Company Details */}
                  <div className="text-right text-[10px] text-slate-600 space-y-0.5 min-w-0">
                    <h4 className="text-sm font-extrabold text-[#d32f2f] uppercase tracking-wide truncate">
                      {profile.displayName || profile.legalName || "COMPANY NAME"}
                    </h4>
                    <p className="font-semibold text-slate-700 whitespace-pre-line truncate">
                      {profile.address || "Registered Business Address"}{profile.city ? `, ${profile.city}` : ''}
                    </p>
                    {profile.gstin && (
                      <p className="font-mono font-bold text-slate-800">GSTN: {profile.gstin}</p>
                    )}
                    {profile.businessPhone && (
                      <p className="font-bold text-slate-800">Mobile: {profile.businessPhone}</p>
                    )}
                  </div>
                </div>

                <div className="mt-3 text-center">
                  <span className="inline-block border border-slate-800 rounded-full px-6 py-0.5 text-[9px] font-black uppercase tracking-widest text-slate-800">
                    Delivery Challan
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-2 text-center">
                These exact millimeter dimensions ({logoWidth}mm W × {logoHeight}mm L) will be used when rendering both vector PDFs and browser prints.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-slate-700 block mb-1">Legal Company Name *</label>
              <input
                type="text"
                required
                value={profile.legalName}
                onChange={(e) => setProfile({ ...profile, legalName: e.target.value })}
                className="w-full text-sm font-semibold px-3.5 py-2.5 border border-slate-200 rounded-lg focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-slate-700 block mb-1">Display / Brand Name</label>
              <input
                type="text"
                value={profile.displayName}
                onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                className="w-full text-sm font-semibold px-3.5 py-2.5 border border-slate-200 rounded-lg focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-slate-700 block mb-1">GSTIN</label>
              <input
                type="text"
                value={profile.gstin}
                onChange={(e) => setProfile({ ...profile, gstin: e.target.value.toUpperCase() })}
                className="w-full text-sm font-mono font-bold px-3.5 py-2.5 border border-slate-200 rounded-lg focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-slate-700 block mb-1">Business Phone</label>
              <input
                type="tel"
                value={profile.businessPhone}
                onChange={(e) => setProfile({ ...profile, businessPhone: e.target.value })}
                className="w-full text-sm font-semibold px-3.5 py-2.5 border border-slate-200 rounded-lg focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-slate-700 block mb-1">Business Email</label>
              <input
                type="email"
                value={profile.businessEmail}
                onChange={(e) => setProfile({ ...profile, businessEmail: e.target.value })}
                className="w-full text-sm font-semibold px-3.5 py-2.5 border border-slate-200 rounded-lg focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase text-slate-700 block mb-1">Registered Address</label>
            <textarea
              rows={2}
              value={profile.address}
              onChange={(e) => setProfile({ ...profile, address: e.target.value })}
              className="w-full text-sm font-medium px-3.5 py-2 border border-slate-200 rounded-lg focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold uppercase text-slate-700 block mb-1">City</label>
              <input
                type="text"
                value={profile.city}
                onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                className="w-full text-sm font-semibold px-3 py-2 border border-slate-200 rounded-lg focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-slate-700 block mb-1">State</label>
              <input
                type="text"
                value={profile.state}
                onChange={(e) => setProfile({ ...profile, state: e.target.value })}
                className="w-full text-sm font-semibold px-3 py-2 border border-slate-200 rounded-lg focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-slate-700 block mb-1">PIN Code</label>
              <input
                type="text"
                value={profile.pincode}
                onChange={(e) => setProfile({ ...profile, pincode: e.target.value })}
                className="w-full text-sm font-semibold px-3 py-2 border border-slate-200 rounded-lg focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase text-slate-700 block mb-1">Footer Tagline / Slogan</label>
            <input
              type="text"
              value={profile.footerTagline}
              onChange={(e) => setProfile({ ...profile, footerTagline: e.target.value })}
              className="w-full text-sm font-semibold px-3.5 py-2.5 border border-slate-200 rounded-lg focus:border-amber-500 focus:outline-none"
            />
          </div>

          {isAdmin && (
            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md shadow-amber-500/10 cursor-pointer"
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                <span>Save Profile Changes</span>
              </button>
            </div>
          )}
        </form>
      )}

      {/* 2. CHALLAN NUMBERING & FORMAT */}
      {activeTab === 'challan' && (
        <form onSubmit={handleSaveChallanConfig} className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-extrabold text-slate-800">Challan Sequence & Numbering</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Configure your company's dedicated delivery challan numbering sequence.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-slate-700 block mb-1">Challan Prefix *</label>
              <input
                type="text"
                required
                value={challanConfig.prefix}
                onChange={(e) => setChallanConfig({ ...challanConfig, prefix: e.target.value.toUpperCase() })}
                placeholder="e.g. ABC"
                className="w-full text-sm font-mono font-bold uppercase px-3.5 py-2.5 border border-slate-200 rounded-lg focus:border-amber-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Preview: <strong>{challanConfig.prefix}-0001</strong></span>
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-700 block mb-1">Current Sequence Number</label>
              <input
                type="number"
                min={1}
                value={challanConfig.currentSequence !== undefined ? challanConfig.currentSequence : 1}
                onChange={(e) => {
                  const val = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                  setChallanConfig({ ...challanConfig, currentSequence: val });
                }}
                className="w-full text-sm font-semibold px-3.5 py-2.5 border border-slate-200 rounded-lg focus:border-amber-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Next generated: <strong>{challanConfig.prefix || 'DC'}-{String(challanConfig.currentSequence && challanConfig.currentSequence > 0 ? challanConfig.currentSequence : 1).padStart(challanConfig.digits || 4, '0')}</strong>
              </span>
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-700 block mb-1">Padded Digits</label>
              <select
                value={challanConfig.digits || 4}
                onChange={(e) => setChallanConfig({ ...challanConfig, digits: parseInt(e.target.value, 10) })}
                className="w-full text-sm font-semibold px-3.5 py-2.5 border border-slate-200 rounded-lg focus:border-amber-500 focus:outline-none bg-white"
              >
                <option value={3}>3 digits (e.g. 001)</option>
                <option value={4}>4 digits (e.g. 0001)</option>
                <option value={5}>5 digits (e.g. 00001)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase text-slate-700 block mb-1">Document Footer Text</label>
            <input
              type="text"
              value={challanConfig.footerText || ''}
              onChange={(e) => setChallanConfig({ ...challanConfig, footerText: e.target.value })}
              className="w-full text-sm font-semibold px-3.5 py-2.5 border border-slate-200 rounded-lg focus:border-amber-500 focus:outline-none"
            />
          </div>

          {isAdmin && (
            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md shadow-amber-500/10 cursor-pointer"
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                <span>Save Numbering Settings</span>
              </button>
            </div>
          )}
        </form>
      )}

      {/* 3. TEAM & ROLES */}
      {activeTab === 'team' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <div>
              <h3 className="text-base font-extrabold text-slate-800">Team Members & Access Roles</h3>
              <p className="text-xs text-slate-400">Invite staff members to view or generate challans for this company</p>
            </div>

            {isAdmin && (
              <button
                onClick={() => setInviteModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs shadow-sm cursor-pointer"
              >
                <Plus size={14} />
                <span>Invite Member</span>
              </button>
            )}
          </div>

          {membersLoading ? (
            <div className="p-8 text-center text-slate-400">Loading members...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-6">Member</th>
                    <th className="py-3 px-6">Email</th>
                    <th className="py-3 px-6">Role</th>
                    <th className="py-3 px-6 text-center">Status</th>
                    {isAdmin && <th className="py-3 px-6 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {members.map((m) => (
                    <tr key={m.uid} className="hover:bg-slate-50/60">
                      <td className="py-3.5 px-6 font-bold text-slate-800">{m.displayName || "User"}</td>
                      <td className="py-3.5 px-6 text-slate-600 font-mono">{m.email}</td>
                      <td className="py-3.5 px-6">
                        {isOwner && m.role !== 'OWNER' ? (
                          <select
                            value={m.role}
                            onChange={(e) => handleRoleChange(m.uid, e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-bold text-slate-800"
                          >
                            <option value="ADMIN">ADMIN</option>
                            <option value="STAFF">STAFF</option>
                            <option value="VIEWER">VIEWER</option>
                          </select>
                        ) : (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            m.role === 'OWNER' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {m.role}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-6 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                          {m.status || 'ACTIVE'}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="py-3.5 px-6 text-right space-x-3">
                          {m.role !== 'OWNER' && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setPasswordModalMember(m);
                                  setNewPasswordInput('');
                                }}
                                className="text-amber-600 hover:text-amber-700 font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                                title="Set login password or send setup email"
                              >
                                <KeyRound size={13} />
                                <span>Set Password</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveMember(m.uid)}
                                className="text-red-500 hover:text-red-700 font-bold text-xs cursor-pointer"
                              >
                                Remove
                              </button>
                            </>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 4. SUBSCRIPTION & BILLING */}
      {activeTab === 'billing' && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <h3 className="text-base font-extrabold text-slate-800">Monthly Subscription & Billing Status</h3>
              <p className="text-xs text-slate-400">Manage your company subscription plan, monthly cycle, and payment history</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${subscriptionStatus?.badgeColor || 'bg-emerald-500 text-white'}`}>
              {subscriptionStatus?.displayStatus || 'ACTIVE'}
            </span>
          </div>

          {/* Current Plan Overview Card */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 shadow-md">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Active Workspace Plan</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono border border-slate-700">
                  {subscriptionStatus?.planId || 'pro_monthly'}
                </span>
              </div>
              <h2 className="text-2xl font-black">{subscriptionStatus?.planName || 'Pro Monthly Subscription'}</h2>
              <div className="text-xs text-slate-300 flex flex-wrap gap-x-4 gap-y-1">
                <span>Billing: <strong>₹{subscriptionStatus?.amount || 500} / month</strong></span>
                <span>•</span>
                <span>Current Month: <strong>{subscriptionStatus?.currentMonthFormatted}</strong> ({subscriptionStatus?.isPaid ? '✅ Paid & Active' : '❌ Unpaid'})</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 shrink-0 w-full sm:w-auto">
              <button
                onClick={onOpenSubscription}
                className="flex items-center justify-center gap-2 px-5 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md cursor-pointer"
              >
                <Zap size={16} />
                <span>{subscriptionStatus?.isPaid ? 'Renew / Change Plan' : 'Pay ₹500 Subscription'}</span>
              </button>
            </div>
          </div>

          {/* 3 Schedule Rules Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
              <div className="flex items-center gap-2 text-amber-600 font-bold text-xs uppercase tracking-wider">
                <Calendar size={14} />
                <span>1. Monthly Cycle</span>
              </div>
              <div className="text-sm font-black text-slate-900">1st & 2nd of Month</div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Renewal notices are generated. An alert message appears on the website reminding you to pay your monthly subscription.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
              <div className="flex items-center gap-2 text-red-600 font-bold text-xs uppercase tracking-wider">
                <Clock size={14} />
                <span>2. Final Deadline</span>
              </div>
              <div className="text-sm font-black text-slate-900">3rd of Month Cutoff</div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                From the 3rd, unpaid accounts are locked automatically. Challan creation and workspace access pause until payment is completed.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
              <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider">
                <ShieldCheck size={14} />
                <span>3. Instant Re-Activation</span>
              </div>
              <div className="text-sm font-black text-slate-900">Instant Razorpay Unlock</div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Paying via UPI, card, or netbanking immediately marks the month as paid in the database and restores instant access.
              </p>
            </div>
          </div>

          {/* Billing Cycle Simulator Tool */}
          <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h4 className="text-xs font-black text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-600" />
                  <span>Interactive Billing Cycle & Lock Simulator</span>
                </h4>
                <p className="text-[11px] text-amber-800">
                  Simulate different days of the month to verify the alert messages on Day 1 & 2 and the lockout screen on Day 3+.
                </p>
              </div>

              {simulatedDay && (
                <span className="text-xs bg-amber-200 text-amber-950 font-black px-2.5 py-1 rounded-full">
                  Currently Simulated: Day {simulatedDay}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => setSimulatedDay(1)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                  simulatedDay === 1
                    ? 'bg-amber-500 text-slate-950 border-amber-600 font-black'
                    : 'bg-white text-slate-800 border-amber-300 hover:bg-amber-100'
                }`}
              >
                📅 Simulate Day 1 (Alert Banner)
              </button>

              <button
                type="button"
                onClick={() => setSimulatedDay(2)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                  simulatedDay === 2
                    ? 'bg-amber-500 text-slate-950 border-amber-600 font-black'
                    : 'bg-white text-slate-800 border-amber-300 hover:bg-amber-100'
                }`}
              >
                📅 Simulate Day 2 (Alert Banner)
              </button>

              <button
                type="button"
                onClick={() => setSimulatedDay(3)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                  simulatedDay === 3
                    ? 'bg-red-500 text-white border-red-600 font-black'
                    : 'bg-white text-slate-800 border-red-300 hover:bg-red-50'
                }`}
              >
                🔒 Simulate Day 3+ (Locked Screen)
              </button>

              <button
                type="button"
                onClick={async () => {
                  await recordPayment({
                    paymentId: `pay_sim_${Date.now()}`,
                    amount: 500,
                    currency: 'INR'
                  });
                  await reloadCompany();
                  alert("Marked current month as PAID in database!");
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-700 transition-all cursor-pointer"
              >
                ✅ Test Pay ₹500 & Mark Month Paid
              </button>

              <button
                type="button"
                onClick={() => setSimulatedDay(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-slate-600 border border-slate-300 hover:bg-slate-100 transition-all cursor-pointer"
              >
                Reset to Real Today
              </button>
            </div>
          </div>

          {/* Payment History Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Payment History & Invoices
              </h4>
              <span className="text-[11px] text-slate-400">
                {subscriptionStatus?.paymentHistory?.length || 0} recorded transaction(s)
              </span>
            </div>

            {(!subscriptionStatus?.paymentHistory || subscriptionStatus.paymentHistory.length === 0) ? (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
                No past transactions recorded yet. Once a subscription is paid, payment IDs and invoices will appear here.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4">Period / Month</th>
                      <th className="py-2.5 px-4">Plan</th>
                      <th className="py-2.5 px-4">Amount</th>
                      <th className="py-2.5 px-4">Transaction / Razorpay ID</th>
                      <th className="py-2.5 px-4">Date</th>
                      <th className="py-2.5 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {subscriptionStatus.paymentHistory.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-4 font-bold text-slate-900">{p.paidMonth || 'Monthly'}</td>
                        <td className="py-2.5 px-4 text-slate-700">{p.planName || 'Pro Monthly'}</td>
                        <td className="py-2.5 px-4 font-extrabold text-slate-900">₹{p.amount}</td>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500">{p.paymentId}</td>
                        <td className="py-2.5 px-4 text-slate-500">{p.paidAt ? new Date(p.paidAt).toLocaleDateString('en-IN') : '—'}</td>
                        <td className="py-2.5 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                            {p.status || 'SUCCESS'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. DOCUMENT OUTPUT & PRINTING */}
      {activeTab === 'document' && (
        <form onSubmit={handleSaveDocOutput} className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-2">
            <div>
              <h3 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
                <Printer size={18} className="text-amber-500" />
                Document Output & Printing Defaults
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Configure default paper formats, document copies, item column visibility, terms, and signature styling.
              </p>
            </div>
            {isAdmin && (
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50 self-start sm:self-auto"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                <span>Save Document Settings</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Paper Format */}
            <div className="space-y-2 p-4 rounded-xl border border-slate-200 bg-slate-50/50">
              <label className="text-xs font-bold uppercase text-slate-700 block">
                Default Paper Format
              </label>
              <p className="text-[11px] text-slate-500">
                Choose the standard paper format used when downloading or printing challans.
              </p>
              <select
                value={docOutputConfig.defaultPaperSize}
                onChange={(e) => setDocOutputConfig({ ...docOutputConfig, defaultPaperSize: e.target.value })}
                className="w-full text-xs font-bold px-3 py-2 border border-slate-200 rounded-lg bg-white"
                disabled={!isAdmin}
              >
                <option value="a4">A4 Portrait (210 x 297 mm) — Standard Indian Business Sheet</option>
                <option value="a5">A5 Compact (148 x 210 mm) — Half Sheet / Landscape</option>
                <option value="thermal80">80mm POS Thermal Receipt (Receipt Printers)</option>
                <option value="thermal58">58mm POS Thermal Receipt (Mini Portable Printers)</option>
              </select>
            </div>

            {/* Default Copies */}
            <div className="space-y-2 p-4 rounded-xl border border-slate-200 bg-slate-50/50">
              <label className="text-xs font-bold uppercase text-slate-700 block">
                Default Document Copy
              </label>
              <p className="text-[11px] text-slate-500">
                Default copy title banner printed at the top of the challan.
              </p>
              <select
                value={docOutputConfig.defaultCopyType}
                onChange={(e) => setDocOutputConfig({ ...docOutputConfig, defaultCopyType: e.target.value })}
                className="w-full text-xs font-bold px-3 py-2 border border-slate-200 rounded-lg bg-white"
                disabled={!isAdmin}
              >
                <option value="original">ORIGINAL FOR RECIPIENT</option>
                <option value="duplicate">DUPLICATE FOR TRANSPORTER</option>
                <option value="triplicate">TRIPLICATE FOR SUPPLIER</option>
                <option value="all">ALL 3 COPIES (Triplicate Set in one PDF)</option>
              </select>
            </div>
          </div>

          {/* Table Column Visibility Options */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
            <h4 className="text-xs font-bold uppercase text-slate-700">
              Item Table Column Visibility
            </h4>
            <p className="text-[11px] text-slate-500">
              Customize which columns appear on print and PDF documents.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={docOutputConfig.hideRates}
                  onChange={(e) => setDocOutputConfig({ ...docOutputConfig, hideRates: e.target.checked })}
                  className="rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                  disabled={!isAdmin}
                />
                <span>Hide Rates & Amounts</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={docOutputConfig.hideTax}
                  onChange={(e) => setDocOutputConfig({ ...docOutputConfig, hideTax: e.target.checked })}
                  className="rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                  disabled={!isAdmin}
                />
                <span>Hide Tax Details</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={docOutputConfig.hideHsn}
                  onChange={(e) => setDocOutputConfig({ ...docOutputConfig, hideHsn: e.target.checked })}
                  className="rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                  disabled={!isAdmin}
                />
                <span>Hide HSN/SAC Column</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={docOutputConfig.hideSku}
                  onChange={(e) => setDocOutputConfig({ ...docOutputConfig, hideSku: e.target.checked })}
                  className="rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                  disabled={!isAdmin}
                />
                <span>Hide Product Code / SKU</span>
              </label>
            </div>
          </div>

          {/* Signatory Area Titles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-slate-700 block mb-1">
                Authorized Signatory Label
              </label>
              <input
                type="text"
                value={docOutputConfig.signatoryTitle}
                onChange={(e) => setDocOutputConfig({ ...docOutputConfig, signatoryTitle: e.target.value })}
                placeholder="Authorised Signatory"
                className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 rounded-lg"
                disabled={!isAdmin}
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-700 block mb-1">
                Receiver Acknowledgment Label
              </label>
              <input
                type="text"
                value={docOutputConfig.receiverTitle}
                onChange={(e) => setDocOutputConfig({ ...docOutputConfig, receiverTitle: e.target.value })}
                placeholder="Receiver's Acknowledgment"
                className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 rounded-lg"
                disabled={!isAdmin}
              />
            </div>
          </div>

          {/* Terms and Conditions */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold uppercase text-slate-700 block">
                Standard Terms & Conditions
              </label>
              <button
                type="button"
                onClick={() => setDocOutputConfig({ ...docOutputConfig, termsAndConditions: DEFAULT_TERMS_AND_CONDITIONS })}
                className="text-[11px] font-bold text-amber-600 hover:text-amber-700 hover:underline cursor-pointer"
              >
                Reset to CGST Rule 55 Default
              </button>
            </div>
            <textarea
              rows={3}
              value={docOutputConfig.termsAndConditions}
              onChange={(e) => setDocOutputConfig({ ...docOutputConfig, termsAndConditions: e.target.value })}
              className="w-full text-xs font-medium px-3 py-2 border border-slate-200 rounded-lg leading-relaxed"
              placeholder="Enter standard terms to be printed on every challan..."
              disabled={!isAdmin}
            />
          </div>

          {/* Footer Tagline */}
          <div>
            <label className="text-xs font-bold uppercase text-slate-700 block mb-1">
              Bottom Tagline / Banner Text
            </label>
            <input
              type="text"
              value={docOutputConfig.footerTagline}
              onChange={(e) => setDocOutputConfig({ ...docOutputConfig, footerTagline: e.target.value })}
              placeholder="Thank you for your business"
              className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 rounded-lg"
              disabled={!isAdmin}
            />
          </div>

          {isAdmin && (
            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                <span>Save Document & Print Settings</span>
              </button>
            </div>
          )}
        </form>
      )}

      {/* Invite Member Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white p-6 rounded-2xl max-w-md w-full shadow-2xl border border-slate-100">
            <h3 className="text-base font-black text-slate-900">Invite Team Member</h3>
            <p className="text-xs text-slate-500 mt-1">Assign appropriate role permissions for this company.</p>

            <form onSubmit={handleInviteMember} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-bold uppercase text-slate-700 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={inviteForm.displayName}
                  onChange={(e) => setInviteForm({ ...inviteForm, displayName: e.target.value })}
                  placeholder="e.g. Suresh Kumar"
                  className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-700 block mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  placeholder="suresh@company.com"
                  className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-700 block mb-1">Role *</label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                  className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 bg-white"
                >
                  <option value="STAFF">STAFF (Create, edit, view & print challans)</option>
                  <option value="ADMIN">ADMIN (Full management including settings & delete)</option>
                  <option value="VIEWER">VIEWER (Read-only access)</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold uppercase text-slate-700">Login Password *</label>
                  <button
                    type="button"
                    onClick={() => {
                      const randPass = Math.random().toString(36).slice(-6) + '@' + Math.floor(100 + Math.random() * 900);
                      setInviteForm({ ...inviteForm, password: randPass });
                    }}
                    className="text-[10px] text-amber-600 hover:text-amber-700 font-bold cursor-pointer"
                  >
                    🎲 Generate Password
                  </button>
                </div>
                <input
                  type="text"
                  required
                  minLength={6}
                  value={inviteForm.password}
                  onChange={(e) => setInviteForm({ ...inviteForm, password: e.target.value })}
                  placeholder="e.g. Mano@123 (min 6 characters)"
                  className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Share this password with the member so they can log in at the login screen.
                </p>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                  className="w-1/2 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteLoading}
                  className="w-1/2 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-black text-xs rounded-lg flex items-center justify-center gap-1.5"
                >
                  {inviteLoading ? <Loader2 size={14} className="animate-spin" /> : 'Add Member & Set Login'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Set / Change Member Password Modal */}
      {passwordModalMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white p-6 rounded-2xl max-w-md w-full shadow-2xl border border-slate-100">
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-amber-500/15 text-amber-600">
                <KeyRound size={16} />
              </span>
              <h3 className="text-base font-black text-slate-900">
                Set Login Password
              </h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Set or update direct login credentials for <span className="font-mono font-bold text-slate-800">{passwordModalMember.displayName || passwordModalMember.email}</span>.
            </p>

            <form onSubmit={handleSavePasswordForMember} className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold uppercase text-slate-700">New Password *</label>
                  <button
                    type="button"
                    onClick={() => {
                      const randPass = Math.random().toString(36).slice(-6) + '@' + Math.floor(100 + Math.random() * 900);
                      setNewPasswordInput(randPass);
                    }}
                    className="text-[10px] text-amber-600 hover:text-amber-700 font-bold cursor-pointer"
                  >
                    🎲 Generate Password
                  </button>
                </div>
                <input
                  type="text"
                  required
                  minLength={6}
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="e.g. Mano@123 (min 6 characters)"
                  className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
                <div className="font-bold text-slate-700">Login Account Details:</div>
                <div>Email: <strong className="font-mono text-slate-900">{passwordModalMember.email}</strong></div>
                <div>Role: <strong className="text-amber-700 font-bold">{passwordModalMember.role}</strong></div>
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="submit"
                  disabled={passwordModalLoading}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                >
                  {passwordModalLoading ? <Loader2 size={15} className="animate-spin" /> : 'Save Password & Enable Login'}
                </button>

                <button
                  type="button"
                  onClick={() => handleSendResetEmail(passwordModalMember.email)}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 cursor-pointer"
                >
                  ✉️ Send Password Setup Link to Member's Email
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPasswordModalMember(null);
                    setNewPasswordInput('');
                  }}
                  className="w-full py-1.5 text-slate-400 hover:text-slate-600 font-semibold text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Created Credentials Modal (Easy Copy to Share) */}
      {createdCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white p-6 rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-600">
                <CheckCircle2 size={18} />
              </span>
              <h3 className="text-base font-black text-slate-900">Member Credentials Ready!</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Share these login credentials with <strong>{createdCredentials.displayName}</strong> so they can log into the Nayaruvi portal:
            </p>

            <div className="p-3.5 rounded-xl bg-slate-900 text-white font-mono text-xs space-y-1.5">
              <div><span className="text-slate-400">Login URL: </span>{window.location.origin}/login</div>
              <div><span className="text-slate-400">Email: </span><span className="text-amber-400 font-bold">{createdCredentials.email}</span></div>
              <div><span className="text-slate-400">Password: </span><span className="text-emerald-400 font-bold">{createdCredentials.password || "(Sent via Email)"}</span></div>
              <div><span className="text-slate-400">Role: </span><span className="text-amber-300 font-bold">{createdCredentials.role}</span></div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const text = `Nayaruvi Delivery Challan Login Details:\nPortal: ${window.location.origin}/login\nEmail: ${createdCredentials.email}\nPassword: ${createdCredentials.password || '(Check email)'}\nRole: ${createdCredentials.role}`;
                  navigator.clipboard.writeText(text);
                  alert("Credentials copied to clipboard!");
                }}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Copy size={14} />
                <span>Copy Credentials</span>
              </button>

              <button
                type="button"
                onClick={() => setCreatedCredentials(null)}
                className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
