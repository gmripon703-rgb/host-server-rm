import React, { useState } from 'react';
import { Server, Lock, Mail, ShieldAlert, ArrowRight, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const autofill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-950 px-4 py-12 text-slate-100 sm:px-6 lg:px-8">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-indigo-600/10 blur-3xl"></div>
        <div className="absolute top-1/2 right-10 h-72 w-72 rounded-full bg-emerald-600/5 blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-md space-y-8">
        {/* Logo and title */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-emerald-500 shadow-xl shadow-indigo-500/20">
            <Server className="h-7 w-7 text-white" />
          </div>
          <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            NexusControl
          </h2>
          <p className="mt-1.5 text-xs text-slate-400">
            Private Web Hosting, Storage & AI Asset Control Panel
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-950/40 p-3.5 text-xs text-red-200">
                <ShieldAlert className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                <div className="leading-relaxed">{error}</div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Email Address
              </label>
              <div className="relative mt-1.5">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@nexus.internal"
                  className="block w-full rounded-lg border border-slate-700 bg-slate-950/70 py-2.5 pl-10 pr-3 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Password
                </label>
                <span className="text-[11px] text-slate-500">Encrypted SHA-512</span>
              </div>
              <div className="relative mt-1.5">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full rounded-lg border border-slate-700 bg-slate-950/70 py-2.5 pl-10 pr-10 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 px-4 text-sm font-semibold text-white shadow-md hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <span>Sign In to Admin Panel</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials Autofill */}
          <div className="mt-6 border-t border-slate-800 pt-5">
            <p className="text-center text-xs font-medium text-slate-400">
              Quick Test Credentials:
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => autofill('admin@nexus.internal', 'Admin@Nexus2026!')}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-950/30 p-2 text-xs font-semibold text-indigo-300 hover:bg-indigo-900/40 transition-colors"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-indigo-400" />
                <span>Super Admin</span>
              </button>
              <button
                type="button"
                onClick={() => autofill('engineer@nexus.internal', 'NexusMember#2026')}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/50 p-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>Team Member</span>
              </button>
            </div>
          </div>
        </div>

        {/* Security architecture highlights */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 text-[11px] text-slate-400">
          <div className="flex items-center justify-between font-semibold text-slate-300">
            <span>Security Architecture</span>
            <span className="text-emerald-400">Zero Client Secrets</span>
          </div>
          <p className="mt-1 leading-relaxed text-slate-400">
            Google Drive keys, service accounts, and session secrets are strictly isolated on the backend. Frontend JavaScript never exposes storage credentials or tokens.
          </p>
        </div>
      </div>
    </div>
  );
};
