import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { 
  Building2, 
  UserCheck, 
  Lock, 
  Mail, 
  User, 
  KeyRound, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  ShieldCheck 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getMemberInvitationByToken, acceptInviteAndCreateAccount } from '../utils/storage';

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const tokenParam = searchParams.get('token') || '';
  const navigate = useNavigate();
  const { login } = useAuth();

  const [token, setToken] = useState(tokenParam);
  const [inviteDetails, setInviteDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (tokenParam) {
      handleVerifyToken(tokenParam);
    }
  }, [tokenParam]);

  const handleVerifyToken = async (tokenToVerify) => {
    const cleanToken = (tokenToVerify || '').trim();
    if (!cleanToken) {
      setError('Please provide an invitation token.');
      return;
    }

    try {
      setVerifying(true);
      setError('');
      const inv = await getMemberInvitationByToken(cleanToken);
      if (!inv) {
        setError('Invalid or expired invitation token. Please ask your administrator to send a new invite.');
        setInviteDetails(null);
        return;
      }
      if (inv.status !== 'PENDING') {
        setError(`This invitation has already been ${inv.status.toLowerCase()}.`);
        setInviteDetails(null);
        return;
      }
      setInviteDetails(inv);
      setFullName(inv.email.split('@')[0]);
    } catch (err) {
      setError(err.message || 'Error verifying invitation token.');
    } finally {
      setVerifying(false);
    }
  };

  const handleAccept = async (e) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim()) {
      setError('Please provide your full name.');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      const res = await acceptInviteAndCreateAccount({
        token: inviteDetails.token,
        password,
        displayName: fullName.trim()
      });

      setSuccess(`Welcome to ${res.companyName}! Logging you into your workspace...`);

      // Automatically sign in the user
      setTimeout(async () => {
        try {
          await login(res.email, password);
          navigate('/', { replace: true });
        } catch (loginErr) {
          // If auto login encounters an issue, route to login page
          navigate('/login', { replace: true });
        }
      }, 1500);
    } catch (err) {
      console.error('Accept invite error:', err);
      setError(err.message || 'Failed to complete registration.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Header */}
        <div className="flex flex-col items-center">
          <Link to="/" className="flex items-center gap-2 mb-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shadow-amber-500/20">
              N
            </div>
            <span className="text-2xl font-black text-white tracking-tight">NAYARUVI</span>
          </Link>
          <h2 className="text-xl font-bold text-slate-200">Accept Team Invitation</h2>
          <p className="text-xs text-slate-400 mt-1">Join your organization's delivery workspace</p>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-2xl rounded-2xl border border-slate-100">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold flex items-center gap-2.5">
              <AlertCircle size={16} className="shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2.5">
              <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
              <span>{success}</span>
            </div>
          )}

          {!inviteDetails ? (
            /* Token Input View */
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                  Invitation Token
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                    <KeyRound size={16} />
                  </span>
                  <input
                    type="text"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Paste 32-character invite token"
                    className="w-full text-xs font-mono font-semibold pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all bg-slate-50/50"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleVerifyToken(token)}
                disabled={verifying || !token.trim()}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 rounded-xl text-xs font-black shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
              >
                {verifying ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Verifying Invitation...</span>
                  </>
                ) : (
                  <>
                    <span>Verify Invitation Token</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>
          ) : (
            /* Invitation Confirmed & Password Setup Form */
            <form onSubmit={handleAccept} className="space-y-4">
              {/* Organization Card Banner */}
              <div className="p-3.5 bg-amber-50 border border-amber-200/80 rounded-xl space-y-1">
                <div className="flex items-center gap-2 text-xs font-extrabold text-amber-950">
                  <Building2 size={15} className="text-amber-600" />
                  <span>{inviteDetails.companyName}</span>
                </div>
                <div className="text-[11px] text-amber-800">
                  You are invited to join as <span className="font-bold underline">{inviteDetails.role}</span>.
                </div>
              </div>

              {/* Invited Email (Read-Only) */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Work Email (Assigned)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                    <Mail size={16} />
                  </span>
                  <input
                    type="email"
                    disabled
                    value={inviteDetails.email}
                    className="w-full text-xs font-bold pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg bg-slate-100 text-slate-600 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Your Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                    <User size={16} />
                  </span>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full text-xs font-semibold pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-slate-50/50"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Choose Login Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                    <Lock size={16} />
                  </span>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full text-xs font-semibold pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-slate-50/50"
                  />
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Confirm Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                    <Lock size={16} />
                  </span>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full text-xs font-semibold pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-slate-50/50"
                  />
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 rounded-xl text-xs font-black shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Activating Account...</span>
                  </>
                ) : (
                  <>
                    <UserCheck size={16} />
                    <span>Complete Setup & Join Company</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Links */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-slate-600">
            <Link to="/login" className="hover:text-amber-600 font-bold">
              Already have an account? Sign In
            </Link>
            <span className="text-slate-300">|</span>
            <Link to="/register" className="hover:text-amber-600 font-bold">
              Register New Company
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
