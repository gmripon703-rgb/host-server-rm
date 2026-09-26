import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { APKReleaseRecord } from './types.js';
import { ActivityLogger } from './activity.js';

export class APKManager {
  private static instance: APKManager;
  private apkFile: string;
  private releases: Map<string, APKReleaseRecord> = new Map();

  private constructor() {
    const dataDir = process.env.STORAGE_LOCAL_DIR ? path.dirname(process.env.STORAGE_LOCAL_DIR) : path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch {}
    }
    this.apkFile = path.join(dataDir, 'apk_releases.json');
    this.initReleases();
  }

  public static getInstance(): APKManager {
    if (!APKManager.instance) {
      APKManager.instance = new APKManager();
    }
    return APKManager.instance;
  }

  private initReleases() {
    try {
      if (fs.existsSync(this.apkFile)) {
        const raw = fs.readFileSync(this.apkFile, 'utf-8');
        const list: APKReleaseRecord[] = JSON.parse(raw);
        for (const r of list) {
          this.releases.set(r.id, r);
        }
      } else {
        this.seedInitialReleases();
      }
    } catch (err) {
      console.error('[APKManager] Error reading apk_releases.json:', err);
      this.seedInitialReleases();
    }
  }

  private seedInitialReleases() {
    const initialReleases: APKReleaseRecord[] = [
      {
        id: 'apk-rel-v1.2.0',
        version: '1.2.0',
        versionCode: 120,
        releaseDate: new Date(Date.now() - 86400000 * 3).toISOString().split('T')[0],
        fileSize: 48500000, // ~48.5 MB
        sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        downloadUrl: '/api/apk/apk-rel-v1.2.0/download',
        releaseNotes: '• Support for on-device Gemma 2B model loading\n• Background model download manager\n• Latency optimizations on Snapdragon 8 Gen 2/3',
        minAndroidVersion: 'Android 10 (API 29)',
        targetAndroidVersion: 'Android 14 (API 34)',
        isLatest: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'apk-rel-v1.1.0',
        version: '1.1.0',
        versionCode: 110,
        releaseDate: new Date(Date.now() - 86400000 * 18).toISOString().split('T')[0],
        fileSize: 45200000, // ~45.2 MB
        sha256: 'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb',
        downloadUrl: '/api/apk/apk-rel-v1.1.0/download',
        releaseNotes: '• Initial beta release of mobile AI assistant\n• Token stream UI rendering\n• Basic offline speech-to-text',
        minAndroidVersion: 'Android 10 (API 29)',
        targetAndroidVersion: 'Android 14 (API 34)',
        isLatest: false,
        createdAt: new Date(Date.now() - 86400000 * 18).toISOString(),
      },
    ];

    for (const r of initialReleases) {
      this.releases.set(r.id, r);
    }
    this.saveReleases();
  }

  private saveReleases() {
    try {
      const list = Array.from(this.releases.values());
      fs.writeFileSync(this.apkFile, JSON.stringify(list, null, 2), 'utf-8');
    } catch (err) {
      console.error('[APKManager] Failed to save apk_releases.json:', err);
    }
  }

  public getReleases(): APKReleaseRecord[] {
    const list = Array.from(this.releases.values());
    return list.sort((a, b) => b.versionCode - a.versionCode);
  }

  public getLatestRelease(): APKReleaseRecord | null {
    const releases = this.getReleases();
    return releases.find(r => r.isLatest) || releases[0] || null;
  }

  public createRelease(data: Omit<APKReleaseRecord, 'id' | 'downloadUrl' | 'createdAt'>, actorEmail: string): APKReleaseRecord {
    const id = `apk-rel-v${data.version.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    if (data.isLatest) {
      for (const r of this.releases.values()) {
        r.isLatest = false;
      }
    }

    const newRelease: APKReleaseRecord = {
      ...data,
      id,
      downloadUrl: `/api/apk/${id}/download`,
      createdAt: new Date().toISOString(),
    };

    this.releases.set(id, newRelease);
    this.saveReleases();

    ActivityLogger.getInstance().log({
      userId: actorEmail,
      userEmail: actorEmail,
      action: 'APK_RELEASE_CREATED',
      category: 'APK',
      details: `Published APK release v${newRelease.version} (Code ${newRelease.versionCode})`,
      status: 'SUCCESS',
    });

    return newRelease;
  }

  public updateRelease(id: string, updates: Partial<APKReleaseRecord>, actorEmail: string): APKReleaseRecord {
    const existing = this.releases.get(id);
    if (!existing) throw new Error('APK release not found');

    if (updates.isLatest) {
      for (const r of this.releases.values()) {
        r.isLatest = false;
      }
    }

    const updated: APKReleaseRecord = {
      ...existing,
      ...updates,
      id: existing.id,
      downloadUrl: `/api/apk/${existing.id}/download`,
    };

    this.releases.set(id, updated);
    this.saveReleases();

    ActivityLogger.getInstance().log({
      userId: actorEmail,
      userEmail: actorEmail,
      action: 'APK_RELEASE_UPDATED',
      category: 'APK',
      details: `Updated APK release v${updated.version}`,
      status: 'SUCCESS',
    });

    return updated;
  }

  public deleteRelease(id: string, actorEmail: string): boolean {
    const existing = this.releases.get(id);
    if (!existing) throw new Error('APK release not found');

    this.releases.delete(id);
    this.saveReleases();

    ActivityLogger.getInstance().log({
      userId: actorEmail,
      userEmail: actorEmail,
      action: 'APK_RELEASE_DELETED',
      category: 'APK',
      details: `Deleted APK release v${existing.version}`,
      status: 'SUCCESS',
    });

    return true;
  }
}
