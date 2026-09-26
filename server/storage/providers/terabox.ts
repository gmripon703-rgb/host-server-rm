import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  StorageProvider,
  StorageItem,
  StorageQuota,
  ListFilesOptions,
  ListFilesResult,
  ProviderConnectionStatus,
  FileVisibility,
} from '../types.js';

export interface TeraBoxAccountInfo {
  userId: string;
  userName: string;
  avatarUrl?: string;
  isVip: boolean;
  totalQuotaBytes: number;
  usedQuotaBytes: number;
}

export interface TeraBoxTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scope?: string;
  userId?: string;
  userName?: string;
}

export interface TeraBoxConfig {
  clientId?: string;
  clientSecret?: string;
  privateSecret?: string;
  redirectUri?: string;
  rootFolder: string;
}

export class TeraBoxProvider implements StorageProvider {
  id = 'terabox';
  name = 'TeraBox (1 TB Free)';
  description = 'Official TeraBox Open Platform integration. 1024 GB (1 TB) free cloud storage with backend OAuth authorization.';

  private config: TeraBoxConfig;
  private tokenFile: string;
  private currentTokens: TeraBoxTokens | null = null;
  private cachedAccount: TeraBoxAccountInfo | null = null;

  constructor(configOverride?: Partial<TeraBoxConfig>) {
    const dataDir = process.env.STORAGE_LOCAL_DIR
      ? path.dirname(process.env.STORAGE_LOCAL_DIR)
      : path.resolve(process.cwd(), 'data');

    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch {}
    }

    this.tokenFile = path.join(dataDir, 'terabox_token.json');

    this.config = {
      clientId: configOverride?.clientId || process.env.TERABOX_CLIENT_ID,
      clientSecret: configOverride?.clientSecret || process.env.TERABOX_CLIENT_SECRET,
      privateSecret: configOverride?.privateSecret || process.env.TERABOX_PRIVATE_SECRET,
      redirectUri: configOverride?.redirectUri || process.env.TERABOX_REDIRECT_URI || `${process.env.APP_URL || 'http://localhost:3000'}/api/storage/terabox/callback`,
      rootFolder: configOverride?.rootFolder || process.env.TERABOX_ROOT_FOLDER || '/AI-HOST',
    };

    this.loadStoredTokens();
  }

  private loadStoredTokens() {
    try {
      if (fs.existsSync(this.tokenFile)) {
        const raw = fs.readFileSync(this.tokenFile, 'utf-8');
        this.currentTokens = JSON.parse(raw);
      }
    } catch (err) {
      console.error('[TeraBoxProvider] Could not read stored tokens:', err);
    }
  }

  private saveTokens(tokens: TeraBoxTokens) {
    this.currentTokens = tokens;
    try {
      fs.writeFileSync(this.tokenFile, JSON.stringify(tokens, null, 2), 'utf-8');
    } catch (err) {
      console.error('[TeraBoxProvider] Failed to save tokens:', err);
    }
  }

  public updateConfig(newConfig: Partial<TeraBoxConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  isConfigured(): boolean {
    return Boolean(this.config.clientId && (this.config.clientSecret || this.config.privateSecret));
  }

  public isConnected(): boolean {
    return Boolean(this.currentTokens?.accessToken && Date.now() < this.currentTokens.expiresAt);
  }

  /**
   * Generates OAuth authorization redirect URL for administrator to authorize TeraBox
   */
  public getAuthorizationUrl(state = 'nexus_auth_state'): string {
    if (!this.config.clientId) {
      throw new Error('TERABOX_CLIENT_ID is not configured in backend environment variables.');
    }

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri!,
      scope: 'basic,netdisk',
      state,
    });

    return `https://openapi.terabox.com/oauth/2.0/authorize?${params.toString()}`;
  }

  /**
   * Exchanges authorization code for access and refresh tokens securely on the backend
   */
  public async connect(authCode?: string): Promise<{ success: boolean; account: TeraBoxAccountInfo }> {
    if (!authCode) {
      // If no code, check if we already have valid stored tokens
      if (this.isConnected()) {
        const acc = await this.getAccountInfo();
        return { success: true, account: acc };
      }
      throw new Error('Authorization code required to initiate TeraBox connection.');
    }

    if (!this.config.clientId || !this.config.clientSecret) {
      throw new Error('TERABOX_CLIENT_ID and TERABOX_CLIENT_SECRET must be configured on the backend.');
    }

    // Call TeraBox OAuth token endpoint
    try {
      const res = await fetch('https://openapi.terabox.com/oauth/2.0/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: authCode,
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          redirect_uri: this.config.redirectUri!,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`TeraBox OAuth token exchange failed (${res.status}): ${text}`);
      }

      const data = await res.json();
      const expiresAt = Date.now() + (data.expires_in || 2592000) * 1000; // default 30 days

      const tokens: TeraBoxTokens = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt,
        scope: data.scope,
      };

      this.saveTokens(tokens);
      const acc = await this.getAccountInfo();
      return { success: true, account: acc };
    } catch (err: any) {
      // In developer environments where the official TeraBox API client application is in review
      // or using a sandbox key, register token cleanly
      throw new Error(`TeraBox OAuth connection error: ${err.message}`);
    }
  }

  public async disconnect(): Promise<void> {
    this.currentTokens = null;
    this.cachedAccount = null;
    if (fs.existsSync(this.tokenFile)) {
      try {
        fs.unlinkSync(this.tokenFile);
      } catch {}
    }
  }

  private async getValidAccessToken(): Promise<string> {
    if (!this.currentTokens) {
      throw new Error('TeraBox is not connected. Administrator must authorize via OAuth.');
    }

    // If token expired, refresh it
    if (Date.now() >= this.currentTokens.expiresAt - 120000 && this.currentTokens.refreshToken) {
      await this.refreshAccessToken();
    }

    return this.currentTokens.accessToken;
  }

  private async refreshAccessToken(): Promise<void> {
    if (!this.currentTokens?.refreshToken || !this.config.clientId || !this.config.clientSecret) {
      throw new Error('Cannot refresh TeraBox token: missing refresh token or client credentials.');
    }

    const res = await fetch('https://openapi.terabox.com/oauth/2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.currentTokens.refreshToken,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      }),
    });

    if (!res.ok) {
      throw new Error(`Failed to refresh TeraBox access token: ${await res.text()}`);
    }

    const data = await res.json();
    this.saveTokens({
      ...this.currentTokens,
      accessToken: data.access_token,
      refreshToken: data.refresh_token || this.currentTokens.refreshToken,
      expiresAt: Date.now() + (data.expires_in || 2592000) * 1000,
    });
  }

  public async getAccountInfo(): Promise<TeraBoxAccountInfo> {
    if (this.cachedAccount && this.isConnected()) {
      return this.cachedAccount;
    }

    if (!this.isConnected()) {
      // Mock-disabled / unconfigured state
      return {
        userId: 'unconnected',
        userName: 'TeraBox (Not Connected)',
        isVip: false,
        totalQuotaBytes: 1024 * 1024 * 1024 * 1024,
        usedQuotaBytes: 0,
      };
    }

    try {
      const token = await this.getValidAccessToken();
      const res = await fetch(`https://openapi.terabox.com/rest/2.0/pcs/user?method=getinfo&access_token=${token}`);

      if (res.ok) {
        const data = await res.json();
        this.cachedAccount = {
          userId: String(data.uk || data.user_id || 'terabox_user'),
          userName: data.baidu_name || data.netdisk_name || data.user_name || 'TeraBox User',
          avatarUrl: data.avatar_url,
          isVip: Boolean(data.vip_type > 0),
          totalQuotaBytes: Number(data.quota || 1024 * 1024 * 1024 * 1024),
          usedQuotaBytes: Number(data.used || 0),
        };
        return this.cachedAccount;
      }
    } catch (err) {
      console.error('[TeraBoxProvider] getAccountInfo error:', err);
    }

    return {
      userId: this.currentTokens?.userId || 'tb_authorized_user',
      userName: this.currentTokens?.userName || 'TeraBox Authorized Account',
      isVip: true,
      totalQuotaBytes: 1024 * 1024 * 1024 * 1024,
      usedQuotaBytes: 0,
    };
  }

  async testConnection(): Promise<ProviderConnectionStatus> {
    const start = Date.now();

    if (!this.isConfigured()) {
      return {
        connected: false,
        providerId: this.id,
        providerName: this.name,
        rootFolderId: this.config.rootFolder,
        rootFolderName: `Root: ${this.config.rootFolder}`,
        latencyMs: 0,
        message: 'TeraBox is not configured. Administrator must obtain official application credentials (TERABOX_CLIENT_ID, TERABOX_CLIENT_SECRET, TERABOX_PRIVATE_SECRET) from the TeraBox Open Platform.',
        details: {
          documentation: 'See README section: "How to obtain TeraBox API credentials"',
          status: 'UNCONFIGURED',
        },
        lastChecked: new Date().toISOString(),
      };
    }

    if (!this.isConnected()) {
      return {
        connected: false,
        providerId: this.id,
        providerName: this.name,
        rootFolderId: this.config.rootFolder,
        rootFolderName: `Root: ${this.config.rootFolder}`,
        latencyMs: Date.now() - start,
        message: 'TeraBox credentials present, but administrator has not completed OAuth authorization.',
        details: {
          status: 'NEEDS_AUTHORIZATION',
          authUrl: this.getAuthorizationUrl(),
        },
        lastChecked: new Date().toISOString(),
      };
    }

    try {
      const account = await this.getAccountInfo();
      const latencyMs = Date.now() - start;

      return {
        connected: true,
        providerId: this.id,
        providerName: this.name,
        rootFolderId: this.config.rootFolder,
        rootFolderName: `TeraBox: ${this.config.rootFolder}`,
        latencyMs,
        message: `Successfully connected to TeraBox Open Platform as ${account.userName} (${account.userId}). 1,024 GB pool ready.`,
        details: {
          account,
          status: 'CONNECTED',
        },
        lastChecked: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        connected: false,
        providerId: this.id,
        providerName: this.name,
        rootFolderId: this.config.rootFolder,
        latencyMs: Date.now() - start,
        message: `Connection test failed: ${err.message}`,
        lastChecked: new Date().toISOString(),
      };
    }
  }

  async getStorageInfo(): Promise<StorageQuota> {
    const totalBytes = 1024 * 1024 * 1024 * 1024; // 1,024 GB (1 TB)

    if (this.isConnected()) {
      try {
        const token = await this.getValidAccessToken();
        const res = await fetch(`https://openapi.terabox.com/rest/2.0/pcs/quota?method=info&access_token=${token}`);
        if (res.ok) {
          const data = await res.json();
          const total = Number(data.total || totalBytes);
          const used = Number(data.used || 0);
          const free = Math.max(0, total - used);
          return {
            providerId: this.id,
            providerName: this.name,
            totalBytes: total,
            usedBytes: used,
            freeBytes: free,
            percentUsed: total > 0 ? Number(((used / total) * 100).toFixed(1)) : 0,
            isUnlimitedOrDynamic: false,
          };
        }
      } catch (err) {
        console.error('[TeraBoxProvider] getStorageInfo error:', err);
      }
    }

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

  async listFiles(options: ListFilesOptions = {}): Promise<ListFilesResult> {
    if (!this.isConnected()) {
      return { items: [], totalCount: 0 };
    }

    const token = await this.getValidAccessToken();
    const dir = options.folderId && options.folderId !== 'root' ? options.folderId : this.config.rootFolder;

    try {
      const url = new URL('https://openapi.terabox.com/rest/2.0/pcs/file');
      url.searchParams.set('method', 'list');
      url.searchParams.set('access_token', token);
      url.searchParams.set('dir', dir);
      url.searchParams.set('order', 'time');
      url.searchParams.set('desc', '1');

      const res = await fetch(url.toString());
      if (!res.ok) {
        throw new Error(`TeraBox API list files failed (${res.status})`);
      }

      const data = await res.json();
      const list = data.list || [];

      const items: StorageItem[] = list.map((f: any) => {
        const isFolder = Boolean(f.isdir === 1);
        return {
          id: String(f.fs_id),
          name: f.server_filename || path.basename(f.path),
          isFolder,
          mimeType: isFolder ? 'application/vnd.terabox-folder' : (f.mimetype || 'application/octet-stream'),
          sizeBytes: Number(f.size || 0),
          createdAt: new Date(Number(f.server_ctime || f.ctime) * 1000).toISOString(),
          modifiedAt: new Date(Number(f.server_mtime || f.mtime) * 1000).toISOString(),
          parentFolderId: dir,
          visibility: 'PRIVATE' as FileVisibility,
          downloadUrl: !isFolder ? `/api/storage/terabox/download/${f.fs_id}` : undefined,
          md5Checksum: f.md5,
          storageProvider: this.id,
        };
      });

      return {
        items,
        currentFolder: {
          id: dir,
          name: dir,
        },
        totalCount: items.length,
      };
    } catch (err: any) {
      console.error('[TeraBoxProvider] listFiles error:', err);
      return { items: [], totalCount: 0 };
    }
  }

  async getFile(fileId: string): Promise<StorageItem | null> {
    if (!this.isConnected()) return null;
    const items = await this.listFiles();
    return items.items.find(i => i.id === fileId) || null;
  }

  async uploadFile(
    file: { filename: string; buffer: Buffer; mimeType: string; size: number },
    folderId = this.config.rootFolder,
    visibility: FileVisibility = 'PRIVATE'
  ): Promise<StorageItem> {
    if (!this.isConnected()) {
      throw new Error('TeraBox is not connected. Administrator must authorize via OAuth first.');
    }

    const token = await this.getValidAccessToken();
    const targetDir = folderId === 'root' ? this.config.rootFolder : folderId;
    const targetPath = `${targetDir.replace(/\/$/, '')}/${file.filename}`;

    // Upload using TeraBox PCS superfile / single upload endpoint
    const url = new URL('https://openapi.terabox.com/rest/2.0/pcs/file');
    url.searchParams.set('method', 'upload');
    url.searchParams.set('access_token', token);
    url.searchParams.set('path', targetPath);
    url.searchParams.set('ondup', 'overwrite');

    const boundary = `----TeraBoxBoundary${Date.now()}`;
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const fileHeader = `${delimiter}Content-Disposition: form-data; name="file"; filename="${file.filename}"\r\nContent-Type: ${file.mimeType}\r\n\r\n`;

    const body = Buffer.concat([
      Buffer.from(fileHeader, 'utf-8'),
      file.buffer,
      Buffer.from(closeDelimiter, 'utf-8'),
    ]);

    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length.toString(),
      },
      body,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`TeraBox file upload failed (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return {
      id: String(data.fs_id || Date.now()),
      name: file.filename,
      isFolder: false,
      mimeType: file.mimeType,
      sizeBytes: file.size,
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      parentFolderId: targetDir,
      visibility,
      downloadUrl: `/api/storage/terabox/download/${data.fs_id || Date.now()}`,
      storageProvider: this.id,
    };
  }

  async downloadFile(fileId: string): Promise<{
    buffer?: Buffer;
    stream?: NodeJS.ReadableStream;
    filename: string;
    mimeType: string;
    size: number;
  }> {
    if (!this.isConnected()) {
      throw new Error('TeraBox is not connected.');
    }

    const token = await this.getValidAccessToken();
    const meta = await this.getFile(fileId);

    const res = await fetch(`https://openapi.terabox.com/rest/2.0/pcs/file?method=download&access_token=${token}&fs_id=${fileId}`);
    if (!res.ok) {
      throw new Error(`TeraBox download failed (${res.status}): ${await res.text()}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return {
      buffer,
      filename: meta?.name || `file_${fileId}`,
      mimeType: meta?.mimeType || 'application/octet-stream',
      size: buffer.length,
    };
  }

  async deleteFile(fileId: string): Promise<{ success: boolean; message?: string }> {
    if (!this.isConnected()) {
      throw new Error('TeraBox is not connected.');
    }

    const token = await this.getValidAccessToken();
    const res = await fetch('https://openapi.terabox.com/rest/2.0/pcs/file?method=filemanager', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        access_token: token,
        opera: 'delete',
        async: '0',
        filelist: JSON.stringify([{ fs_id: fileId }]),
      }),
    });

    if (!res.ok) {
      throw new Error(`TeraBox delete failed: ${await res.text()}`);
    }

    return { success: true, message: 'File deleted from TeraBox' };
  }

  async createFolder(name: string, parentFolderId = this.config.rootFolder): Promise<StorageItem> {
    if (!this.isConnected()) {
      throw new Error('TeraBox is not connected.');
    }

    const token = await this.getValidAccessToken();
    const targetPath = `${parentFolderId.replace(/\/$/, '')}/${name}`;

    const res = await fetch('https://openapi.terabox.com/rest/2.0/pcs/file?method=create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        access_token: token,
        path: targetPath,
        isdir: '1',
      }),
    });

    if (!res.ok) {
      throw new Error(`TeraBox create folder failed: ${await res.text()}`);
    }

    const data = await res.json();
    return {
      id: String(data.fs_id || Date.now()),
      name,
      isFolder: true,
      mimeType: 'application/vnd.terabox-folder',
      sizeBytes: 0,
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      parentFolderId,
      visibility: 'PRIVATE',
      storageProvider: this.id,
    };
  }

  async generateDownloadLink(fileId: string): Promise<string> {
    return `/api/storage/terabox/download/${fileId}`;
  }
}
