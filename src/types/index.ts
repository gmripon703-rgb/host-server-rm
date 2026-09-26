export type UserRole = 'ADMIN' | 'USER';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
  avatar?: string;
}

export interface AuthSession {
  token: string;
  userId: string;
  email: string;
  role: UserRole;
  name: string;
  expiresAt: number;
}

export type FileVisibility = 'PRIVATE' | 'AUTHENTICATED' | 'PUBLIC';

export interface StorageItem {
  id: string;
  name: string;
  isFolder: boolean;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  modifiedAt: string;
  parentFolderId?: string;
  visibility: FileVisibility;
  downloadUrl?: string;
  thumbnailUrl?: string;
  md5Checksum?: string;
  storageProvider: string;
  owner?: string;
  tags?: string[];
}

export interface StorageQuota {
  providerId: string;
  providerName: string;
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
  percentUsed: number;
  isUnlimitedOrDynamic: boolean;
  quotaDetails?: {
    driveUsedBytes?: number;
    trashUsedBytes?: number;
  };
}

export interface ProviderConnectionStatus {
  connected: boolean;
  providerId: string;
  providerName: string;
  rootFolderId?: string;
  rootFolderName?: string;
  latencyMs?: number;
  message: string;
  details?: Record<string, any>;
  lastChecked: string;
}

export interface StorageProviderInfo {
  id: string;
  name: string;
  description: string;
  isConfigured: boolean;
  isActive: boolean;
}

export interface AIModelRecord {
  id: string;
  name: string;
  version: string;
  format: 'GGUF' | 'SafeTensors' | 'ONNX' | 'TensorRT-LLM' | 'PyTorch';
  quantization: string;
  sizeBytes: number;
  minRamGB: number;
  recommendedRamGB: number;
  downloadUrl: string;
  sha256: string;
  license: string;
  source: string;
  storageProvider: string;
  storageFileId?: string;
  status: 'ACTIVE' | 'ARCHIVED' | 'TESTING';
  description?: string;
  tags?: string[];
  updatedAt: string;
}

export interface APKReleaseRecord {
  id: string;
  version: string;
  versionCode: number;
  releaseDate: string;
  fileSize: number;
  sha256: string;
  downloadUrl: string;
  releaseNotes: string;
  minAndroidVersion: string;
  targetAndroidVersion: string;
  isLatest: boolean;
  storageFileId?: string;
  createdAt: string;
}

export interface ActivityLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userEmail: string;
  action: string;
  category: 'AUTH' | 'STORAGE' | 'MODELS' | 'APK' | 'USERS' | 'SETTINGS' | 'SYSTEM';
  details: string;
  status: 'SUCCESS' | 'FAILURE' | 'WARNING';
  ipAddress?: string;
}

export interface SystemConfig {
  siteName: string;
  adminEmail: string;
  activeStorageProvider: string;
  storageRootFolder: string;
  maxUploadSizeBytes: number;
  isSetupCompleted: boolean;
  registrationOpen: boolean;
  defaultFileVisibility: 'PRIVATE' | 'AUTHENTICATED' | 'PUBLIC';
  sessionDurationHours: number;
}

export interface EnvironmentVariableStatus {
  isSet: boolean;
  masked?: string;
}

export interface SystemHealth {
  status: string;
  uptime: string;
  uptimeSeconds: number;
  nodeVersion: string;
  platform: string;
  memory: {
    rssMB: string;
    heapUsedMB: string;
    heapTotalMB: string;
  };
  storageProvider: string;
  storageHealth: string;
  authProvider: string;
  timestamp: string;
}
