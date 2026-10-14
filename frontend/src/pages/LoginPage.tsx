import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Mail, Lock, ArrowRight, ShieldCheck, UserCheck, TrendingUp, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { PasswordInput } from '../components/common/PasswordInput';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { success, error: toastError } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    try {
      await login(email, password);
      success('Welcome back! Logged in successfully.');
      navigate('/dashboard');
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Authentication failed. Please check credentials.';
      setErrorMessage(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-900 selection:bg-indigo-500 selection:text-white">
      {/* Left Hero Panel */}
      <div className="md:w-1/2 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 p-8 sm:p-12 lg:p-16 flex flex-col justify-between text-white relative overflow-hidden">
        {/* Glow circles */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Brand */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-11 h-11 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-xl shadow-indigo-600/40">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">
              Lead<span className="text-indigo-400">Nova</span>
            </h1>
            <p className="text-xs text-indigo-300 font-medium">
              Intelligent Customer Enquiry Tracking and Advanced Sales Analytics Platform
            </p>
          </div>
        </div>

        {/* Hero Content */}
        <div className="my-12 relative z-10 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-400/20 text-indigo-300 text-xs font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Next-Generation Sales Automation</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
            Elevate Your <br />
            <span className="bg-gradient-to-r from-indigo-300 via-purple-300 to-white bg-clip-text text-transparent">
              Sales Pipeline.
            </span>
          </h2>
          <p className="mt-4 text-base text-slate-300 leading-relaxed font-normal">
            Track high-value enquiries from first touch to conversion. Automate follow-ups, ingest email leads via IMAP, and unlock real-time revenue analytics.
          </p>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-xs text-slate-500">
          © {new Date().getFullYear()} LeadNova Platform. Standalone CRM Application.
        </div>
      </div>

      {/* Right Login Form */}
      <div className="md:w-1/2 bg-white flex items-center justify-center p-8 sm:p-12 lg:p-16">
        <div className="max-w-md w-full">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Sign in to your account</h2>
            <p className="mt-1.5 text-sm text-slate-500">
              Enter your credentials to access your sales workspace
            </p>
          </div>

          {errorMessage && (
            <div className="mt-6 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-900 text-sm">
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Work Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Password
              </label>
              <PasswordInput
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="py-2.5 rounded-xl border-slate-200"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Login Fillers */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Quick Demo Access
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@leadnova.com', 'Admin@12345')}
                className="flex items-center justify-center gap-1.5 p-2 rounded-xl border border-purple-200 bg-purple-50/50 hover:bg-purple-100 text-purple-900 text-xs font-semibold transition"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                <span>Admin</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('sales1@leadnova.com', 'Sales@12345')}
                className="flex items-center justify-center gap-1.5 p-2 rounded-xl border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100 text-indigo-900 text-xs font-semibold transition"
              >
                <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                <span>Sales User</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('manager@leadnova.com', 'Manager@12345')}
                className="flex items-center justify-center gap-1.5 p-2 rounded-xl border border-sky-200 bg-sky-50/50 hover:bg-sky-100 text-sky-900 text-xs font-semibold transition"
              >
                <TrendingUp className="w-3.5 h-3.5 text-sky-600" />
                <span>Manager</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
