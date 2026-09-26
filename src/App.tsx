/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { Header } from './components/Header';
import { LoginView } from './components/LoginView';
import { DashboardView } from './components/DashboardView';
import { FileManagerView } from './components/FileManagerView';
import { StorageProvidersView } from './components/StorageProvidersView';
import { AIModelsView } from './components/AIModelsView';
import { APKReleasesView } from './components/APKReleasesView';
import { UserManagementView } from './components/UserManagementView';
import { ActivityLogsView } from './components/ActivityLogsView';
import { SettingsView } from './components/SettingsView';
import { DeployGuideView } from './components/DeployGuideView';

import {
  StorageQuota,
  StorageProviderInfo,
  AIModelRecord,
  APKReleaseRecord,
  ActivityLogEntry,
  SystemConfig,
  SystemHealth,
  User,
} from './types';
import { api } from './services/api';
import { RefreshCw, Server } from 'lucide-react';

function MainApp() {
  const { user, isLoading, isAdmin } = useAuth();
  const [currentTab, setCurrentTab] = useState<ActiveTab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // App-wide data states
  const [quota, setQuota] = useState<StorageQuota | null>(null);
  const [providers, setProviders] = useState<StorageProviderInfo[]>([]);
  const [activeProvider, setActiveProvider] = useState<any>(null);
  const [models, setModels] = useState<AIModelRecord[]>([]);
  const [apkReleases, setApkReleases] = useState<APKReleaseRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityLogEntry[]>([]);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);

  const fetchAllData = async () => {
    if (!user) return;
    setIsRefreshing(true);
    try {
      // 1. Storage & Quota
      try {
        const storageRes = await api.storage.getStatus();
        setQuota(storageRes.quota);
        setProviders(storageRes.providers);
        setActiveProvider(storageRes.activeProvider);
      } catch (e) {
        console.error('Storage status error:', e);
      }

      // 2. AI Models
      try {
        const modelsRes = await api.models.list();
        setModels(modelsRes.models);
      } catch (e) {
        console.error('Models list error:', e);
      }

      // 3. APK Releases
      try {
        const apkRes = await api.apk.list();
        setApkReleases(apkRes.releases);
      } catch (e) {
        console.error('APK list error:', e);
      }

      // 4. System Health
      try {
        const healthRes = await api.config.getHealth();
        setHealth(healthRes);
      } catch (e) {
        console.error('Health error:', e);
      }

      // 5. Config
      try {
        const configRes = await api.config.get();
        setConfig(configRes.config);
      } catch (e) {
        console.error('Config error:', e);
      }

      // Admin-only data
      if (isAdmin) {
        try {
          const usersRes = await api.users.list();
          setUsers(usersRes.users);
        } catch (e) {
          console.error('Users error:', e);
        }

        try {
          const actRes = await api.activity.list({ limit: 20 });
          setRecentActivity(actRes.logs);
        } catch (e) {
          console.error('Activity error:', e);
        }
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user, isAdmin]);

  // Loading Screen
  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-slate-950 text-slate-100">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-emerald-500 shadow-xl shadow-indigo-500/20">
          <Server className="h-6 w-6 text-white animate-pulse" />
        </div>
        <p className="mt-4 text-xs font-semibold text-slate-400">
          Verifying security credentials & storage driver...
        </p>
      </div>
    );
  }

  // Login Screen if not authenticated
  if (!user) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={tab => setCurrentTab(tab)}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeProviderName={activeProvider?.name || 'Local Disk'}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-72">
        {/* Header */}
        <Header
          currentTab={currentTab}
          onOpenSidebar={() => setSidebarOpen(true)}
          onRefresh={fetchAllData}
          isRefreshing={isRefreshing}
          activeProviderName={activeProvider?.name || 'Local Disk'}
          providerStatus={activeProvider?.connection?.connected ?? true}
          onQuickUpload={() => setCurrentTab('files')}
        />

        {/* View Router */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {currentTab === 'dashboard' && (
            <DashboardView
              quota={quota}
              providers={providers}
              activeProvider={activeProvider}
              models={models}
              apkReleases={apkReleases}
              usersCount={users.length || 2}
              recentActivity={recentActivity}
              health={health}
              onNavigate={tab => setCurrentTab(tab)}
              onOpenUpload={() => setCurrentTab('files')}
            />
          )}

          {currentTab === 'files' && (
            <FileManagerView
              onRefreshStorage={fetchAllData}
            />
          )}

          {currentTab === 'storage' && (
            <StorageProvidersView
              providers={providers}
              activeProvider={activeProvider}
              quota={quota}
              onRefresh={fetchAllData}
            />
          )}

          {currentTab === 'models' && (
            <AIModelsView
              models={models}
              onRefresh={fetchAllData}
            />
          )}

          {currentTab === 'apk' && (
            <APKReleasesView
              releases={apkReleases}
              onRefresh={fetchAllData}
            />
          )}

          {currentTab === 'users' && isAdmin && (
            <UserManagementView
              users={users}
              onRefresh={fetchAllData}
            />
          )}

          {currentTab === 'activity' && isAdmin && (
            <ActivityLogsView />
          )}

          {currentTab === 'settings' && isAdmin && (
            <SettingsView
              config={config}
              activeProvider={activeProvider}
              onRefreshConfig={fetchAllData}
              onNavigate={tab => setCurrentTab(tab)}
            />
          )}

          {currentTab === 'deploy' && (
            <DeployGuideView />
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
