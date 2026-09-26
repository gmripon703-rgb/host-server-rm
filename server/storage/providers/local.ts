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

interface LocalFileRecord {
  id: string;
  name: string;
  isFolder: boolean;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  modifiedAt: string;
  parentFolderId?: string;
  visibility: FileVisibility;
  diskFilename?: string;
  md5Checksum?: string;
  tags?: string[];
}

export class LocalDiskProvider implements StorageProvider {
  id = 'local-disk';
  name = 'Local Persistent Storage';
  description = 'Local zero-config filesystem storage. Perfect for local dev, Docker volumes, and container storage.';

  private baseDir: string;
  private uploadDir: string;
  private metaFile: string;
  private records: Map<string, LocalFileRecord> = new Map();

  constructor(customDir?: string) {
    this.baseDir = customDir || process.env.STORAGE_LOCAL_DIR || path.resolve(process.cwd(), 'data', 'storage');
    this.uploadDir = path.join(this.baseDir, 'files');
    this.metaFile = path.join(this.baseDir, 'metadata.json');
    this.init();
  }

  private init() {
    try {
      if (!fs.existsSync(this.baseDir)) {
        fs.mkdirSync(this.baseDir, { recursive: true });
      }
      if (!fs.existsSync(this.uploadDir)) {
        fs.mkdirSync(this.uploadDir, { recursive: true });
      }
      if (fs.existsSync(this.metaFile)) {
        const raw = fs.readFileSync(this.metaFile, 'utf-8');
        const list: LocalFileRecord[] = JSON.parse(raw);
        for (const item of list) {
          this.records.set(item.id, item);
        }
      } else {
        // Seed default folders
        this.seedInitialData();
      }
    } catch (err) {
      console.error('[LocalDiskProvider] Initialization error:', err);
    }
  }

  private seedInitialData() {
    const defaultFolders = [
      { id: 'folder-models', name: 'AI-Models', isFolder: true, parentFolderId: 'root' },
      { id: 'folder-apk', name: 'APK-Releases', isFolder: true, parentFolderId: 'root' },
      { id: 'folder-datasets', name: 'Datasets-Prompts', isFolder: true, parentFolderId: 'root' },
      { id: 'folder-general', name: 'General-Docs', isFolder: true, parentFolderId: 'root' },
    ];

    const now = new Date().toISOString();
    for (const f of defaultFolders) {
      this.records.set(f.id, {
        id: f.id,
        name: f.name,
        isFolder: true,
        mimeType: 'application/vnd.google-apps.folder',
        sizeBytes: 0,
        createdAt: now,
        modifiedAt: now,
        parentFolderId: f.parentFolderId,
        visibility: 'PRIVATE',
      });
    }
    this.saveMetadata();
  }

  private saveMetadata() {
    try {
      const list = Array.from(this.records.values());
      fs.writeFileSync(this.metaFile, JSON.stringify(list, null, 2), 'utf-8');
    } catch (err) {
      console.error('[LocalDiskProvider] Failed to save metadata:', err);
    }
  }

  isConfigured(): boolean {
    return true;
  }

  async testConnection(): Promise<ProviderConnectionStatus> {
    const start = Date.now();
    const canWrite = fs.existsSync(this.baseDir);
    const latencyMs = Date.now() - start;

    return {
      connected: canWrite,
      providerId: this.id,
      providerName: this.name,
      rootFolderId: 'root',
      rootFolderName: 'AI-HOST (Local Disk)',
      latencyMs,
      message: canWrite ? 'Local persistent disk is ready and writable.' : 'Storage directory is inaccessible.',
      lastChecked: new Date().toISOString(),
    };
  }

  async getStorageInfo(): Promise<StorageQuota> {
    let usedBytes = 0;
    for (const item of this.records.values()) {
      if (!item.isFolder) {
        usedBytes += item.sizeBytes || 0;
      }
    }

    // Default 15 GB virtual quota for local/container dev
    const totalBytes = 15 * 1024 * 1024 * 1024;
    const freeBytes = Math.max(0, totalBytes - usedBytes);
    const percentUsed = Number(((usedBytes / totalBytes) * 1024 / 10).toFixed(1));

    return {
      providerId: this.id,
      providerName: this.name,
      totalBytes,
      usedBytes,
      freeBytes,
      percentUsed,
      isUnlimitedOrDynamic: false,
    };
  }

  async listFiles(options: ListFilesOptions = {}): Promise<ListFilesResult> {
    const parentFolderId = options.folderId || 'root';
    let all = Array.from(this.records.values());

    if (options.search) {
      const q = options.search.toLowerCase();
      all = all.filter(item => item.name.toLowerCase().includes(q));
    } else {
      all = all.filter(item => (item.parentFolderId || 'root') === parentFolderId);
    }

    // Sort: Folders first, then files
    all.sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;
      if (options.sortBy === 'sizeBytes') {
        return options.sortOrder === 'asc' ? a.sizeBytes - b.sizeBytes : b.sizeBytes - a.sizeBytes;
      }
      if (options.sortBy === 'modifiedAt') {
        return options.sortOrder === 'asc'
          ? a.modifiedAt.localeCompare(b.modifiedAt)
          : b.modifiedAt.localeCompare(a.modifiedAt);
      }
      return options.sortOrder === 'desc' ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name);
    });

    const currentFolder = parentFolderId !== 'root' ? this.records.get(parentFolderId) : undefined;

    return {
      items: all.map(r => ({
        ...r,
        storageProvider: this.id,
        downloadUrl: !r.isFolder ? `/api/files/${r.id}/download` : undefined,
      })),
      totalCount: all.length,
      currentFolder: currentFolder
        ? {
            id: currentFolder.id,
            name: currentFolder.name,
            parentId: currentFolder.parentFolderId,
          }
        : {
            id: 'root',
            name: 'Root / AI-HOST',
          },
    };
  }

  async getFile(fileId: string): Promise<StorageItem | null> {
    const rec = this.records.get(fileId);
    if (!rec) return null;
    return {
      ...rec,
      storageProvider: this.id,
      downloadUrl: !rec.isFolder ? `/api/files/${rec.id}/download` : undefined,
    };
  }

  async uploadFile(
    file: { filename: string; buffer: Buffer; mimeType: string; size: number },
    folderId = 'root',
    visibility: FileVisibility = 'PRIVATE'
  ): Promise<StorageItem> {
    const id = `file_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const ext = path.extname(file.filename);
    const diskFilename = `${id}${ext}`;
    const filePath = path.join(this.uploadDir, diskFilename);

    fs.writeFileSync(filePath, file.buffer);

    const md5Checksum = crypto.createHash('md5').update(file.buffer).digest('hex');
    const now = new Date().toISOString();

    const record: LocalFileRecord = {
      id,
      name: file.filename,
      isFolder: false,
      mimeType: file.mimeType || 'application/octet-stream',
      sizeBytes: file.size,
      createdAt: now,
      modifiedAt: now,
      parentFolderId: folderId,
      visibility,
      diskFilename,
      md5Checksum,
    };

    this.records.set(id, record);
    this.saveMetadata();

    return {
      ...record,
      storageProvider: this.id,
      downloadUrl: `/api/files/${id}/download`,
    };
  }

  async downloadFile(fileId: string): Promise<{
    stream?: NodeJS.ReadableStream;
    buffer?: Buffer;
    filename: string;
    mimeType: string;
    size: number;
  }> {
    const rec = this.records.get(fileId);
    if (!rec || rec.isFolder || !rec.diskFilename) {
      throw new Error(`File with id ${fileId} not found or is a folder`);
    }

    const filePath = path.join(this.uploadDir, rec.diskFilename);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Physical file payload missing from storage`);
    }

    const stream = fs.createReadStream(filePath);
    return {
      stream,
      filename: rec.name,
      mimeType: rec.mimeType,
      size: rec.sizeBytes,
    };
  }

  async deleteFile(fileId: string): Promise<{ success: boolean; message?: string }> {
    const rec = this.records.get(fileId);
    if (!rec) {
      throw new Error(`File not found`);
    }

    if (rec.isFolder) {
      // Check if folder contains child items
      const hasChildren = Array.from(this.records.values()).some(i => i.parentFolderId === fileId);
      if (hasChildren) {
        throw new Error(`Cannot delete folder: it contains subfolders or files. Please empty it first.`);
      }
    } else if (rec.diskFilename) {
      const filePath = path.join(this.uploadDir, rec.diskFilename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    this.records.delete(fileId);
    this.saveMetadata();
    return { success: true, message: `Successfully deleted ${rec.name}` };
  }

  async createFolder(name: string, parentFolderId = 'root'): Promise<StorageItem> {
    const id = `folder_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const now = new Date().toISOString();

    const record: LocalFileRecord = {
      id,
      name,
      isFolder: true,
      mimeType: 'application/vnd.google-apps.folder',
      sizeBytes: 0,
      createdAt: now,
      modifiedAt: now,
      parentFolderId,
      visibility: 'PRIVATE',
    };

    this.records.set(id, record);
    this.saveMetadata();

    return {
      ...record,
      storageProvider: this.id,
    };
  }

  async renameFile(fileId: string, newName: string): Promise<StorageItem> {
    const rec = this.records.get(fileId);
    if (!rec) throw new Error('Item not found');
    rec.name = newName;
    rec.modifiedAt = new Date().toISOString();
    this.records.set(fileId, rec);
    this.saveMetadata();
    return {
      ...rec,
      storageProvider: this.id,
      downloadUrl: !rec.isFolder ? `/api/files/${rec.id}/download` : undefined,
    };
  }

  async generateDownloadLink(fileId: string, expiresInSeconds = 3600): Promise<string> {
    const token = crypto.randomBytes(16).toString('hex');
    return `/api/files/${fileId}/download?access_token=${token}&expires_in=${expiresInSeconds}`;
  }
}
