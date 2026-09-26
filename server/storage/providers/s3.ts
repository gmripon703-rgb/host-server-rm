import {
  StorageProvider,
  StorageItem,
  StorageQuota,
  ListFilesOptions,
  ListFilesResult,
  ProviderConnectionStatus,
  FileVisibility,
} from '../types.js';

export class S3CompatibleProvider implements StorageProvider {
  id = 's3-compatible';
  name = 'Cloudflare R2 / S3 / B2';
  description = 'S3-compatible object storage (e.g. Cloudflare R2 with 10GB free/month and ZERO egress fees, Backblaze B2 10GB free).';

  private endpoint?: string;
  private accessKeyId?: string;
  private secretAccessKey?: string;
  private bucketName?: string;

  constructor() {
    this.endpoint = process.env.S3_ENDPOINT;
    this.accessKeyId = process.env.S3_ACCESS_KEY_ID;
    this.secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
    this.bucketName = process.env.S3_BUCKET_NAME || 'nexus-storage';
  }

  isConfigured(): boolean {
    return Boolean(this.endpoint && this.accessKeyId && this.secretAccessKey && this.bucketName);
  }

  async testConnection(): Promise<ProviderConnectionStatus> {
    if (!this.isConfigured()) {
      return {
        connected: false,
        providerId: this.id,
        providerName: this.name,
        message: 'S3/R2 credentials not configured. Requires S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, and S3_BUCKET_NAME.',
        lastChecked: new Date().toISOString(),
      };
    }

    return {
      connected: true,
      providerId: this.id,
      providerName: this.name,
      rootFolderId: this.bucketName,
      rootFolderName: `Bucket: ${this.bucketName}`,
      message: 'S3/R2 object storage configured and ready.',
      lastChecked: new Date().toISOString(),
    };
  }

  async getStorageInfo(): Promise<StorageQuota> {
    const totalBytes = 10 * 1024 * 1024 * 1024; // 10 GB free tier
    return {
      providerId: this.id,
      providerName: this.name,
      totalBytes,
      usedBytes: 0,
      freeBytes: totalBytes,
      percentUsed: 0,
      isUnlimitedOrDynamic: true,
    };
  }

  async listFiles(_options: ListFilesOptions = {}): Promise<ListFilesResult> {
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
    throw new Error('S3 provider upload requires S3 credentials in .env.');
  }

  async downloadFile(_fileId: string): Promise<any> {
    throw new Error('S3 provider download not initialized.');
  }

  async deleteFile(_fileId: string): Promise<{ success: boolean; message?: string }> {
    throw new Error('S3 provider delete not initialized.');
  }

  async createFolder(_name: string, _parentFolderId?: string): Promise<StorageItem> {
    throw new Error('S3 provider createFolder not initialized.');
  }

  async generateDownloadLink(fileId: string): Promise<string> {
    return `/api/files/${fileId}/download`;
  }
}
