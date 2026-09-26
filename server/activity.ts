import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ActivityLogEntry } from './types.js';

export class ActivityLogger {
  private static instance: ActivityLogger;
  private logFile: string;
  private logs: ActivityLogEntry[] = [];
  private maxLogsInMemory = 500;

  private constructor() {
    const dataDir = process.env.STORAGE_LOCAL_DIR ? path.dirname(process.env.STORAGE_LOCAL_DIR) : path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch {}
    }
    this.logFile = path.join(dataDir, 'activity_logs.json');
    this.loadLogs();
  }

  public static getInstance(): ActivityLogger {
    if (!ActivityLogger.instance) {
      ActivityLogger.instance = new ActivityLogger();
    }
    return ActivityLogger.instance;
  }

  private loadLogs() {
    try {
      if (fs.existsSync(this.logFile)) {
        const raw = fs.readFileSync(this.logFile, 'utf-8');
        this.logs = JSON.parse(raw);
      } else {
        this.seedInitialLogs();
      }
    } catch (err) {
      console.error('[ActivityLogger] Error loading logs:', err);
      this.seedInitialLogs();
    }
  }

  private seedInitialLogs() {
    this.logs = [
      {
        id: 'log-init-1',
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        userId: 'system',
        userEmail: 'system@nexus.internal',
        action: 'SYSTEM_BOOT',
        category: 'SYSTEM',
        details: 'NexusControl control panel initialized with secure RBAC and storage abstraction layer.',
        status: 'SUCCESS',
        ipAddress: '127.0.0.1',
      },
      {
        id: 'log-init-2',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        userId: 'admin-001',
        userEmail: 'admin@nexus.internal',
        action: 'STORAGE_INIT',
        category: 'STORAGE',
        details: 'Storage abstraction configured. Verified Google Drive and Local Persistent drivers.',
        status: 'SUCCESS',
        ipAddress: '127.0.0.1',
      },
    ];
    this.saveLogs();
  }

  private saveLogs() {
    try {
      fs.writeFileSync(this.logFile, JSON.stringify(this.logs.slice(0, this.maxLogsInMemory), null, 2), 'utf-8');
    } catch (err) {
      console.error('[ActivityLogger] Failed to save logs:', err);
    }
  }

  public log(entry: Omit<ActivityLogEntry, 'id' | 'timestamp'>): ActivityLogEntry {
    const newEntry: ActivityLogEntry = {
      id: `log_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };

    // Prepend
    this.logs.unshift(newEntry);
    if (this.logs.length > this.maxLogsInMemory) {
      this.logs.length = this.maxLogsInMemory;
    }
    this.saveLogs();
    return newEntry;
  }

  public getLogs(options?: {
    category?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    let filtered = this.logs;

    if (options?.category && options.category !== 'ALL') {
      filtered = filtered.filter(l => l.category === options.category);
    }

    if (options?.search) {
      const q = options.search.toLowerCase();
      filtered = filtered.filter(
        l =>
          l.action.toLowerCase().includes(q) ||
          l.userEmail.toLowerCase().includes(q) ||
          l.details.toLowerCase().includes(q)
      );
    }

    const limit = options?.limit || 100;
    const offset = options?.offset || 0;
    const sliced = filtered.slice(offset, offset + limit);

    return {
      total: filtered.length,
      logs: sliced,
    };
  }

  public exportCsv(): string {
    const headers = ['Timestamp', 'Category', 'Action', 'User Email', 'Status', 'IP Address', 'Details'];
    const escapeCsv = (str: string) => `"${(str || '').replace(/"/g, '""')}"`;

    const rows = this.logs.map(l => [
      escapeCsv(l.timestamp),
      escapeCsv(l.category),
      escapeCsv(l.action),
      escapeCsv(l.userEmail),
      escapeCsv(l.status),
      escapeCsv(l.ipAddress || 'unknown'),
      escapeCsv(l.details),
    ].join(','));

    return [headers.join(','), ...rows].join('\n');
  }

  public exportJson(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  public clearLogs() {
    this.logs = [];
    this.saveLogs();
  }
}
