import React, { useState } from 'react';
import {
  HardDrive,
  Cloud,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Shield,
  RefreshCw,
  FolderSync,
  Key,
  Database,
  ArrowRight,
  Server,
  Zap,
} from 'lucide-react';
import { StorageProviderInfo, ProviderConnectionStatus, StorageQuota } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface StorageProvidersViewProps {
  providers: StorageProviderInfo[];
  activeProvider: any;
  quota: StorageQuota | null;
  onRefresh: () => void;
}

export const StorageProvidersView: React.FC<StorageProvidersViewProps> = ({
  providers,
  activeProvider,
  quota,
  onRefresh,
}) => {
  const { isAdmin } = useAuth();
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<ProviderConnectionStatus | null>(null);
  const [switching, setSwitching] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Google Drive Setup Wizard state
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const [authMode, setAuthMode] = useState<'service_account' | 'oauth2'>('service_account');
  const [serviceAccountEmail, setServiceAccountEmail] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [rootFolderName, setRootFolderName] = useState('AI-HOST');
  const [wizardTesting, setWizardTesting] = useState(false);
  const [wizardResult, setWizardResult] = useState<ProviderConnectionStatus | null>(null);

  const handleTest = async (providerId: string) => {
    setTestingId(providerId);
    setTestResult(null);
    setError(null);
    try {
      const res = await api.storage.testConnection(providerId);
      setTestResult(res);
    } catch (err: any) {
      setError(err.message || 'Connection test failed.');
    } finally {
      setTestingId(null);
    }
  };

  const handleSwitchProvider = async (providerId: string) => {
    setSwitching(providerId);
    setError(null);
    try {
      await api.storage.switchProvider(providerId);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to switch provider.');
    } finally {
      setSwitching(null);
    }
  };

  const handleWizardSubmit = async () => {
    setWizardTesting(true);
    setWizardResult(null);
    try {
      const payload: any = {
        rootFolderName,
      };

      if (authMode === 'service_account') {
        payload.serviceAccountEmail = serviceAccountEmail.trim();
        payload.privateKey = privateKey.trim();
      } else {
        payload.clientId = clientId.trim();
        payload.clientSecret = clientSecret.trim();
        payload.refreshToken = refreshToken.trim();
      }

      const res = await api.storage.configureGoogleDrive(payload);
      setWizardResult(res.connection);

      if (res.connection.connected) {
        // Automatically switch to Google Drive if test passed
        await api.storage.switchProvider('google-drive');
        onRefresh();
      }
    } catch (err: any) {
      setError(err.message || 'Configuration failed.');
    } finally {
      setWizardTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="rounded bg-indigo-500/10 px-2 py-0.5 text-xs font-semibold text-indigo-400">
                Pluggable Storage Abstraction
              </span>
              <span className="text-xs text-slate-400">Provider Pattern (v1.0)</span>
            </div>
            <h2 className="text-lg font-bold text-white sm:text-xl">
              Storage Providers & Cloud Adapters
            </h2>
            <p className="max-w-2xl text-xs text-slate-400">
              NexusControl separates business logic from underlying storage drivers. You can swap between Google Drive, local container storage, or third-party buckets with zero code changes.
            </p>
          </div>

          {isAdmin && (
            <button
              onClick={() => {
                setShowWizard(true);
                setWizardStep(1);
              }}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 transition-colors"
            >
              <Zap className="h-4 w-4" />
              <span>Google Drive Setup Wizard</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-950/30 p-3.5 text-xs text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
          <div className="flex-1">{error}</div>
        </div>
      )}

      {/* Test Result Toast */}
      {testResult && (
        <div
          className={`flex items-start gap-3 rounded-xl border p-4 text-xs ${
            testResult.connected
              ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-200'
              : 'border-amber-500/30 bg-amber-950/20 text-amber-200'
          }`}
        >
          {testResult.connected ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-400" />
          )}
          <div className="flex-1">
            <div className="font-semibold text-slate-100">
              {testResult.providerName} Connection Result: {testResult.connected ? 'SUCCESS' : 'FAILED'}
            </div>
            <p className="mt-0.5 text-slate-300">{testResult.message}</p>
            {testResult.latencyMs !== undefined && (
              <span className="mt-1 block text-[11px] text-slate-400">
                Ping Latency: {testResult.latencyMs} ms • Checked at{' '}
                {new Date(testResult.lastChecked).toLocaleTimeString()}
              </span>
            )}
          </div>
          <button
            onClick={() => setTestResult(null)}
            className="text-slate-400 hover:text-white"
          >
            ×
          </button>
        </div>
      )}

      {/* Registered Providers Grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {providers.map(p => {
          const isActive = p.id === activeProvider?.id;
          const isGoogleDrive = p.id === 'google-drive';

          return (
            <div
              key={p.id}
              className={`relative flex flex-col justify-between rounded-xl border p-5 transition ${
                isActive
                  ? 'border-indigo-500/80 bg-slate-900/90 shadow-md shadow-indigo-500/5 ring-1 ring-indigo-500/30'
                  : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        isActive
                          ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {p.id === 'google-drive' ? (
                        <Cloud className="h-5 w-5" />
                      ) : (
                        <HardDrive className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">{p.name}</h3>
                      <span className="font-mono text-[10px] text-slate-500">{p.id}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isActive && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400 border border-emerald-500/20">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        ACTIVE
                      </span>
                    )}
                  </div>
                </div>

                <p className="mt-3 text-xs leading-relaxed text-slate-400">{p.description}</p>

                <div className="mt-4 space-y-1.5 rounded-lg border border-slate-800/80 bg-slate-950/60 p-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Driver Status</span>
                    <span
                      className={`font-semibold ${
                        p.isConfigured ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {p.isConfigured ? 'Configured & Ready' : 'Credentials Needed'}
                    </span>
                  </div>
                  {isActive && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Root Directory</span>
                      <span className="font-mono text-slate-300">
                        {activeProvider?.connection?.rootFolderName || 'AI-HOST'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="mt-5 flex items-center justify-between border-t border-slate-800 pt-4">
                <button
                  onClick={() => handleTest(p.id)}
                  disabled={testingId === p.id}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-50 transition-colors"
                >
                  <RefreshCw
                    className={`h-3 w-3 ${testingId === p.id ? 'animate-spin text-indigo-400' : ''}`}
                  />
                  <span>Test Connection</span>
                </button>

                <div className="flex items-center gap-2">
                  {isGoogleDrive && isAdmin && (
                    <button
                      onClick={() => {
                        setShowWizard(true);
                        setWizardStep(3);
                      }}
                      className="rounded-lg border border-indigo-500/30 bg-indigo-950/30 px-3 py-1.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-900/40 transition-colors"
                    >
                      Configure
                    </button>
                  )}

                  {!isActive && isAdmin && (
                    <button
                      onClick={() => handleSwitchProvider(p.id)}
                      disabled={switching === p.id}
                      className="rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                    >
                      {switching === p.id ? 'Activating...' : 'Set Active'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Free Cloud & TeraBox Architecture Analysis */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <Database className="h-5 w-5 text-indigo-400" />
          <h3 className="text-sm font-bold text-white">Free Cloud Storage & TeraBox Architecture Comparison</h3>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          When choosing an external storage provider for automated web hosting, AI model downloads (GGUF/ONNX), and APK distribution, here is how Google Drive compares to TeraBox and other popular free tiers:
        </p>

        <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/80">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-900 text-[11px] font-semibold uppercase text-slate-400">
              <tr>
                <th className="py-3 px-4">Provider</th>
                <th className="py-3 px-4">Free Quota</th>
                <th className="py-3 px-4">Official REST API</th>
                <th className="py-3 px-4">Server-to-Server Auth</th>
                <th className="py-3 px-4">Suitability for AI/APKs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              <tr className="hover:bg-slate-900/40">
                <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                  <Cloud className="h-4 w-4 text-emerald-400" />
                  Google Drive
                </td>
                <td className="py-3 px-4 text-slate-200">15 GB free</td>
                <td className="py-3 px-4 text-emerald-400 font-semibold">✓ Official Drive v3 API</td>
                <td className="py-3 px-4 text-emerald-400">✓ Service Account (No CAPTCHA)</td>
                <td className="py-3 px-4 text-emerald-300 font-medium">★★★★★ Excellent (High speed, zero ads, direct streaming)</td>
              </tr>
              <tr className="hover:bg-slate-900/40">
                <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-purple-400" />
                  Cloudflare R2
                </td>
                <td className="py-3 px-4 text-slate-200">10 GB/mo free</td>
                <td className="py-3 px-4 text-emerald-400 font-semibold">✓ S3-compatible API</td>
                <td className="py-3 px-4 text-emerald-400">✓ API Keys / IAM</td>
                <td className="py-3 px-4 text-emerald-300 font-medium">★★★★★ Best CDN (Zero egress/bandwidth fees worldwide)</td>
              </tr>
              <tr className="hover:bg-slate-900/40">
                <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-amber-400" />
                  TeraBox
                </td>
                <td className="py-3 px-4 text-amber-300 font-semibold">1,024 GB (1 TB)</td>
                <td className="py-3 px-4 text-red-400">✗ No official public API</td>
                <td className="py-3 px-4 text-amber-400">Requires WebDAV Bridge (Alist) or Cookies</td>
                <td className="py-3 px-4 text-amber-300">★★★☆☆ Good for cold archives; throttled download speeds without app</td>
              </tr>
              <tr className="hover:bg-slate-900/40">
                <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-blue-400" />
                  Microsoft OneDrive
                </td>
                <td className="py-3 px-4 text-slate-200">5 GB free</td>
                <td className="py-3 px-4 text-emerald-400 font-semibold">✓ Microsoft Graph v1.0</td>
                <td className="py-3 px-4 text-blue-400">OAuth2 App Registration</td>
                <td className="py-3 px-4 text-slate-300">★★★★☆ Reliable enterprise cloud</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3.5 space-y-1">
            <h4 className="font-bold text-emerald-400">Why Google Drive is Recommended:</h4>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Google Drive provides official, robust Google Service Accounts that sign JWTs securely on your backend without human browser redirection or CAPTCHAs. It allows your Android app and web panel to stream AI model weights and APKs reliably at full connection speed.
            </p>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3.5 space-y-1">
            <h4 className="font-bold text-amber-400">How to Use TeraBox with NexusControl:</h4>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Because TeraBox lacks an official public developer API, deploy a lightweight WebDAV bridge (like <strong>Alist</strong> or <strong>Rclone</strong>) or set <code className="text-indigo-300 font-mono">TERABOX_WEBDAV_URL</code> in <code className="text-indigo-300 font-mono">.env</code>. NexusControl will route files through the TeraBox adapter seamlessly!
            </p>
          </div>
        </div>
      </div>

      {/* Google Drive Setup Wizard Modal (Requirement 7) */}
      {showWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="my-8 w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            {/* Wizard Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Cloud className="h-5 w-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Google Drive Integration Wizard</h3>
              </div>
              <button
                onClick={() => setShowWizard(false)}
                className="text-slate-400 hover:text-white"
              >
                ×
              </button>
            </div>

            {/* Step Indicators */}
            <div className="my-4 grid grid-cols-4 gap-2 text-center text-[11px] font-semibold">
              <div
                className={`rounded-lg py-1.5 ${
                  wizardStep >= 1 ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40' : 'bg-slate-800 text-slate-500'
                }`}
              >
                1. Cloud API
              </div>
              <div
                className={`rounded-lg py-1.5 ${
                  wizardStep >= 2 ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40' : 'bg-slate-800 text-slate-500'
                }`}
              >
                2. Auth Type
              </div>
              <div
                className={`rounded-lg py-1.5 ${
                  wizardStep >= 3 ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40' : 'bg-slate-800 text-slate-500'
                }`}
              >
                3. Credentials
              </div>
              <div
                className={`rounded-lg py-1.5 ${
                  wizardStep >= 4 ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40' : 'bg-slate-800 text-slate-500'
                }`}
              >
                4. Verify & Save
              </div>
            </div>

            {/* Step 1: Cloud API requirements */}
            {wizardStep === 1 && (
              <div className="space-y-4 py-2 text-xs">
                <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4 space-y-2">
                  <h4 className="font-bold text-white">Required Google Cloud Setup:</h4>
                  <ol className="list-decimal space-y-2 pl-4 text-slate-300">
                    <li>
                      Go to the <strong>Google Cloud Console</strong> (<a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="text-indigo-400 underline">console.cloud.google.com</a>).
                    </li>
                    <li>
                      Create a project or select an existing one (do not hardcode project IDs).
                    </li>
                    <li>
                      Navigate to <strong>APIs & Services → Library</strong> and enable:
                      <div className="mt-1 font-mono font-bold text-emerald-400 bg-slate-900 p-1.5 rounded border border-slate-800">
                        Google Drive API (v3)
                      </div>
                    </li>
                    <li>
                      Create an authentication credential (either a <strong>Service Account</strong> or <strong>OAuth 2.0 Web Client</strong>).
                    </li>
                  </ol>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setWizardStep(2)}
                    className="flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
                  >
                    <span>Next: Select Auth Mode</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Auth Mode Choice */}
            {wizardStep === 2 && (
              <div className="space-y-4 py-2 text-xs">
                <p className="text-slate-400">
                  Select how NexusControl backend should authenticate to Google Drive:
                </p>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div
                    onClick={() => setAuthMode('service_account')}
                    className={`cursor-pointer rounded-xl border p-4 transition ${
                      authMode === 'service_account'
                        ? 'border-indigo-500 bg-indigo-950/30'
                        : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Key className="h-5 w-5 text-indigo-400" />
                      {authMode === 'service_account' && (
                        <CheckCircle2 className="h-4 w-4 text-indigo-400" />
                      )}
                    </div>
                    <h5 className="mt-2 font-bold text-white">Service Account (Recommended)</h5>
                    <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
                      Zero browser redirects. Generates a private server-to-server key that accesses designated folders or shared drives.
                    </p>
                  </div>

                  <div
                    onClick={() => setAuthMode('oauth2')}
                    className={`cursor-pointer rounded-xl border p-4 transition ${
                      authMode === 'oauth2'
                        ? 'border-indigo-500 bg-indigo-950/30'
                        : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Shield className="h-5 w-5 text-emerald-400" />
                      {authMode === 'oauth2' && (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      )}
                    </div>
                    <h5 className="mt-2 font-bold text-white">OAuth2 Refresh Token</h5>
                    <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
                      Uses Client ID, Client Secret, and offline refresh token for accessing a personal 15GB Google Drive account.
                    </p>
                  </div>
                </div>

                <div className="flex justify-between pt-2">
                  <button
                    onClick={() => setWizardStep(1)}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-1.5 text-xs font-semibold text-slate-300"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setWizardStep(3)}
                    className="flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
                  >
                    <span>Next: Enter Keys</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Enter credentials */}
            {wizardStep === 3 && (
              <div className="space-y-3.5 py-2 text-xs">
                {authMode === 'service_account' ? (
                  <>
                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">
                        Service Account Email
                      </label>
                      <input
                        type="text"
                        value={serviceAccountEmail}
                        onChange={e => setServiceAccountEmail(e.target.value)}
                        placeholder="e.g. drive-service@my-project.iam.gserviceaccount.com"
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">
                        Private Key (RSA PEM)
                      </label>
                      <textarea
                        rows={4}
                        value={privateKey}
                        onChange={e => setPrivateKey(e.target.value)}
                        placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;...&#10;-----END RSA PRIVATE KEY-----"
                        className="w-full font-mono text-[11px] rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                      />
                      <p className="mt-1 text-[11px] text-slate-500">
                        Remember to share your Google Drive folder with this service account email as Editor!
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">
                        OAuth Client ID
                      </label>
                      <input
                        type="text"
                        value={clientId}
                        onChange={e => setClientId(e.target.value)}
                        placeholder="e.g. 123456789.apps.googleusercontent.com"
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">
                        OAuth Client Secret
                      </label>
                      <input
                        type="password"
                        value={clientSecret}
                        onChange={e => setClientSecret(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">
                        Refresh Token (offline access)
                      </label>
                      <input
                        type="password"
                        value={refreshToken}
                        onChange={e => setRefreshToken(e.target.value)}
                        placeholder="1//04••••••"
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Root Folder Name
                  </label>
                  <input
                    type="text"
                    value={rootFolderName}
                    onChange={e => setRootFolderName(e.target.value)}
                    placeholder="AI-HOST"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    The root directory in Google Drive where files will be stored.
                  </p>
                </div>

                <div className="flex justify-between pt-2">
                  <button
                    onClick={() => setWizardStep(2)}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-1.5 text-xs font-semibold text-slate-300"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setWizardStep(4)}
                    className="flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
                  >
                    <span>Next: Test & Save</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Verification and Test */}
            {wizardStep === 4 && (
              <div className="space-y-4 py-2 text-xs">
                <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4 space-y-2">
                  <h5 className="font-bold text-white">Ready to Connect:</h5>
                  <p className="text-slate-400">
                    NexusControl will verify API credentials by testing authentication against the Google Drive v3 REST endpoint.
                  </p>
                  <ul className="space-y-1 text-slate-300 text-[11px]">
                    <li>• Mode: <strong>{authMode === 'service_account' ? 'Service Account Key' : 'OAuth2 Refresh Token'}</strong></li>
                    <li>• Target Folder: <strong>{rootFolderName}</strong></li>
                    <li>• Secret Storage: <strong>Strictly Backend Memory / Environment</strong></li>
                  </ul>
                </div>

                {wizardResult && (
                  <div
                    className={`rounded-lg border p-3.5 ${
                      wizardResult.connected
                        ? 'border-emerald-500/30 bg-emerald-950/30 text-emerald-300'
                        : 'border-red-500/30 bg-red-950/30 text-red-300'
                    }`}
                  >
                    <div className="font-bold">
                      {wizardResult.connected ? '✓ Google Drive Connected!' : '✗ Connection Failed'}
                    </div>
                    <p className="mt-1 text-[11px]">{wizardResult.message}</p>
                  </div>
                )}

                <div className="flex justify-between pt-2">
                  <button
                    onClick={() => setWizardStep(3)}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-1.5 text-xs font-semibold text-slate-300"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleWizardSubmit}
                    disabled={wizardTesting}
                    className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-emerald-500 disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${wizardTesting ? 'animate-spin' : ''}`} />
                    <span>{wizardTesting ? 'Testing API...' : 'Test Connection & Activate'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
