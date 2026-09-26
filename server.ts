import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { AuthManager, requireAuth, requireAdmin } from './server/auth.js';
import { StorageManager } from './server/storage/manager.js';
import { ModelManager } from './server/models.js';
import { APKManager } from './server/apk.js';
import { ActivityLogger } from './server/activity.js';
import { ConfigManager } from './server/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT) || 3000;
const host = '0.0.0.0';

// Middlewares
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Memory storage for file uploads before forwarding to active storage provider
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB limit
});

const authManager = AuthManager.getInstance();
const storageManager = StorageManager.getInstance();
const modelManager = ModelManager.getInstance();
const apkManager = APKManager.getInstance();
const activityLogger = ActivityLogger.getInstance();
const configManager = ConfigManager.getInstance();

// Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// ==========================================
// 1. Authentication Endpoints
// ==========================================
app.post('/api/auth/login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const ip = req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress || '127.0.0.1';
    const result = authManager.login(email, password, ip);
    return res.json(result);
  } catch (err: any) {
    return res.status(401).json({ error: err.message || 'Login failed.' });
  }
});

app.post('/api/auth/logout', requireAuth, (req: Request, res: Response) => {
  const session = (req as any).user;
  authManager.logout(session.token, session.userId, session.email);
  return res.json({ success: true, message: 'Logged out successfully.' });
});

app.get('/api/auth/me', requireAuth, (req: Request, res: Response) => {
  const session = (req as any).user;
  const user = authManager.getUserById(session.userId);
  if (!user) {
    return res.status(404).json({ error: 'User record not found.' });
  }
  return res.json({ user });
});

// ==========================================
// 2. Storage & File Endpoints
// ==========================================
app.get('/api/files', requireAuth, async (req: Request, res: Response) => {
  try {
    const { folderId, search, sortBy, sortOrder, pageToken, pageSize } = req.query;
    const result = await storageManager.listFiles({
      folderId: folderId ? String(folderId) : undefined,
      search: search ? String(search) : undefined,
      sortBy: sortBy as any,
      sortOrder: sortOrder as any,
      pageToken: pageToken ? String(pageToken) : undefined,
      pageSize: pageSize ? Number(pageSize) : 50,
    });
    return res.json(result);
  } catch (err: any) {
    console.error('[API] /api/files error:', err);
    return res.status(500).json({ error: err.message || 'Failed to list files.' });
  }
});

app.post('/api/files/upload', requireAuth, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const folderId = req.body.folderId || 'root';
    const visibility = req.body.visibility || 'PRIVATE';
    const session = (req as any).user;

    const item = await storageManager.uploadFile(
      {
        filename: req.file.originalname,
        buffer: req.file.buffer,
        mimeType: req.file.mimetype,
        size: req.file.size,
      },
      folderId,
      visibility
    );

    activityLogger.log({
      userId: session.userId,
      userEmail: session.email,
      action: 'FILE_UPLOAD',
      category: 'STORAGE',
      details: `Uploaded file '${item.name}' (${(item.sizeBytes / 1024 / 1024).toFixed(2)} MB) to folder '${folderId}' on provider ${item.storageProvider}`,
      status: 'SUCCESS',
      ipAddress: req.ip,
    });

    return res.status(201).json(item);
  } catch (err: any) {
    console.error('[API] /api/files/upload error:', err);
    return res.status(500).json({ error: err.message || 'File upload failed.' });
  }
});

app.get('/api/files/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const item = await storageManager.getFile(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'File not found.' });
    }
    return res.json(item);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch file details.' });
  }
});

// Download endpoint: supports direct session or access token query for public/authorized links
app.get('/api/files/:id/download', async (req: Request, res: Response) => {
  try {
    const fileId = req.params.id;
    const session = authManager.authenticateRequest(req);

    // If no session, check if file is marked PUBLIC or has valid access token
    const fileMeta = await storageManager.getFile(fileId);
    if (!fileMeta) {
      return res.status(404).json({ error: 'File not found.' });
    }

    if (fileMeta.visibility !== 'PUBLIC' && !session) {
      return res.status(401).json({ error: 'Authentication required to download this file.' });
    }

    const downloaded = await storageManager.downloadFile(fileId);

    res.setHeader('Content-Type', downloaded.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(downloaded.filename)}"`);
    if (downloaded.size) {
      res.setHeader('Content-Length', downloaded.size.toString());
    }

    if (session) {
      activityLogger.log({
        userId: session.userId,
        userEmail: session.email,
        action: 'FILE_DOWNLOAD',
        category: 'STORAGE',
        details: `Downloaded file '${downloaded.filename}'`,
        status: 'SUCCESS',
        ipAddress: req.ip,
      });
    }

    if (downloaded.stream) {
      return downloaded.stream.pipe(res);
    } else if (downloaded.buffer) {
      return res.end(downloaded.buffer);
    }

    return res.status(500).json({ error: 'Could not stream file payload.' });
  } catch (err: any) {
    console.error('[API] /api/files/:id/download error:', err);
    return res.status(500).json({ error: err.message || 'File download failed.' });
  }
});

app.delete('/api/files/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const session = (req as any).user;
    const fileId = req.params.id;
    const meta = await storageManager.getFile(fileId);
    const fileName = meta?.name || fileId;

    const result = await storageManager.deleteFile(fileId);

    activityLogger.log({
      userId: session.userId,
      userEmail: session.email,
      action: 'FILE_DELETE',
      category: 'STORAGE',
      details: `Deleted file '${fileName}' (ID: ${fileId})`,
      status: 'SUCCESS',
      ipAddress: req.ip,
    });

    return res.json(result);
  } catch (err: any) {
    console.error('[API] /api/files/:id delete error:', err);
    return res.status(500).json({ error: err.message || 'Failed to delete file.' });
  }
});

app.patch('/api/files/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'New file name is required.' });
    }
    const updated = await storageManager.renameFile(req.params.id, name.trim());
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Rename failed.' });
  }
});

app.post('/api/folders', requireAuth, async (req: Request, res: Response) => {
  try {
    const { name, parentFolderId } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Folder name is required.' });
    }
    const session = (req as any).user;
    const folder = await storageManager.createFolder(name.trim(), parentFolderId || 'root');

    activityLogger.log({
      userId: session.userId,
      userEmail: session.email,
      action: 'FOLDER_CREATE',
      category: 'STORAGE',
      details: `Created folder '${folder.name}' in '${parentFolderId || 'root'}'`,
      status: 'SUCCESS',
      ipAddress: req.ip,
    });

    return res.status(201).json(folder);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to create folder.' });
  }
});

// ==========================================
// 3. Storage Provider & Quota Endpoints
// ==========================================
app.get('/api/storage', requireAuth, async (req: Request, res: Response) => {
  try {
    const quota = await storageManager.getStorageInfo();
    const providers = storageManager.getAllProvidersList();
    const activeProvider = storageManager.getActiveProvider();
    const connection = await activeProvider.testConnection();

    return res.json({
      quota,
      providers,
      activeProvider: {
        id: activeProvider.id,
        name: activeProvider.name,
        description: activeProvider.description,
        isConfigured: activeProvider.isConfigured(),
        connection,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to retrieve storage status.' });
  }
});

app.get('/api/storage/providers', requireAuth, (req: Request, res: Response) => {
  const providers = storageManager.getAllProvidersList();
  return res.json({ providers });
});

app.post('/api/storage/switch-provider', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { providerId } = req.body;
    if (!providerId) {
      return res.status(400).json({ error: 'providerId is required.' });
    }
    const session = (req as any).user;
    storageManager.setActiveProvider(providerId);
    configManager.updateConfig({ activeStorageProvider: providerId }, session.email);

    activityLogger.log({
      userId: session.userId,
      userEmail: session.email,
      action: 'STORAGE_PROVIDER_CHANGED',
      category: 'SETTINGS',
      details: `Switched active storage provider to '${providerId}'`,
      status: 'SUCCESS',
    });

    const active = storageManager.getActiveProvider();
    const connection = await active.testConnection();

    return res.json({
      success: true,
      activeProvider: {
        id: active.id,
        name: active.name,
        isConfigured: active.isConfigured(),
        connection,
      },
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to switch provider.' });
  }
});

app.post('/api/storage/test-connection', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { providerId } = req.body;
    const provider = providerId ? storageManager.getProvider(providerId) : storageManager.getActiveProvider();
    if (!provider) {
      return res.status(404).json({ error: 'Provider not found.' });
    }
    const result = await provider.testConnection();
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Connection test failed.' });
  }
});

app.post('/api/storage/configure-googledrive', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { serviceAccountEmail, privateKey, clientId, clientSecret, refreshToken, rootFolderId, rootFolderName } = req.body;
    const session = (req as any).user;

    storageManager.updateGoogleDriveConfig({
      serviceAccountEmail,
      privateKey,
      clientId,
      clientSecret,
      refreshToken,
      rootFolderId,
      rootFolderName,
    });

    const gd = storageManager.getGoogleDriveProvider();
    const testResult = await gd.testConnection();

    activityLogger.log({
      userId: session.userId,
      userEmail: session.email,
      action: 'GOOGLE_DRIVE_CONFIGURED',
      category: 'SETTINGS',
      details: `Updated Google Drive credentials. Connection status: ${testResult.connected ? 'HEALTHY' : 'FAILED'}`,
      status: testResult.connected ? 'SUCCESS' : 'WARNING',
    });

    return res.json({
      success: true,
      connection: testResult,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to update Google Drive configuration.' });
  }
});

// ==========================================
// 4. AI Model Management & Android Endpoints
// ==========================================
// Public/Authenticated list for dashboard and Android app
app.get('/api/models', (req: Request, res: Response) => {
  try {
    const models = modelManager.getModels();
    return res.json({ models, count: models.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to list models.' });
  }
});

app.get('/api/models/:id', (req: Request, res: Response) => {
  const model = modelManager.getModelById(req.params.id);
  if (!model) return res.status(404).json({ error: 'Model not found.' });
  return res.json(model);
});

app.post('/api/models', requireAuth, requireAdmin, (req: Request, res: Response) => {
  try {
    const session = (req as any).user;
    const newModel = modelManager.createModel(req.body, session.email);
    return res.status(201).json(newModel);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to register model.' });
  }
});

app.patch('/api/models/:id', requireAuth, requireAdmin, (req: Request, res: Response) => {
  try {
    const session = (req as any).user;
    const updated = modelManager.updateModel(req.params.id, req.body, session.email);
    return res.json(updated);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to update model.' });
  }
});

app.delete('/api/models/:id', requireAuth, requireAdmin, (req: Request, res: Response) => {
  try {
    const session = (req as any).user;
    modelManager.deleteModel(req.params.id, session.email);
    return res.json({ success: true, message: 'Model deleted successfully.' });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to delete model.' });
  }
});

// Model download proxy endpoint for Android
app.get('/api/models/:id/download', async (req: Request, res: Response) => {
  try {
    const model = modelManager.getModelById(req.params.id);
    if (!model) return res.status(404).json({ error: 'Model not found.' });

    // If model is linked to a storage file, stream through storage provider
    if (model.storageFileId) {
      const fileData = await storageManager.downloadFile(model.storageFileId);
      res.setHeader('Content-Type', fileData.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileData.filename)}"`);
      if (fileData.stream) return fileData.stream.pipe(res);
      if (fileData.buffer) return res.end(fileData.buffer);
    }

    // Otherwise return download descriptor or direct stream
    return res.json({
      modelId: model.id,
      name: model.name,
      format: model.format,
      sha256: model.sha256,
      sizeBytes: model.sizeBytes,
      message: 'Model asset download ready.',
      storageProvider: model.storageProvider,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Model download failed.' });
  }
});

// Android App Universal Manifest (Requirement 23)
app.get('/api/android/manifest', (req: Request, res: Response) => {
  try {
    const modelsManifest = modelManager.getAndroidManifest();
    const latestApk = apkManager.getLatestRelease();
    return res.json({
      manifestVersion: '1.0',
      timestamp: new Date().toISOString(),
      models: modelsManifest.models,
      apk: latestApk,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 5. APK Release Management Endpoints
// ==========================================
app.get('/api/apk', (req: Request, res: Response) => {
  const releases = apkManager.getReleases();
  return res.json({ releases, count: releases.length });
});

app.get('/api/apk/latest', (req: Request, res: Response) => {
  const latest = apkManager.getLatestRelease();
  if (!latest) return res.status(404).json({ error: 'No APK releases published yet.' });
  return res.json(latest);
});

app.post('/api/apk', requireAuth, requireAdmin, (req: Request, res: Response) => {
  try {
    const session = (req as any).user;
    const created = apkManager.createRelease(req.body, session.email);
    return res.status(201).json(created);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to publish APK release.' });
  }
});

app.patch('/api/apk/:id', requireAuth, requireAdmin, (req: Request, res: Response) => {
  try {
    const session = (req as any).user;
    const updated = apkManager.updateRelease(req.params.id, req.body, session.email);
    return res.json(updated);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to update APK release.' });
  }
});

app.delete('/api/apk/:id', requireAuth, requireAdmin, (req: Request, res: Response) => {
  try {
    const session = (req as any).user;
    apkManager.deleteRelease(req.params.id, session.email);
    return res.json({ success: true, message: 'APK release deleted.' });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to delete APK release.' });
  }
});

// ==========================================
// 6. User & Role Management (ADMIN only)
// ==========================================
app.get('/api/users', requireAuth, requireAdmin, (req: Request, res: Response) => {
  const users = authManager.getUsers();
  return res.json({ users, count: users.length });
});

app.post('/api/users', requireAuth, requireAdmin, (req: Request, res: Response) => {
  try {
    const session = (req as any).user;
    const { email, name, password, role } = req.body;
    if (!email || !name || !password || !role) {
      return res.status(400).json({ error: 'All fields (email, name, password, role) are required.' });
    }
    const created = authManager.createUser({ email, name, password, role }, session.email);
    return res.status(201).json(created);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'User creation failed.' });
  }
});

app.patch('/api/users/:id', requireAuth, requireAdmin, (req: Request, res: Response) => {
  try {
    const session = (req as any).user;
    const updated = authManager.updateUser(req.params.id, req.body, session.email);
    return res.json(updated);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to update user.' });
  }
});

app.delete('/api/users/:id', requireAuth, requireAdmin, (req: Request, res: Response) => {
  try {
    const session = (req as any).user;
    authManager.deleteUser(req.params.id, session.email);
    return res.json({ success: true, message: 'User deleted successfully.' });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to delete user.' });
  }
});

// ==========================================
// 7. Activity Logs Endpoints (ADMIN only)
// ==========================================
app.get('/api/activity', requireAuth, requireAdmin, (req: Request, res: Response) => {
  const { category, search, limit, offset } = req.query;
  const result = activityLogger.getLogs({
    category: category ? String(category) : undefined,
    search: search ? String(search) : undefined,
    limit: limit ? Number(limit) : 50,
    offset: offset ? Number(offset) : 0,
  });
  return res.json(result);
});

app.get('/api/activity/export', requireAuth, requireAdmin, (req: Request, res: Response) => {
  const format = req.query.format === 'json' ? 'json' : 'csv';
  if (format === 'json') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="nexus-activity-logs.json"');
    return res.send(activityLogger.exportJson());
  } else {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="nexus-activity-logs.csv"');
    return res.send(activityLogger.exportCsv());
  }
});

// ==========================================
// 8. Configuration & System Health Endpoints
// ==========================================
app.get('/api/config', requireAuth, (req: Request, res: Response) => {
  const config = configManager.getConfig();
  return res.json({ config });
});

app.patch('/api/config', requireAuth, requireAdmin, (req: Request, res: Response) => {
  try {
    const session = (req as any).user;
    const updated = configManager.updateConfig(req.body, session.email);
    return res.json({ config: updated });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to update config.' });
  }
});

app.get('/api/config/environment', requireAuth, requireAdmin, (req: Request, res: Response) => {
  const envStatus = configManager.getMaskedEnvironmentStatus();
  return res.json({ environment: envStatus });
});

app.get('/api/system/health', async (req: Request, res: Response) => {
  const mem = process.memoryUsage();
  const uptimeSeconds = Math.floor(process.uptime());
  const activeProvider = storageManager.getActiveProvider();
  let storageHealth = 'UNKNOWN';

  try {
    const test = await activeProvider.testConnection();
    storageHealth = test.connected ? 'HEALTHY' : 'DISCONNECTED';
  } catch {
    storageHealth = 'ERROR';
  }

  return res.json({
    status: 'ONLINE',
    uptime: `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m ${uptimeSeconds % 60}s`,
    uptimeSeconds,
    nodeVersion: process.version,
    platform: process.platform,
    memory: {
      rssMB: (mem.rss / 1024 / 1024).toFixed(1),
      heapUsedMB: (mem.heapUsed / 1024 / 1024).toFixed(1),
      heapTotalMB: (mem.heapTotal / 1024 / 1024).toFixed(1),
    },
    storageProvider: activeProvider.id,
    storageHealth,
    authProvider: 'Local RBAC JWT/PBKDF2',
    timestamp: new Date().toISOString(),
  });
});

// ==========================================
// 9. Vite Dev Middleware & Static File Serving
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  } else {
    // Production: serve static build
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(port, host, () => {
    console.log(`[NexusControl] Server running at http://${host}:${port}`);
    console.log(`[NexusControl] Active Storage Provider: ${storageManager.getActiveProviderId()}`);
  });
}

startServer().catch(err => {
  console.error('[NexusControl] Server failed to start:', err);
  process.exit(1);
});
