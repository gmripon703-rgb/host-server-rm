import {
  User,
  StorageItem,
  StorageQuota,
  StorageProviderInfo,
  ProviderConnectionStatus,
  AIModelRecord,
  APKReleaseRecord,
  ActivityLogEntry,
  SystemConfig,
  SystemHealth,
} from '../types';

const TOKEN_KEY = 'nexus_auth_token';

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  remove: () => localStorage.removeItem(TOKEN_KEY),
};

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = tokenStorage.get();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Set json content type unless sending FormData
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // If unauthorized, clear token if expired
    if (!endpoint.includes('/api/auth/login')) {
      tokenStorage.remove();
    }
  }

  if (!response.ok) {
    let errorMsg = `Request failed (${response.status})`;
    try {
      const errorJson = await response.json();
      if (errorJson.error) {
        errorMsg = errorJson.error;
      }
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

export const api = {
  // Authentication
  auth: {
    login: (email: string, password: string) =>
      request<{ user: User; token: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    logout: () =>
      request<{ success: boolean }>('/api/auth/logout', {
        method: 'POST',
      }),
    getMe: () =>
      request<{ user: User }>('/api/auth/me'),
  },

  // Storage & Files
  files: {
    list: (params?: { folderId?: string; search?: string; sortBy?: string; sortOrder?: string; pageToken?: string }) => {
      const searchParams = new URLSearchParams();
      if (params?.folderId) searchParams.set('folderId', params.folderId);
      if (params?.search) searchParams.set('search', params.search);
      if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
      if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);
      if (params?.pageToken) searchParams.set('pageToken', params.pageToken);
      const q = searchParams.toString();
      return request<{
        items: StorageItem[];
        nextPageToken?: string;
        currentFolder?: { id: string; name: string; parentId?: string };
        totalCount: number;
      }>(`/api/files${q ? `?${q}` : ''}`);
    },

    upload: (file: File, folderId = 'root', visibility = 'PRIVATE') => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folderId', folderId);
      formData.append('visibility', visibility);

      return request<StorageItem>('/api/files/upload', {
        method: 'POST',
        body: formData,
      });
    },

    get: (id: string) =>
      request<StorageItem>(`/api/files/${id}`),

    delete: (id: string) =>
      request<{ success: boolean; message?: string }>(`/api/files/${id}`, {
        method: 'DELETE',
      }),

    rename: (id: string, name: string) =>
      request<StorageItem>(`/api/files/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name }),
      }),

    createFolder: (name: string, parentFolderId = 'root') =>
      request<StorageItem>('/api/folders', {
        method: 'POST',
        body: JSON.stringify({ name, parentFolderId }),
      }),

    getDownloadUrl: (id: string) => {
      const token = tokenStorage.get();
      return `/api/files/${id}/download${token ? `?access_token=${token}` : ''}`;
    },
  },

  // Storage Status & Providers
  storage: {
    getStatus: () =>
      request<{
        quota: StorageQuota;
        providers: StorageProviderInfo[];
        activeProvider: {
          id: string;
          name: string;
          description: string;
          isConfigured: boolean;
          connection: ProviderConnectionStatus;
        };
      }>('/api/storage'),

    getProviders: () =>
      request<{ providers: StorageProviderInfo[] }>('/api/storage/providers'),

    switchProvider: (providerId: string) =>
      request<{ success: boolean; activeProvider: any }>('/api/storage/switch-provider', {
        method: 'POST',
        body: JSON.stringify({ providerId }),
      }),

    testConnection: (providerId?: string) =>
      request<ProviderConnectionStatus>('/api/storage/test-connection', {
        method: 'POST',
        body: JSON.stringify({ providerId }),
      }),

    configureGoogleDrive: (data: {
      serviceAccountEmail?: string;
      privateKey?: string;
      clientId?: string;
      clientSecret?: string;
      refreshToken?: string;
      rootFolderId?: string;
      rootFolderName?: string;
    }) =>
      request<{ success: boolean; connection: ProviderConnectionStatus }>('/api/storage/configure-googledrive', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // AI Models
  models: {
    list: () =>
      request<{ models: AIModelRecord[]; count: number }>('/api/models'),

    get: (id: string) =>
      request<AIModelRecord>(`/api/models/${id}`),

    create: (data: Omit<AIModelRecord, 'downloadUrl' | 'updatedAt'>) =>
      request<AIModelRecord>('/api/models', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id: string, data: Partial<AIModelRecord>) =>
      request<AIModelRecord>(`/api/models/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      request<{ success: boolean; message?: string }>(`/api/models/${id}`, {
        method: 'DELETE',
      }),

    getAndroidManifest: () =>
      request<{ manifestVersion: string; timestamp: string; models: AIModelRecord[]; apk: APKReleaseRecord }>('/api/android/manifest'),
  },

  // APK Releases
  apk: {
    list: () =>
      request<{ releases: APKReleaseRecord[]; count: number }>('/api/apk'),

    getLatest: () =>
      request<APKReleaseRecord>('/api/apk/latest'),

    create: (data: Omit<APKReleaseRecord, 'id' | 'downloadUrl' | 'createdAt'>) =>
      request<APKReleaseRecord>('/api/apk', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id: string, data: Partial<APKReleaseRecord>) =>
      request<APKReleaseRecord>(`/api/apk/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      request<{ success: boolean; message?: string }>(`/api/apk/${id}`, {
        method: 'DELETE',
      }),
  },

  // Users & RBAC
  users: {
    list: () =>
      request<{ users: User[]; count: number }>('/api/users'),

    create: (data: { email: string; name: string; password: string; role: 'ADMIN' | 'USER' }) =>
      request<User>('/api/users', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id: string, data: Partial<{ name: string; role: 'ADMIN' | 'USER'; isActive: boolean; password?: string }>) =>
      request<User>(`/api/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      request<{ success: boolean; message?: string }>(`/api/users/${id}`, {
        method: 'DELETE',
      }),
  },

  // Activity Logs
  activity: {
    list: (params?: { category?: string; search?: string; limit?: number; offset?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.category) searchParams.set('category', params.category);
      if (params?.search) searchParams.set('search', params.search);
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      if (params?.offset) searchParams.set('offset', params.offset.toString());
      const q = searchParams.toString();
      return request<{ total: number; logs: ActivityLogEntry[] }>(`/api/activity${q ? `?${q}` : ''}`);
    },

    getExportUrl: (format: 'csv' | 'json') => {
      const token = tokenStorage.get();
      return `/api/activity/export?format=${format}${token ? `&access_token=${token}` : ''}`;
    },
  },

  // System Configuration & Health
  config: {
    get: () =>
      request<{ config: SystemConfig }>('/api/config'),

    update: (data: Partial<SystemConfig>) =>
      request<{ config: SystemConfig }>('/api/config', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    getEnvironment: () =>
      request<{ environment: Record<string, any> }>('/api/config/environment'),

    getHealth: () =>
      request<SystemHealth>('/api/system/health'),
  },
};
