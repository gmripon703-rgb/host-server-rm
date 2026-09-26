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

export interface GoogleDriveConfig {
  authMode: 'service_account' | 'oauth2' | 'none';
  serviceAccountEmail?: string;
  privateKey?: string;
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  rootFolderId?: string;
  rootFolderName?: string;
}

export class GoogleDriveProvider implements StorageProvider {
  id = 'google-drive';
  name = 'Google Drive';
  description = 'Google Cloud Drive v3 storage. High capacity (15GB free per account or Workspace pool), secure cloud persistence.';

  private cachedAccessToken: string | null = null;
  private tokenExpiresAt = 0;
  private config: GoogleDriveConfig;

  constructor(configOverride?: Partial<GoogleDriveConfig>) {
    this.config = this.loadConfig(configOverride);
  }

  public updateConfig(newConfig: Partial<GoogleDriveConfig>) {
    this.config = { ...this.config, ...newConfig };
    this.cachedAccessToken = null;
    this.tokenExpiresAt = 0;
  }

  private loadConfig(override?: Partial<GoogleDriveConfig>): GoogleDriveConfig {
    let saJson: any = null;
    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      try {
        saJson = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
      } catch {
        // ignore
      }
    }

    const saEmail = override?.serviceAccountEmail || saJson?.client_email || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const saKey = override?.privateKey || saJson?.private_key || process.env.GOOGLE_PRIVATE_KEY;
    const clientId = override?.clientId || process.env.GOOGLE_CLIENT_ID;
    const clientSecret = override?.clientSecret || process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = override?.refreshToken || process.env.GOOGLE_REFRESH_TOKEN;

    let authMode: 'service_account' | 'oauth2' | 'none' = 'none';
    if (saEmail && saKey) {
      authMode = 'service_account';
    } else if (clientId && clientSecret && refreshToken) {
      authMode = 'oauth2';
    }

    return {
      authMode,
      serviceAccountEmail: saEmail,
      privateKey: saKey?.replace(/\\n/g, '\n'),
      clientId,
      clientSecret,
      refreshToken,
      rootFolderId: override?.rootFolderId || process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || 'root',
      rootFolderName: override?.rootFolderName || process.env.GOOGLE_DRIVE_ROOT_FOLDER_NAME || 'AI-HOST',
    };
  }

  isConfigured(): boolean {
    return this.config.authMode !== 'none';
  }

  private async getAccessToken(): Promise<string> {
    if (this.cachedAccessToken && Date.now() < this.tokenExpiresAt - 60000) {
      return this.cachedAccessToken;
    }

    if (this.config.authMode === 'service_account') {
      return this.getServiceAccountAccessToken();
    } else if (this.config.authMode === 'oauth2') {
      return this.getOAuth2AccessToken();
    }

    throw new Error('Google Drive credentials are not configured. Please supply Service Account or OAuth2 keys in Settings.');
  }

  private async getServiceAccountAccessToken(): Promise<string> {
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 3600;

    const header = { alg: 'RS256', typ: 'JWT' };
    const claim = {
      iss: this.config.serviceAccountEmail,
      scope: 'https://www.googleapis.com/auth/drive',
      aud: 'https://oauth2.googleapis.com/token',
      exp,
      iat,
    };

    const encodeBase64Url = (obj: any) =>
      Buffer.from(JSON.stringify(obj))
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

    const signingInput = `${encodeBase64Url(header)}.${encodeBase64Url(claim)}`;
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(signingInput);
    const signature = signer
      .sign(this.config.privateKey!, 'base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    const jwt = `${signingInput}.${signature}`;

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Google OAuth error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    this.cachedAccessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in || 3600) * 1000;
    return this.cachedAccessToken!;
  }

  private async getOAuth2AccessToken(): Promise<string> {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.config.clientId!,
        client_secret: this.config.clientSecret!,
        refresh_token: this.config.refreshToken!,
        grant_type: 'refresh_token',
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Google OAuth Refresh error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    this.cachedAccessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in || 3600) * 1000;
    return this.cachedAccessToken!;
  }

  async testConnection(): Promise<ProviderConnectionStatus> {
    const start = Date.now();
    if (!this.isConfigured()) {
      return {
        connected: false,
        providerId: this.id,
        providerName: this.name,
        rootFolderId: this.config.rootFolderId,
        rootFolderName: this.config.rootFolderName,
        latencyMs: 0,
        message: 'Google Drive credentials not configured. Please supply Service Account Key or OAuth2 keys.',
        lastChecked: new Date().toISOString(),
      };
    }

    try {
      const token = await this.getAccessToken();
      const res = await fetch('https://www.googleapis.com/drive/v3/about?fields=user,storageQuota', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const text = await res.text();
        return {
          connected: false,
          providerId: this.id,
          providerName: this.name,
          rootFolderId: this.config.rootFolderId,
          latencyMs: Date.now() - start,
          message: `API authorization rejected (${res.status}): ${text}`,
          lastChecked: new Date().toISOString(),
        };
      }

      const data = await res.json();
      return {
        connected: true,
        providerId: this.id,
        providerName: this.name,
        rootFolderId: this.config.rootFolderId,
        rootFolderName: this.config.rootFolderName,
        latencyMs: Date.now() - start,
        message: `Successfully connected as ${data.user?.displayName || data.user?.emailAddress || 'Authorized User'}.`,
        details: {
          email: data.user?.emailAddress,
          displayName: data.user?.displayName,
          authMode: this.config.authMode,
        },
        lastChecked: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        connected: false,
        providerId: this.id,
        providerName: this.name,
        rootFolderId: this.config.rootFolderId,
        latencyMs: Date.now() - start,
        message: `Connection failed: ${err.message || 'Unknown network error'}`,
        lastChecked: new Date().toISOString(),
      };
    }
  }

  async getStorageInfo(): Promise<StorageQuota> {
    if (!this.isConfigured()) {
      return {
        providerId: this.id,
        providerName: this.name,
        totalBytes: 15 * 1024 * 1024 * 1024,
        usedBytes: 0,
        freeBytes: 15 * 1024 * 1024 * 1024,
        percentUsed: 0,
        isUnlimitedOrDynamic: false,
      };
    }

    try {
      const token = await this.getAccessToken();
      const res = await fetch('https://www.googleapis.com/drive/v3/about?fields=storageQuota', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        const limit = Number(data.storageQuota?.limit || 0);
        const usage = Number(data.storageQuota?.usage || 0);
        const driveUsage = Number(data.storageQuota?.usageInDrive || 0);
        const trashUsage = Number(data.storageQuota?.usageInDriveTrash || 0);

        const totalBytes = limit > 0 ? limit : 15 * 1024 * 1024 * 1024;
        const usedBytes = usage;
        const freeBytes = Math.max(0, totalBytes - usedBytes);
        const percentUsed = totalBytes > 0 ? Number(((usedBytes / totalBytes) * 100).toFixed(1)) : 0;

        return {
          providerId: this.id,
          providerName: this.name,
          totalBytes,
          usedBytes,
          freeBytes,
          percentUsed,
          isUnlimitedOrDynamic: limit === 0,
          quotaDetails: {
            driveUsedBytes: driveUsage,
            trashUsedBytes: trashUsage,
          },
        };
      }
    } catch (err) {
      console.error('[GoogleDriveProvider] getStorageInfo error:', err);
    }

    return {
      providerId: this.id,
      providerName: this.name,
      totalBytes: 15 * 1024 * 1024 * 1024,
      usedBytes: 0,
      freeBytes: 15 * 1024 * 1024 * 1024,
      percentUsed: 0,
      isUnlimitedOrDynamic: false,
    };
  }

  async listFiles(options: ListFilesOptions = {}): Promise<ListFilesResult> {
    if (!this.isConfigured()) {
      throw new Error('Google Drive is not configured. Please supply API credentials.');
    }

    const token = await this.getAccessToken();
    const parentFolderId = options.folderId || this.config.rootFolderId || 'root';

    let query = 'trashed = false';
    if (options.search) {
      const escaped = options.search.replace(/'/g, "\\'");
      query += ` and name contains '${escaped}'`;
    } else if (parentFolderId) {
      query += ` and '${parentFolderId}' in parents`;
    }

    const pageSize = options.pageSize || 50;
    const url = new URL('https://www.googleapis.com/drive/v3/files');
    url.searchParams.set('q', query);
    url.searchParams.set('pageSize', pageSize.toString());
    url.searchParams.set('fields', 'nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime, parents, md5Checksum, iconLink, thumbnailLink, webViewLink)');
    url.searchParams.set('orderBy', 'folder,modifiedTime desc,name');
    if (options.pageToken) {
      url.searchParams.set('pageToken', options.pageToken);
    }

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Google Drive API error (${res.status}): ${text}`);
    }

    const data = await res.json();
    const items: StorageItem[] = (data.files || []).map((f: any) => {
      const isFolder = f.mimeType === 'application/vnd.google-apps.folder';
      return {
        id: f.id,
        name: f.name,
        isFolder,
        mimeType: f.mimeType,
        sizeBytes: Number(f.size || 0),
        createdAt: f.createdTime,
        modifiedAt: f.modifiedTime,
        parentFolderId: f.parents?.[0] || 'root',
        visibility: 'PRIVATE' as FileVisibility,
        downloadUrl: !isFolder ? `/api/files/${f.id}/download` : undefined,
        thumbnailUrl: f.thumbnailLink,
        md5Checksum: f.md5Checksum,
        storageProvider: this.id,
      };
    });

    return {
      items,
      nextPageToken: data.nextPageToken,
      currentFolder: {
        id: parentFolderId,
        name: parentFolderId === 'root' ? (this.config.rootFolderName || 'AI-HOST') : parentFolderId,
      },
      totalCount: items.length,
    };
  }

  async getFile(fileId: string): Promise<StorageItem | null> {
    const token = await this.getAccessToken();
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,size,createdTime,modifiedTime,parents,md5Checksum,thumbnailLink`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 404) return null;
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Google Drive API getFile error (${res.status}): ${text}`);
    }

    const f = await res.json();
    const isFolder = f.mimeType === 'application/vnd.google-apps.folder';
    return {
      id: f.id,
      name: f.name,
      isFolder,
      mimeType: f.mimeType,
      sizeBytes: Number(f.size || 0),
      createdAt: f.createdTime,
      modifiedAt: f.modifiedTime,
      parentFolderId: f.parents?.[0] || 'root',
      visibility: 'PRIVATE',
      downloadUrl: !isFolder ? `/api/files/${f.id}/download` : undefined,
      thumbnailUrl: f.thumbnailLink,
      md5Checksum: f.md5Checksum,
      storageProvider: this.id,
    };
  }

  async uploadFile(
    file: { filename: string; buffer: Buffer; mimeType: string; size: number },
    folderId?: string,
    visibility: FileVisibility = 'PRIVATE'
  ): Promise<StorageItem> {
    const token = await this.getAccessToken();
    const parent = folderId || this.config.rootFolderId || 'root';

    const metadata = {
      name: file.filename,
      parents: parent && parent !== 'root' ? [parent] : undefined,
      description: `Uploaded via NexusControl. Visibility: ${visibility}`,
    };

    const boundary = `----NexusBoundary${Date.now()}`;
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadataPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}`;
    const mediaPartHeader = `${delimiter}Content-Type: ${file.mimeType || 'application/octet-stream'}\r\n\r\n`;

    const multipartBody = Buffer.concat([
      Buffer.from(metadataPart, 'utf-8'),
      Buffer.from(mediaPartHeader, 'utf-8'),
      file.buffer,
      Buffer.from(closeDelimiter, 'utf-8'),
    ]);

    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,createdTime,modifiedTime,md5Checksum', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'Content-Length': multipartBody.length.toString(),
      },
      body: multipartBody,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Google Drive file upload failed (${res.status}): ${text}`);
    }

    const data = await res.json();
    return {
      id: data.id,
      name: data.name,
      isFolder: false,
      mimeType: data.mimeType,
      sizeBytes: Number(data.size || file.size),
      createdAt: data.createdTime || new Date().toISOString(),
      modifiedAt: data.modifiedTime || new Date().toISOString(),
      parentFolderId: parent,
      visibility,
      downloadUrl: `/api/files/${data.id}/download`,
      md5Checksum: data.md5Checksum,
      storageProvider: this.id,
    };
  }

  async downloadFile(fileId: string): Promise<{
    buffer: Buffer;
    filename: string;
    mimeType: string;
    size: number;
  }> {
    const token = await this.getAccessToken();

    // Get metadata first
    const meta = await this.getFile(fileId);
    if (!meta) throw new Error('File not found on Google Drive');

    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Google Drive download error (${res.status}): ${text}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return {
      buffer,
      filename: meta.name,
      mimeType: meta.mimeType || 'application/octet-stream',
      size: buffer.length,
    };
  }

  async deleteFile(fileId: string): Promise<{ success: boolean; message?: string }> {
    const token = await this.getAccessToken();
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok && res.status !== 404) {
      const text = await res.text();
      throw new Error(`Google Drive deletion error (${res.status}): ${text}`);
    }

    return { success: true, message: 'File deleted from Google Drive' };
  }

  async createFolder(name: string, parentFolderId?: string): Promise<StorageItem> {
    const token = await this.getAccessToken();
    const parent = parentFolderId || this.config.rootFolderId || 'root';

    const body: any = {
      name,
      mimeType: 'application/vnd.google-apps.folder',
    };
    if (parent && parent !== 'root') {
      body.parents = [parent];
    }

    const res = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,mimeType,createdTime,modifiedTime', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Google Drive folder creation failed (${res.status}): ${text}`);
    }

    const data = await res.json();
    return {
      id: data.id,
      name: data.name,
      isFolder: true,
      mimeType: data.mimeType,
      sizeBytes: 0,
      createdAt: data.createdTime || new Date().toISOString(),
      modifiedAt: data.modifiedTime || new Date().toISOString(),
      parentFolderId: parent,
      visibility: 'PRIVATE',
      storageProvider: this.id,
    };
  }

  async renameFile(fileId: string, newName: string): Promise<StorageItem> {
    const token = await this.getAccessToken();
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,size,modifiedTime`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: newName }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Google Drive rename failed (${res.status}): ${text}`);
    }

    const data = await res.json();
    return {
      id: data.id,
      name: data.name,
      isFolder: data.mimeType === 'application/vnd.google-apps.folder',
      mimeType: data.mimeType,
      sizeBytes: Number(data.size || 0),
      createdAt: new Date().toISOString(),
      modifiedAt: data.modifiedTime,
      visibility: 'PRIVATE',
      downloadUrl: `/api/files/${data.id}/download`,
      storageProvider: this.id,
    };
  }

  async generateDownloadLink(fileId: string, expiresInSeconds = 3600): Promise<string> {
    // Generate secure proxied download token
    const token = crypto.randomBytes(16).toString('hex');
    return `/api/files/${fileId}/download?access_token=${token}&expires_in=${expiresInSeconds}`;
  }
}
