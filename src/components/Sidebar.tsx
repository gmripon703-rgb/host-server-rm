import React from 'react';
import {
  LayoutDashboard,
  FolderOpen,
  HardDrive,
  Cpu,
  Package,
  Users,
  Activity,
  Settings,
  Rocket,
  LogOut,
  Shield,
  Server,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type ActiveTab =
  | 'dashboard'
  | 'files'
  | 'storage'
  | 'models'
  | 'apk'
  | 'users'
  | 'activity'
  | 'settings'
  | 'deploy';

interface SidebarProps {
  currentTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  isOpen: boolean;
  onClose: () => void;
  activeProviderName?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpen,
  onClose,
  activeProviderName = 'Local Disk',
}) => {
  const { user, isAdmin, logout } = useAuth();

  const navItems = [
    { id: 'dashboard' as ActiveTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'files' as ActiveTab, label: 'Files', icon: FolderOpen },
    { id: 'storage' as ActiveTab, label: 'Storage', icon: HardDrive },
    { id: 'models' as ActiveTab, label: 'AI Models', icon: Cpu },
    { id: 'apk' as ActiveTab, label: 'APK Releases', icon: Package },
    { id: 'users' as ActiveTab, label: 'Users', icon: Users, adminOnly: true },
    { id: 'activity' as ActiveTab, label: 'Activity Logs', icon: Activity, adminOnly: true },
    { id: 'settings' as ActiveTab, label: 'Settings', icon: Settings, adminOnly: true },
    { id: 'deploy' as ActiveTab, label: 'Deploy Guide', icon: Rocket },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-72 flex-col border-r border-slate-800 bg-slate-950 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-800 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-emerald-500 shadow-md shadow-indigo-500/20">
              <Server className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-white">NexusControl</span>
              <span className="block text-[10px] font-medium uppercase tracking-wider text-emerald-400">
                Private Admin Panel
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Active Storage Provider Badge */}
        <div className="mx-4 my-3 rounded-lg border border-slate-800 bg-slate-900/80 p-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Storage Driver</span>
            <span className="inline-flex items-center gap-1.5 font-medium text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {activeProviderName}
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {navItems.map(item => {
            if (item.adminOnly && !isAdmin) return null;
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  onClose();
                }}
                className={`group flex w-full items-center justify-between rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`h-4.5 w-4.5 transition-colors ${
                      isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.adminOnly && (
                  <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Admin
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        <div className="border-t border-slate-800 p-4">
          <div className="mb-3 flex items-center gap-3 rounded-lg border border-slate-800/80 bg-slate-900/60 p-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500/20 text-sm font-bold text-indigo-400">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-200">{user?.name || 'Administrator'}</p>
              <div className="flex items-center gap-1.5">
                <span className="truncate text-[11px] text-slate-400">{user?.email}</span>
              </div>
            </div>
            <span
              className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                user?.role === 'ADMIN'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
              }`}
            >
              <Shield className="h-2.5 w-2.5" />
              {user?.role}
            </span>
          </div>

          <button
            onClick={() => logout()}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-400 hover:border-red-900/50 hover:bg-red-950/20 hover:text-red-400 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
