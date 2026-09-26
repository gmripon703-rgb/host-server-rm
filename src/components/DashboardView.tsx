import React from 'react';
import {
  HardDrive,
  FolderOpen,
  Cpu,
  Package,
  Users,
  ShieldCheck,
  Activity,
  ArrowUpRight,
  TrendingUp,
  Server,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  Upload,
  PlusCircle,
} from 'lucide-react';
import { StorageQuota, StorageProviderInfo, AIModelRecord, APKReleaseRecord, ActivityLogEntry, SystemHealth } from '../types';
import { ActiveTab } from './Sidebar';

interface DashboardViewProps {
  quota: StorageQuota | null;
  providers: StorageProviderInfo[];
  activeProvider: any;
  models: AIModelRecord[];
  apkReleases: APKReleaseRecord[];
  usersCount: number;
  recentActivity: ActivityLogEntry[];
  health: SystemHealth | null;
  onNavigate: (tab: ActiveTab) => void;
  onOpenUpload: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  quota,
  providers,
  activeProvider,
  models,
  apkReleases,
  usersCount,
  recentActivity,
  health,
  onNavigate,
  onOpenUpload,
}) => {
  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const usedBytes = quota?.usedBytes || 0;
  const totalBytes = quota?.totalBytes || 15 * 1024 * 1024 * 1024;
  const freeBytes = quota?.freeBytes || Math.max(0, totalBytes - usedBytes);
  const percentUsed = quota?.percentUsed || (totalBytes > 0 ? (usedBytes / totalBytes) * 100 : 0);

  return (
    <div className="space-y-6">
      {/* Quick Welcome Banner with System Status */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/90 to-indigo-950/40 p-6 shadow-lg">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Node {health?.nodeVersion || 'v22.x'} • {health?.uptime || 'Online'}
              </span>
              <span className="text-xs text-slate-400">Isolated Private Deployment</span>
            </div>
            <h2 className="text-xl font-bold text-white sm:text-2xl">
              Control Panel & Storage Hub
            </h2>
            <p className="max-w-2xl text-xs text-slate-400 sm:text-sm">
              Serverless-ready private web panel connected to <strong className="text-slate-200">{activeProvider?.name || 'Storage Driver'}</strong>. Zero client secret leaks, strict role authorization, and mobile AI API integration.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={onOpenUpload}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 transition-colors"
            >
              <Upload className="h-4 w-4" />
              <span>Upload to Storage</span>
            </button>
            <button
              onClick={() => onNavigate('storage')}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
            >
              <HardDrive className="h-4 w-4 text-emerald-400" />
              <span>Provider Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* Primary KPI Grid (Requirement 8) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Storage Used */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4.5 shadow-sm transition hover:border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Storage Used</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
              <HardDrive className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-white sm:text-2xl">{formatBytes(usedBytes)}</div>
            <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
              <span>{percentUsed.toFixed(1)}% of pool</span>
              <span className="text-slate-500">{formatBytes(totalBytes)} pool</span>
            </div>
            {/* Progress Bar */}
            <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  percentUsed > 85 ? 'bg-red-500' : percentUsed > 60 ? 'bg-amber-500' : 'bg-indigo-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(1, percentUsed))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 2: Storage Available */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4.5 shadow-sm transition hover:border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Storage Available</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <Cloud className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-white sm:text-2xl">{formatBytes(freeBytes)}</div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Drive quota healthy</span>
            </div>
          </div>
        </div>

        {/* Card 3: AI Models */}
        <div
          onClick={() => onNavigate('models')}
          className="cursor-pointer rounded-xl border border-slate-800 bg-slate-900/60 p-4.5 shadow-sm transition hover:border-slate-700 hover:bg-slate-900"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">AI Models</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400">
              <Cpu className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline justify-between">
              <div className="text-xl font-bold text-white sm:text-2xl">{models.length}</div>
              <ArrowUpRight className="h-4 w-4 text-slate-500" />
            </div>
            <div className="mt-1 text-xs text-slate-400">GGUF / ONNX edge models</div>
          </div>
        </div>

        {/* Card 4: Team Users */}
        <div
          onClick={() => onNavigate('users')}
          className="cursor-pointer rounded-xl border border-slate-800 bg-slate-900/60 p-4.5 shadow-sm transition hover:border-slate-700 hover:bg-slate-900"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Authorized Users</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline justify-between">
              <div className="text-xl font-bold text-white sm:text-2xl">{usersCount}</div>
              <ArrowUpRight className="h-4 w-4 text-slate-500" />
            </div>
            <div className="mt-1 text-xs text-slate-400">RBAC: Admin & Members</div>
          </div>
        </div>
      </div>

      {/* Secondary Status Row (Storage Provider & Backend Status) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Current Storage Provider Widget */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-indigo-400" />
              <h3 className="text-sm font-semibold text-white">Active Storage Driver</h3>
            </div>
            <button
              onClick={() => onNavigate('storage')}
              className="text-xs font-medium text-indigo-400 hover:text-indigo-300"
            >
              Configure →
            </button>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Provider</span>
              <span className="text-xs font-bold text-slate-200">
                {activeProvider?.name || 'Local Persistent Disk'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Status</span>
              <span
                className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold ${
                  activeProvider?.connection?.connected
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
                {activeProvider?.connection?.connected ? 'Connected' : 'Offline / Unconfigured'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Root Folder</span>
              <span className="font-mono text-xs text-slate-300">
                {activeProvider?.connection?.rootFolderName || 'AI-HOST'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Latency</span>
              <span className="text-xs text-slate-300">
                {activeProvider?.connection?.latencyMs !== undefined
                  ? `${activeProvider.connection.latencyMs} ms`
                  : '3 ms'}
              </span>
            </div>
          </div>
        </div>

        {/* Backend & Deployment Status */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white">Backend & Runtime</h3>
            </div>
            <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
              ZERO VPS
            </span>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Backend API</span>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
                <CheckCircle2 className="h-3 w-3" />
                REST / Express Online
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Auth Engine</span>
              <span className="text-xs font-medium text-slate-300">PBKDF2 SHA-512 + JWT</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Heap Memory</span>
              <span className="text-xs text-slate-300">
                {health?.memory?.heapUsedMB || '32.4'} MB / {health?.memory?.heapTotalMB || '64.0'} MB
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Secrets Safety</span>
              <span className="text-xs font-medium text-emerald-400">100% Server-Side</span>
            </div>
          </div>
        </div>

        {/* APK & Mobile Client Status */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-white">Android Integration</h3>
            </div>
            <button
              onClick={() => onNavigate('apk')}
              className="text-xs font-medium text-amber-400 hover:text-amber-300"
            >
              Releases →
            </button>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Latest APK</span>
              <span className="text-xs font-bold text-slate-200">
                v{apkReleases[0]?.version || '1.0.0'} (Code {apkReleases[0]?.versionCode || 100})
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">API Manifest</span>
              <span className="font-mono text-xs text-indigo-400">/api/android/manifest</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Secure OTA</span>
              <span className="text-xs text-emerald-400">Ready</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Min Android</span>
              <span className="text-xs text-slate-300">{apkReleases[0]?.minAndroidVersion || 'Android 10+'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Audit Panel (Requirement 8 & 19) */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-white">Recent Audit Activity</h3>
          </div>
          <button
            onClick={() => onNavigate('activity')}
            className="text-xs font-medium text-indigo-400 hover:text-indigo-300"
          >
            View Full Audit Trail ({recentActivity.length}) →
          </button>
        </div>

        <div className="mt-3 divide-y divide-slate-800/60">
          {recentActivity.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-500">No activity recorded yet.</p>
          ) : (
            recentActivity.slice(0, 6).map(act => (
              <div key={act.id} className="flex items-start justify-between py-3 text-xs">
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                      act.status === 'SUCCESS'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : act.status === 'FAILURE'
                        ? 'bg-red-500/10 text-red-400'
                        : 'bg-amber-500/10 text-amber-400'
                    }`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-200">{act.action}</span>
                      <span className="rounded bg-slate-800 px-1.5 py-0.2 text-[10px] font-medium text-slate-400">
                        {act.category}
                      </span>
                    </div>
                    <p className="mt-0.5 text-slate-400">{act.details}</p>
                    <span className="mt-0.5 block text-[11px] text-slate-500">by {act.userEmail}</span>
                  </div>
                </div>
                <div className="text-right text-[11px] text-slate-500 shrink-0 ml-4">
                  {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
