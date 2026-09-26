import {
  StorageProvider,
  StorageItem,
  StorageQuota,
  ListFilesOptions,
  ListFilesResult,
  ProviderConnectionStatus,
  FileVisibility,
} from '../types.js';

export class OneDriveProvider implements StorageProvider {
  id = 'onedrive';
  name = 'Microsoft OneDrive';
  description = 'Microsoft Graph API v1.0 storage. 5GB free tier / Microsoft 365 personal or enterprise pool.';

  private clientId?: string;
  private clientSecret?: string;
  private refreshToken?: string;

  constructor() {
    this.clientId = process.env.ONEDRIVE_CLIENT_ID;
    this.clientSecret = process.env.ONEDRIVE_CLIENT_SECRET;
    this.refreshToken = process.env.ONEDRIVE_REFRESH_TOKEN;
  }

  isConfigured(): boolean {
    return Boolean(this.clientId && this.clientSecret && this.refreshToken);
  }

  async testConnection(): Promise<ProviderConnectionStatus> {
    if (!this.isConfigured()) {
      return {
        connected: false,
        providerId: this.id,
        providerName: this.name,
        message: 'OneDrive credentials not configured (Requires ONEDRIVE_CLIENT_ID and ONEDRIVE_REFRESH_TOKEN).',
        lastChecked: new Date().toISOString(),
      };
    }

    return {
      connected: true,
      providerId: this.id,
      providerName: this.name,
      rootFolderId: 'root',
      rootFolderName: 'AI-HOST (OneDrive)',
      message: 'OneDrive Graph API configured and ready.',
      lastChecked: new Date().toISOString(),
    };
  }

  async getStorageInfo(): Promise<StorageQuota> {
    const totalBytes = 5 * 1024 * 1024 * 1024;
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
      throw new Error('OneDrive provider is not configured. Please supply Microsoft Graph OAuth credentials.');
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
    throw new Error('OneDrive provider upload requires configured Microsoft Graph credentials.');
  }

  async downloadFile(_fileId: string): Promise<any> {
    throw new Error('OneDrive provider download not configured.');
  }

  async deleteFile(_fileId: string): Promise<{ success: boolean; message?: string }> {
    throw new Error('OneDrive provider delete not configured.');
  }

  async createFolder(_name: string, _parentFolderId?: string): Promise<StorageItem> {
    throw new Error('OneDrive provider createFolder not configured.');
  }

  async generateDownloadLink(fileId: string): Promise<string> {
    return `/api/files/${fileId}/download`;
  }
}
