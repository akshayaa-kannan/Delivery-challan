import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  Lock, 
  Mail, 
  AlertCircle, 
  Loader2, 
  CheckCircle2, 
  ArrowRight,
  KeyRound
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const { login, resetPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect back to original path or app dashboard
  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      console.error("Login failed:", err);
      let msg = "Invalid email or password.";
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = "Invalid email or password. Please try again.";
      } else if (err.code === 'auth/too-many-requests') {
        msg = "Too many failed attempts. Please reset your password or try again later.";
      } else if (err.message) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;

    setResetLoading(true);
    setResetSuccess('');
    setError('');
    try {
      await resetPassword(resetEmail);
      setResetSuccess(`Password reset email sent to ${resetEmail}. Check your inbox.`);
      setTimeout(() => {
        setForgotModalOpen(false);
        setResetSuccess('');
      }, 4000);
    } catch (err) {
      console.error("Password reset error:", err);
      setError("Failed to send password reset email. Please ensure the email is correct.");
    } finally {
      setResetLoading(false);
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
          <h2 className="text-xl font-bold text-slate-200">Delivery Challan Portal</h2>
          <p className="text-xs text-slate-400 mt-1">Sign in to your company workspace</p>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-2xl rounded-2xl border border-slate-100">
          {error && (
            <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold space-y-2">
              <div className="flex items-start gap-2.5">
                <AlertCircle size={16} className="shrink-0 text-red-600 mt-0.5" />
                <span>{error}</span>
              </div>
              {(error.toLowerCase().includes('register') || error.toLowerCase().includes('no company account')) && (
                <div className="pt-1.5 pl-6">
                  <Link 
                    to="/register" 
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-black shadow-xs transition-all"
                  >
                    <span>Click here to Register New Company</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Multi-Role Guidance Box */}
          <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
            <span className="font-extrabold text-slate-800 block mb-0.5">Owners & Team Staff Login:</span>
            <span>Sign in with your email and password. Staff members created by an organization owner log in directly here.</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                Work Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <Mail size={16} />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full text-sm font-semibold pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all bg-slate-50/50"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setForgotModalOpen(true)}
                  className="text-xs font-bold text-amber-600 hover:text-amber-700 cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <Lock size={16} />
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-sm font-semibold pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all bg-slate-50/50"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 rounded-xl text-sm font-black shadow-md shadow-amber-500/20 hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Demo Hint */}
          <div className="mt-4 p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl text-[11px] text-amber-900 leading-relaxed">
            <span className="font-extrabold block text-amber-950 mb-0.5">Demo Account (Offline Mode):</span>
            <span>Email: <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono font-bold text-amber-950">admin@nayaruvi.com</code> | Password: <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono font-bold text-amber-950">password123</code></span>
          </div>

          {/* Bottom Onboarding Navigation */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
            <Link to="/register" className="font-extrabold text-amber-600 hover:text-amber-700 underline">
              Register New Company
            </Link>
            <Link to="/accept-invite" className="font-bold text-slate-500 hover:text-slate-800">
              Have an Invite Token?
            </Link>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
          <div className="bg-white p-6 sm:p-8 rounded-2xl max-w-sm w-full shadow-2xl border border-slate-100">
            <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
              <KeyRound size={20} />
            </div>
            <h3 className="text-lg font-black text-slate-800">Reset Password</h3>
            <p className="text-xs text-slate-500 mt-1">
              Enter your email address and we will send you a password reset link.
            </p>

            {resetSuccess && (
              <div className="my-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-lg flex items-center gap-2">
                <CheckCircle2 size={16} className="shrink-0" />
                <span>{resetSuccess}</span>
              </div>
            )}

            <form onSubmit={handlePasswordReset} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setForgotModalOpen(false)}
                  className="w-1/2 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-1/2 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-black text-xs rounded-lg flex items-center justify-center gap-1.5"
                >
                  {resetLoading ? <Loader2 size={14} className="animate-spin" /> : 'Send Reset Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
