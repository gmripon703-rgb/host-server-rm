import fs from 'fs';
import path from 'path';
import { SystemConfig } from './types.js';
import { ActivityLogger } from './activity.js';

export class ConfigManager {
  private static instance: ConfigManager;
  private configFile: string;
  private config: SystemConfig;

  private constructor() {
    const dataDir = process.env.STORAGE_LOCAL_DIR ? path.dirname(process.env.STORAGE_LOCAL_DIR) : path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch {}
    }
    this.configFile = path.join(dataDir, 'config.json');
    this.config = this.loadConfig();
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private loadConfig(): SystemConfig {
    const defaults: SystemConfig = {
      siteName: 'NexusControl Admin Panel',
      adminEmail: process.env.DEFAULT_ADMIN_EMAIL || 'admin@nexus.internal',
      activeStorageProvider: process.env.ACTIVE_STORAGE_PROVIDER || 'local-disk',
      storageRootFolder: process.env.GOOGLE_DRIVE_ROOT_FOLDER_NAME || 'AI-HOST',
      maxUploadSizeBytes: 500 * 1024 * 1024, // 500 MB
      isSetupCompleted: true,
      registrationOpen: false,
      defaultFileVisibility: 'PRIVATE',
      sessionDurationHours: 24,
    };

    try {
      if (fs.existsSync(this.configFile)) {
        const raw = fs.readFileSync(this.configFile, 'utf-8');
        return { ...defaults, ...JSON.parse(raw) };
      }
    } catch (err) {
      console.error('[ConfigManager] Error reading config.json:', err);
    }

    return defaults;
  }

  private saveConfig() {
    try {
      fs.writeFileSync(this.configFile, JSON.stringify(this.config, null, 2), 'utf-8');
    } catch (err) {
      console.error('[ConfigManager] Failed to write config.json:', err);
    }
  }

  public getConfig(): SystemConfig {
    return { ...this.config };
  }

  public updateConfig(updates: Partial<SystemConfig>, actorEmail: string): SystemConfig {
    this.config = { ...this.config, ...updates };
    this.saveConfig();

    ActivityLogger.getInstance().log({
      userId: actorEmail,
      userEmail: actorEmail,
      action: 'CONFIG_UPDATED',
      category: 'SETTINGS',
      details: `Updated system configuration`,
      status: 'SUCCESS',
    });

    return { ...this.config };
  }

  /**
   * Safely returns environment variables status without exposing sensitive secret values.
   */
  public getMaskedEnvironmentStatus() {
    const checkMask = (val: string | undefined): { isSet: boolean; masked?: string } => {
      if (!val || val.trim() === '') return { isSet: false };
      const trimmed = val.trim();
      if (trimmed.length <= 6) return { isSet: true, masked: '******' };
      return {
        isSet: true,
        masked: `${trimmed.slice(0, 3)}••••••${trimmed.slice(-3)}`,
      };
    };

    return {
      NODE_ENV: process.env.NODE_ENV || 'development',
      PORT: process.env.PORT || '3000',
      ACTIVE_STORAGE_PROVIDER: process.env.ACTIVE_STORAGE_PROVIDER || this.config.activeStorageProvider,
      GOOGLE_DRIVE_ROOT_FOLDER_ID: process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || 'root',
      GOOGLE_DRIVE_ROOT_FOLDER_NAME: process.env.GOOGLE_DRIVE_ROOT_FOLDER_NAME || 'AI-HOST',
      
      // Secrets (Masked only)
      GOOGLE_SERVICE_ACCOUNT_EMAIL: checkMask(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL),
      GOOGLE_PRIVATE_KEY: { isSet: Boolean(process.env.GOOGLE_PRIVATE_KEY), masked: process.env.GOOGLE_PRIVATE_KEY ? 'RSA Private Key [PRESENT]' : undefined },
      GOOGLE_SERVICE_ACCOUNT_JSON: { isSet: Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_JSON), masked: process.env.GOOGLE_SERVICE_ACCOUNT_JSON ? 'JSON Credentials [PRESENT]' : undefined },
      GOOGLE_CLIENT_ID: checkMask(process.env.GOOGLE_CLIENT_ID),
      GOOGLE_CLIENT_SECRET: checkMask(process.env.GOOGLE_CLIENT_SECRET),
      GOOGLE_REFRESH_TOKEN: checkMask(process.env.GOOGLE_REFRESH_TOKEN),
      
      ONEDRIVE_CLIENT_ID: checkMask(process.env.ONEDRIVE_CLIENT_ID),
      DROPBOX_APP_KEY: checkMask(process.env.DROPBOX_APP_KEY),
      JWT_SECRET: { isSet: Boolean(process.env.JWT_SECRET), masked: 'HMAC-SHA256 Key Configured' },
      GEMINI_API_KEY: checkMask(process.env.GEMINI_API_KEY),
    };
  }
}
