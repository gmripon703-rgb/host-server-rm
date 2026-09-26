import { StorageProvider, ProviderConnectionStatus, StorageQuota, StorageItem, ListFilesOptions, ListFilesResult, FileVisibility } from './types.js';
import { LocalDiskProvider } from './providers/local.js';
import { GoogleDriveProvider, GoogleDriveConfig } from './providers/googledrive.js';
import { OneDriveProvider } from './providers/onedrive.js';
import { DropboxProvider } from './providers/dropbox.js';
import { TeraBoxProvider } from './providers/terabox.js';
import { S3CompatibleProvider } from './providers/s3.js';

export class StorageManager {
  private static instance: StorageManager;
  private providers: Map<string, StorageProvider> = new Map();
  private activeProviderId: string = 'local-disk';
  private googleDriveProvider: GoogleDriveProvider;

  private constructor() {
    this.googleDriveProvider = new GoogleDriveProvider();
    const localProvider = new LocalDiskProvider();
    const oneDriveProvider = new OneDriveProvider();
    const dropboxProvider = new DropboxProvider();
    const teraboxProvider = new TeraBoxProvider();
    const s3Provider = new S3CompatibleProvider();

    this.registerProvider(this.googleDriveProvider);
    this.registerProvider(localProvider);
    this.registerProvider(teraboxProvider);
    this.registerProvider(s3Provider);
    this.registerProvider(oneDriveProvider);
    this.registerProvider(dropboxProvider);

    // If Google Drive is configured via env, prefer it, else default to local-disk
    const requested = process.env.ACTIVE_STORAGE_PROVIDER;
    if (requested && this.providers.has(requested)) {
      this.activeProviderId = requested;
    } else if (this.googleDriveProvider.isConfigured()) {
      this.activeProviderId = 'google-drive';
    } else {
      this.activeProviderId = 'local-disk';
    }
  }

  public static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  public registerProvider(provider: StorageProvider) {
    this.providers.set(provider.id, provider);
  }

  public getActiveProvider(): StorageProvider {
    const provider = this.providers.get(this.activeProviderId);
    if (!provider) {
      // Fallback to local
      return this.providers.get('local-disk')!;
    }
    return provider;
  }

  public getActiveProviderId(): string {
    return this.activeProviderId;
  }

  public setActiveProvider(id: string): boolean {
    if (!this.providers.has(id)) {
      throw new Error(`Storage provider with id '${id}' is not registered.`);
    }
    this.activeProviderId = id;
    return true;
  }

  public getProvider(id: string): StorageProvider | undefined {
    return this.providers.get(id);
  }

  public updateGoogleDriveConfig(config: Partial<GoogleDriveConfig>) {
    this.googleDriveProvider.updateConfig(config);
  }

  public getGoogleDriveProvider(): GoogleDriveProvider {
    return this.googleDriveProvider;
  }

  public getTeraBoxProvider(): TeraBoxProvider {
    return this.providers.get('terabox') as TeraBoxProvider;
  }

  public getAllProvidersList() {
    return Array.from(this.providers.values()).map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      isConfigured: p.isConfigured(),
      isActive: p.id === this.activeProviderId,
    }));
  }

  public async testAll(): Promise<ProviderConnectionStatus[]> {
    const results: ProviderConnectionStatus[] = [];
    for (const p of this.providers.values()) {
      try {
        const res = await p.testConnection();
        results.push(res);
      } catch (err: any) {
        results.push({
          connected: false,
          providerId: p.id,
          providerName: p.name,
          message: err.message || 'Check failed',
          lastChecked: new Date().toISOString(),
        });
      }
    }
    return results;
  }

  // Delegated active methods
  public async getStorageInfo(): Promise<StorageQuota> {
    return this.getActiveProvider().getStorageInfo();
  }

  public async listFiles(options?: ListFilesOptions): Promise<ListFilesResult> {
    return this.getActiveProvider().listFiles(options);
  }

  public async getFile(fileId: string): Promise<StorageItem | null> {
    return this.getActiveProvider().getFile(fileId);
  }

  public async uploadFile(
    file: { filename: string; buffer: Buffer; mimeType: string; size: number },
    folderId?: string,
    visibility?: FileVisibility
  ): Promise<StorageItem> {
    return this.getActiveProvider().uploadFile(file, folderId, visibility);
  }

  public async downloadFile(fileId: string) {
    return this.getActiveProvider().downloadFile(fileId);
  }

  public async deleteFile(fileId: string) {
    return this.getActiveProvider().deleteFile(fileId);
  }

  public async createFolder(name: string, parentFolderId?: string): Promise<StorageItem> {
    return this.getActiveProvider().createFolder(name, parentFolderId);
  }

  public async renameFile(fileId: string, newName: string): Promise<StorageItem> {
    const active = this.getActiveProvider();
    if (active.renameFile) {
      return active.renameFile(fileId, newName);
    }
    throw new Error(`Provider ${active.name} does not support renaming.`);
  }

  public async generateDownloadLink(fileId: string, expiresIn?: number): Promise<string> {
    return this.getActiveProvider().generateDownloadLink(fileId, expiresIn);
  }
}
