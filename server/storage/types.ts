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

export interface ListFilesOptions {
  folderId?: string;
  search?: string;
  pageToken?: string;
  pageSize?: number;
  sortBy?: 'name' | 'modifiedAt' | 'sizeBytes';
  sortOrder?: 'asc' | 'desc';
}

export interface ListFilesResult {
  items: StorageItem[];
  nextPageToken?: string;
  currentFolder?: {
    id: string;
    name: string;
    parentId?: string;
  };
  totalCount: number;
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

export interface StorageProvider {
  id: string;
  name: string;
  description: string;
  isConfigured(): boolean;
  testConnection(): Promise<ProviderConnectionStatus>;
  getStorageInfo(): Promise<StorageQuota>;
  listFiles(options?: ListFilesOptions): Promise<ListFilesResult>;
  getFile(fileId: string): Promise<StorageItem | null>;
  uploadFile(
    file: { filename: string; buffer: Buffer; mimeType: string; size: number },
    folderId?: string,
    visibility?: FileVisibility
  ): Promise<StorageItem>;
  downloadFile(fileId: string): Promise<{
    stream?: NodeJS.ReadableStream;
    buffer?: Buffer;
    filename: string;
    mimeType: string;
    size: number;
  }>;
  deleteFile(fileId: string): Promise<{ success: boolean; message?: string }>;
  createFolder(name: string, parentFolderId?: string): Promise<StorageItem>;
  renameFile?(fileId: string, newName: string): Promise<StorageItem>;
  generateDownloadLink(fileId: string, expiresInSeconds?: number): Promise<string>;
}
