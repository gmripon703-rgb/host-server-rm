import React, { useState, useEffect } from 'react';
import {
  Settings,
  HardDrive,
  Shield,
  Key,
  Database,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Lock,
  Globe,
  Save,
  Server,
  Eye,
} from 'lucide-react';
import { SystemConfig, StorageProviderInfo, ProviderConnectionStatus } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ActiveTab } from './Sidebar';

interface SettingsViewProps {
  config: SystemConfig | null;
  activeProvider: any;
  onRefreshConfig: () => void;
  onNavigate: (tab: ActiveTab) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  config,
  activeProvider,
  onRefreshConfig,
  onNavigate,
}) => {
  const { isAdmin } = useAuth();
  const [subTab, setSubTab] = useState<'storage' | 'general' | 'security' | 'env'>('storage');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // General Settings Form
  const [siteName, setSiteName] = useState(config?.siteName || 'NexusControl Admin Panel');
  const [rootFolder, setRootFolder] = useState(config?.storageRootFolder || 'AI-HOST');
  const [defaultVisibility, setDefaultVisibility] = useState(config?.defaultFileVisibility || 'PRIVATE');

  // Environment status
  const [envStatus, setEnvStatus] = useState<Record<string, any> | null>(null);
  const [testingStorage, setTestingStorage] = useState(false);
  const [testResult, setTestResult] = useState<ProviderConnectionStatus | null>(null);

  useEffect(() => {
    if (config) {
      setSiteName(config.siteName);
      setRootFolder(config.storageRootFolder);
      setDefaultVisibility(config.defaultFileVisibility);
    }
  }, [config]);

  const fetchEnv = async () => {
    try {
      const res = await api.config.getEnvironment();
      setEnvStatus(res.environment);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (subTab === 'env') {
      fetchEnv();
    }
  }, [subTab]);

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      await api.config.update({
        siteName,
        storageRootFolder: rootFolder,
        defaultFileVisibility: defaultVisibility as any,
      });
      setSaveSuccess(true);
      onRefreshConfig();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update system configuration.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestStorage = async () => {
    setTestingStorage(true);
    setTestResult(null);
    try {
      const res = await api.storage.testConnection();
      setTestResult(res);
    } catch (err: any) {
      setError(err.message || 'Storage connection test failed.');
    } finally {
      setTestingStorage(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="rounded bg-indigo-500/10 px-2 py-0.5 text-xs font-semibold text-indigo-400">
              System Configuration
            </span>
            <span className="text-xs text-slate-400">Global Parameters & Environment</span>
          </div>
          <h2 className="text-lg font-bold text-white sm:text-xl">
            Control Panel Settings
          </h2>
          <p className="max-w-2xl text-xs text-slate-400">
            Configure storage root folders, system parameters, access control policies, and verify environment variable bindings.
          </p>
        </div>
      </div>

      {/* Navigation Subtabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs">
        <button
          onClick={() => setSubTab('storage')}
          className={`rounded-lg px-3.5 py-2 font-semibold transition-colors ${
            subTab === 'storage'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          }`}
        >
          Storage Settings
        </button>
        <button
          onClick={() => setSubTab('general')}
          className={`rounded-lg px-3.5 py-2 font-semibold transition-colors ${
            subTab === 'general'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          }`}
        >
          General & Brand
        </button>
        <button
          onClick={() => setSubTab('security')}
          className={`rounded-lg px-3.5 py-2 font-semibold transition-colors ${
            subTab === 'security'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          }`}
        >
          Security Policies
        </button>
        <button
          onClick={() => setSubTab('env')}
          className={`rounded-lg px-3.5 py-2 font-semibold transition-colors ${
            subTab === 'env'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          }`}
        >
          Environment Secrets Inspector
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-950/30 p-3.5 text-xs text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
          <div className="flex-1">{error}</div>
        </div>
      )}

      {saveSuccess && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-950/30 p-3.5 text-xs text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>Configuration saved successfully!</span>
        </div>
      )}

      {/* Subtab 1: Storage Settings (Requirement 18) */}
      {subTab === 'storage' && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-sm font-bold text-white">Active Storage Configuration</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live status and root directory routing for the configured storage provider.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
              <span className="text-[11px] text-slate-400 uppercase font-semibold">Active Provider</span>
              <div className="mt-1 flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-indigo-400" />
                <span className="text-sm font-bold text-white">
                  {activeProvider?.name || 'Local Persistent Storage'}
                </span>
              </div>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
              <span className="text-[11px] text-slate-400 uppercase font-semibold">Provider Status</span>
              <div className="mt-1 flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    activeProvider?.connection?.connected
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
                  {activeProvider?.connection?.connected ? 'Connected' : 'Needs Configuration'}
                </span>
              </div>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
              <span className="text-[11px] text-slate-400 uppercase font-semibold">Root Folder</span>
              <div className="mt-1 font-mono text-sm font-bold text-slate-200">
                {activeProvider?.connection?.rootFolderName || config?.storageRootFolder || 'AI-HOST'}
              </div>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
              <span className="text-[11px] text-slate-400 uppercase font-semibold">Connection Health</span>
              <div className="mt-1 flex items-center gap-1.5 text-sm font-medium text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>
                  {activeProvider?.connection?.connected ? 'Healthy' : 'Disconnected'}
                </span>
              </div>
            </div>
          </div>

          {testResult && (
            <div
              className={`rounded-lg border p-4 text-xs ${
                testResult.connected
                  ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-200'
                  : 'border-red-500/30 bg-red-950/20 text-red-200'
              }`}
            >
              <div className="font-bold">
                {testResult.connected ? '✓ Storage Check Passed' : '✗ Storage Check Failed'}
              </div>
              <p className="mt-1">{testResult.message}</p>
              {testResult.latencyMs !== undefined && (
                <span className="mt-1 block font-mono text-[11px] text-slate-400">
                  Latency: {testResult.latencyMs} ms
                </span>
              )}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleTestStorage}
              disabled={testingStorage}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${testingStorage ? 'animate-spin' : ''}`} />
              <span>Test Connection</span>
            </button>

            <button
              onClick={() => onNavigate('storage')}
              className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700"
            >
              Change Provider
            </button>
          </div>
        </div>
      )}

      {/* Subtab 2: General & Brand */}
      {subTab === 'general' && (
        <form onSubmit={handleSaveGeneral} className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-5">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-sm font-bold text-white">General Control Panel Settings</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Customize dashboard titles, root directories, and upload policies.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Panel Site Name
              </label>
              <input
                type="text"
                value={siteName}
                onChange={e => setSiteName(e.target.value)}
                className="w-full sm:w-96 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Default Storage Root Folder
              </label>
              <input
                type="text"
                value={rootFolder}
                onChange={e => setRootFolder(e.target.value)}
                className="w-full sm:w-96 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Default Upload Visibility
              </label>
              <select
                value={defaultVisibility}
                onChange={e => setDefaultVisibility(e.target.value as any)}
                className="w-full sm:w-96 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
              >
                <option value="PRIVATE">PRIVATE (Strict token access required)</option>
                <option value="AUTHENTICATED">AUTHENTICATED (Any logged-in team member)</option>
                <option value="PUBLIC">PUBLIC (Direct link download)</option>
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Subtab 3: Security Policies */}
      {subTab === 'security' && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-4 text-xs">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-sm font-bold text-white">Security & RBAC Enforcement</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              NexusControl guarantees zero-leakage architecture across all tiers.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-950/60 p-3.5">
              <Shield className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-white">Strict Backend Isolation</h4>
                <p className="mt-0.5 text-slate-400 leading-relaxed">
                  Frontend JavaScript contains zero Google Drive secrets, OAuth keys, or private keys. The browser only communicates with your authenticated API endpoints.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-950/60 p-3.5">
              <Lock className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-white">Password Hashing (PBKDF2 SHA-512)</h4>
                <p className="mt-0.5 text-slate-400 leading-relaxed">
                  All user passwords are encrypted using individual cryptographic salts with 100,000 rounds of PBKDF2. No plain-text passwords or hashes are ever logged or sent over telemetry.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-950/60 p-3.5">
              <Globe className="h-5 w-5 text-purple-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-white">Role-Based Authorization Middleware</h4>
                <p className="mt-0.5 text-slate-400 leading-relaxed">
                  Routes under <code className="text-indigo-400 font-mono">/api/users</code>, <code className="text-indigo-400 font-mono">/api/storage/switch-provider</code>, <code className="text-indigo-400 font-mono">/api/config</code>, and <code className="text-indigo-400 font-mono">/api/activity</code> strictly reject non-ADMIN tokens with 403 Forbidden.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subtab 4: Masked Environment Variables Inspector */}
      {subTab === 'env' && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-sm font-bold text-white">Masked Environment Secrets Inspector</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Verify which environment variables are loaded in your deployment runtime without revealing sensitive key values.
            </p>
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950/60 text-xs">
            <table className="w-full text-left">
              <thead className="border-b border-slate-800 bg-slate-950 text-[11px] font-semibold uppercase text-slate-400">
                <tr>
                  <th className="py-2.5 px-4">Environment Key</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Masked Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {envStatus &&
                  Object.entries(envStatus).map(([key, val]: any) => {
                    const isConfigured = val?.isSet ?? (typeof val === 'string' && val.length > 0);
                    const displayVal = val?.masked ?? (typeof val === 'string' ? val : '—');

                    return (
                      <tr key={key} className="hover:bg-slate-900/50">
                        <td className="py-2.5 px-4 font-semibold text-slate-300">{key}</td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-sans font-bold ${
                              isConfigured
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-slate-800 text-slate-500'
                            }`}
                          >
                            {isConfigured ? '✓ SET' : 'UNSET'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-400">
                          {displayVal}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
