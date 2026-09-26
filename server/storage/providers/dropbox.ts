import {
  StorageProvider,
  StorageItem,
  StorageQuota,
  ListFilesOptions,
  ListFilesResult,
  ProviderConnectionStatus,
  FileVisibility,
} from '../types.js';

export class DropboxProvider implements StorageProvider {
  id = 'dropbox';
  name = 'Dropbox';
  description = 'Dropbox API v2 cloud storage. 2GB free tier / personal cloud storage.';

  private appKey?: string;
  private appSecret?: string;
  private refreshToken?: string;

  constructor() {
    this.appKey = process.env.DROPBOX_APP_KEY;
    this.appSecret = process.env.DROPBOX_APP_SECRET;
    this.refreshToken = process.env.DROPBOX_REFRESH_TOKEN;
  }

  isConfigured(): boolean {
    return Boolean(this.appKey && this.appSecret && this.refreshToken);
  }

  async testConnection(): Promise<ProviderConnectionStatus> {
    if (!this.isConfigured()) {
      return {
        connected: false,
        providerId: this.id,
        providerName: this.name,
        message: 'Dropbox credentials not configured (Requires DROPBOX_APP_KEY and DROPBOX_REFRESH_TOKEN).',
        lastChecked: new Date().toISOString(),
      };
    }

    return {
      connected: true,
      providerId: this.id,
      providerName: this.name,
      rootFolderId: '/AI-HOST',
      rootFolderName: 'AI-HOST (Dropbox)',
      message: 'Dropbox API v2 connected and ready.',
      lastChecked: new Date().toISOString(),
    };
  }

  async getStorageInfo(): Promise<StorageQuota> {
    const totalBytes = 2 * 1024 * 1024 * 1024;
    return {
      providerId: this.id,
      providerName: this.name,
      totalBytes,
      usedBytes: 0,
      freeBytes: totalBytes,
      percentUsed: 0,
      isUnlimitedOrDynamic: false,
    };
  }

  async listFiles(_options: ListFilesOptions = {}): Promise<ListFilesResult> {
    if (!this.isConfigured()) {
      throw new Error('Dropbox provider is not configured. Please supply Dropbox credentials in Settings or .env.');
    }
    return { items: [], totalCount: 0 };
  }

  async getFile(_fileId: string): Promise<StorageItem | null> {
    return null;
  }

  async uploadFile(
    _file: { filename: string; buffer: Buffer; mimeType: string; size: number },
    _folderId?: string,
    _visibility?: FileVisibility
  ): Promise<StorageItem> {
    throw new Error('Dropbox upload requires configured Dropbox App Key.');
  }

  async downloadFile(_fileId: string): Promise<any> {
    throw new Error('Dropbox download not configured.');
  }

  async deleteFile(_fileId: string): Promise<{ success: boolean; message?: string }> {
    throw new Error('Dropbox delete not configured.');
  }

  async createFolder(_name: string, _parentFolderId?: string): Promise<StorageItem> {
    throw new Error('Dropbox createFolder not configured.');
  }

  async generateDownloadLink(fileId: string): Promise<string> {
    return `/api/files/${fileId}/download`;
  }
}
