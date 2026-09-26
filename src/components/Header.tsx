import React from 'react';
import { Menu, HardDrive, ShieldCheck, RefreshCw, Upload } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ActiveTab } from './Sidebar';

interface HeaderProps {
  currentTab: ActiveTab;
  onOpenSidebar: () => void;
  onRefresh?: () => void;
  onQuickUpload?: () => void;
  isRefreshing?: boolean;
  activeProviderName?: string;
  providerStatus?: boolean;
}

const tabTitles: Record<ActiveTab, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'System overview, storage quota, and recent activity' },
  files: { title: 'File Manager', subtitle: 'Browse, upload, download, and organize private storage' },
  storage: { title: 'Storage Providers', subtitle: 'Configure Google Drive, OneDrive, or Local storage drivers' },
  models: { title: 'AI Model Registry', subtitle: 'GGUF, ONNX, and SafeTensors assets for Android edge AI' },
  apk: { title: 'APK Releases', subtitle: 'Manage client application distribution and OTA update manifests' },
  users: { title: 'User Management', subtitle: 'Team accounts, RBAC permissions, and access credentials' },
  activity: { title: 'Activity Logs', subtitle: 'Immutable security audit trail of all operations and logins' },
  settings: { title: 'Configuration & Security', subtitle: 'System parameters, root folders, and environment variables' },
  deploy: { title: 'Deployment Guide', subtitle: 'Zero-VPS guide for private GitHub, Cloud Run, and Docker' },
};

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onOpenSidebar,
  onRefresh,
  onQuickUpload,
  isRefreshing = false,
  activeProviderName = 'Local Disk',
  providerStatus = true,
}) => {
  const { user } = useAuth();
  const info = tabTitles[currentTab] || { title: 'Admin', subtitle: 'Control panel' };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-800 bg-slate-950/80 px-4 backdrop-blur-md lg:px-8">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSidebar}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-900 hover:text-white lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div>
          <h1 className="text-base font-bold text-white sm:text-lg">{info.title}</h1>
          <p className="hidden text-xs text-slate-400 sm:block">{info.subtitle}</p>
        </div>
      </div>

      {/* Right: Badges & Actions */}
      <div className="flex items-center gap-2.5 sm:gap-4">
        {/* Storage Provider Status Pill */}
        <div className="hidden items-center gap-2 rounded-full border border-slate-800 bg-slate-900/90 px-3 py-1 text-xs md:flex">
          <HardDrive className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-slate-400">Driver:</span>
          <span className="font-semibold text-slate-200">{activeProviderName}</span>
          <span
            className={`h-2 w-2 rounded-full ${
              providerStatus ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-amber-400'
            }`}
            title={providerStatus ? 'Provider connected' : 'Provider offline or unconfigured'}
          />
        </div>

        {/* Backend Online Pill */}
        <div className="hidden items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900/90 px-3 py-1 text-xs lg:flex">
          <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
          <span className="font-medium text-slate-300">API Secure</span>
        </div>

        {/* Refresh button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700 hover:bg-slate-800 hover:text-white disabled:opacity-50 transition-colors"
            title="Refresh data"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        )}

        {/* Quick Upload Action */}
        {onQuickUpload && (
          <button
            onClick={onQuickUpload}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
          >
            <Upload className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Upload</span>
          </button>
        )}

        {/* Role Pill */}
        <div className="flex items-center rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs">
          <span className="font-medium text-slate-300">{user?.name?.split(' ')[0] || 'Admin'}</span>
        </div>
      </div>
    </header>
  );
};
