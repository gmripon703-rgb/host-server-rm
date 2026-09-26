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

export interface UserWithPassword extends User {
  passwordHash: string;
  salt: string;
}

export interface AuthSession {
  token: string;
  userId: string;
  email: string;
  role: UserRole;
  name: string;
  expiresAt: number;
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
