import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { User, UserWithPassword, AuthSession, UserRole } from './types.js';
import { ActivityLogger } from './activity.js';

export class AuthManager {
  private static instance: AuthManager;
  private usersFile: string;
  private users: Map<string, UserWithPassword> = new Map();
  private sessions: Map<string, AuthSession> = new Map();
  private jwtSecret: string;

  private constructor() {
    this.jwtSecret = process.env.JWT_SECRET || process.env.AUTH_SECRET || crypto.randomBytes(32).toString('hex');
    const dataDir = process.env.STORAGE_LOCAL_DIR ? path.dirname(process.env.STORAGE_LOCAL_DIR) : path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch {}
    }
    this.usersFile = path.join(dataDir, 'users.json');
    this.initUsers();
  }

  public static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  private hashPassword(password: string, salt: string): string {
    return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  }

  private initUsers() {
    try {
      if (fs.existsSync(this.usersFile)) {
        const raw = fs.readFileSync(this.usersFile, 'utf-8');
        const list: UserWithPassword[] = JSON.parse(raw);
        for (const u of list) {
          this.users.set(u.id, u);
        }
      } else {
        this.seedInitialUsers();
      }
    } catch (err) {
      console.error('[AuthManager] Error loading users:', err);
      this.seedInitialUsers();
    }
  }

  private seedInitialUsers() {
    const adminSalt = crypto.randomBytes(16).toString('hex');
    const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@Nexus2026!';
    const adminHash = this.hashPassword(adminPassword, adminSalt);

    const userSalt = crypto.randomBytes(16).toString('hex');
    const userPassword = process.env.DEFAULT_USER_PASSWORD || 'NexusMember#2026';
    const userHash = this.hashPassword(userPassword, userSalt);

    const now = new Date().toISOString();

    const adminUser: UserWithPassword = {
      id: 'usr_admin_001',
      email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@nexus.internal',
      name: 'System Administrator',
      role: 'ADMIN',
      isActive: true,
      createdAt: now,
      passwordHash: adminHash,
      salt: adminSalt,
    };

    const regularUser: UserWithPassword = {
      id: 'usr_member_002',
      email: 'engineer@nexus.internal',
      name: 'Team Engineer',
      role: 'USER',
      isActive: true,
      createdAt: now,
      passwordHash: userHash,
      salt: userSalt,
    };

    this.users.set(adminUser.id, adminUser);
    this.users.set(regularUser.id, regularUser);
    this.saveUsers();
  }

  private saveUsers() {
    try {
      const list = Array.from(this.users.values());
      fs.writeFileSync(this.usersFile, JSON.stringify(list, null, 2), 'utf-8');
    } catch (err) {
      console.error('[AuthManager] Failed to save users:', err);
    }
  }

  private generateToken(payload: { userId: string; email: string; role: UserRole; name: string }): string {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    const claims = Buffer.from(JSON.stringify({ ...payload, exp: expiresAt })).toString('base64url');
    const signature = crypto.createHmac('sha256', this.jwtSecret).update(`${header}.${claims}`).digest('base64url');
    return `${header}.${claims}.${signature}`;
  }

  private verifyToken(token: string): AuthSession | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const [header, claims, sig] = parts;
      const expectedSig = crypto.createHmac('sha256', this.jwtSecret).update(`${header}.${claims}`).digest('base64url');
      if (sig !== expectedSig) return null;

      const payload = JSON.parse(Buffer.from(claims, 'base64url').toString('utf-8'));
      if (payload.exp && Date.now() > payload.exp) {
        return null;
      }

      return {
        token,
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
        name: payload.name,
        expiresAt: payload.exp,
      };
    } catch {
      return null;
    }
  }

  public sanitizeUser(u: UserWithPassword): User {
    const { passwordHash, salt, ...rest } = u;
    return rest;
  }

  public login(email: string, password: string, ipAddress?: string): { user: User; token: string } {
    const lowerEmail = email.toLowerCase().trim();
    const user = Array.from(this.users.values()).find(u => u.email.toLowerCase() === lowerEmail);

    if (!user) {
      ActivityLogger.getInstance().log({
        userId: 'anonymous',
        userEmail: email,
        action: 'AUTH_FAILED',
        category: 'AUTH',
        details: 'Failed login attempt: User not found',
        status: 'FAILURE',
        ipAddress,
      });
      throw new Error('Invalid email or password.');
    }

    if (!user.isActive) {
      ActivityLogger.getInstance().log({
        userId: user.id,
        userEmail: user.email,
        action: 'AUTH_BLOCKED',
        category: 'AUTH',
        details: 'Login rejected: Account is deactivated',
        status: 'FAILURE',
        ipAddress,
      });
      throw new Error('This account has been deactivated. Please contact an administrator.');
    }

    const calculatedHash = this.hashPassword(password, user.salt);
    if (calculatedHash !== user.passwordHash) {
      ActivityLogger.getInstance().log({
        userId: user.id,
        userEmail: user.email,
        action: 'AUTH_FAILED',
        category: 'AUTH',
        details: 'Failed login attempt: Password incorrect',
        status: 'FAILURE',
        ipAddress,
      });
      throw new Error('Invalid email or password.');
    }

    user.lastLoginAt = new Date().toISOString();
    this.saveUsers();

    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    const session: AuthSession = {
      token,
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    };
    this.sessions.set(token, session);

    ActivityLogger.getInstance().log({
      userId: user.id,
      userEmail: user.email,
      action: 'AUTH_LOGIN',
      category: 'AUTH',
      details: `Successful login as ${user.role}`,
      status: 'SUCCESS',
      ipAddress,
    });

    return {
      user: this.sanitizeUser(user),
      token,
    };
  }

  public logout(token: string, userId?: string, email?: string) {
    this.sessions.delete(token);
    if (userId) {
      ActivityLogger.getInstance().log({
        userId,
        userEmail: email || 'unknown',
        action: 'AUTH_LOGOUT',
        category: 'AUTH',
        details: 'User logged out',
        status: 'SUCCESS',
      });
    }
  }

  public authenticateRequest(req: Request): AuthSession | null {
    const authHeader = req.headers.authorization;
    let token = '';

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.query?.access_token) {
      token = String(req.query.access_token);
    }

    if (!token) return null;
    return this.verifyToken(token);
  }

  public getUsers(): User[] {
    return Array.from(this.users.values()).map(u => this.sanitizeUser(u));
  }

  public getUserById(id: string): User | null {
    const u = this.users.get(id);
    return u ? this.sanitizeUser(u) : null;
  }

  public createUser(data: { email: string; name: string; password: string; role: UserRole }, actorEmail: string): User {
    const lowerEmail = data.email.toLowerCase().trim();
    const exists = Array.from(this.users.values()).some(u => u.email.toLowerCase() === lowerEmail);
    if (exists) {
      throw new Error(`A user with email ${data.email} already exists.`);
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = this.hashPassword(data.password, salt);
    const id = `usr_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

    const newUser: UserWithPassword = {
      id,
      email: lowerEmail,
      name: data.name.trim(),
      role: data.role,
      isActive: true,
      createdAt: new Date().toISOString(),
      passwordHash,
      salt,
    };

    this.users.set(id, newUser);
    this.saveUsers();

    ActivityLogger.getInstance().log({
      userId: id,
      userEmail: actorEmail,
      action: 'USER_CREATED',
      category: 'USERS',
      details: `Created new user ${newUser.email} with role ${newUser.role}`,
      status: 'SUCCESS',
    });

    return this.sanitizeUser(newUser);
  }

  public updateUser(id: string, updates: Partial<{ name: string; role: UserRole; isActive: boolean; password: string }>, actorEmail: string): User {
    const user = this.users.get(id);
    if (!user) throw new Error('User not found.');

    if (updates.name !== undefined) user.name = updates.name.trim();
    if (updates.role !== undefined) user.role = updates.role;
    if (updates.isActive !== undefined) user.isActive = updates.isActive;

    if (updates.password) {
      user.salt = crypto.randomBytes(16).toString('hex');
      user.passwordHash = this.hashPassword(updates.password, user.salt);
    }

    this.users.set(id, user);
    this.saveUsers();

    ActivityLogger.getInstance().log({
      userId: id,
      userEmail: actorEmail,
      action: 'USER_UPDATED',
      category: 'USERS',
      details: `Updated user profile for ${user.email}`,
      status: 'SUCCESS',
    });

    return this.sanitizeUser(user);
  }

  public deleteUser(id: string, actorEmail: string): boolean {
    const user = this.users.get(id);
    if (!user) throw new Error('User not found.');

    // Protect against deleting last admin
    if (user.role === 'ADMIN') {
      const adminCount = Array.from(this.users.values()).filter(u => u.role === 'ADMIN').length;
      if (adminCount <= 1) {
        throw new Error('Cannot delete the last remaining administrator.');
      }
    }

    this.users.delete(id);
    this.saveUsers();

    ActivityLogger.getInstance().log({
      userId: id,
      userEmail: actorEmail,
      action: 'USER_DELETED',
      category: 'USERS',
      details: `Deleted user ${user.email}`,
      status: 'SUCCESS',
    });

    return true;
  }
}

// Express Middlewares
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const session = AuthManager.getInstance().authenticateRequest(req);
  if (!session) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }
  (req as any).user = session;
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const session = (req as any).user as AuthSession | undefined;
  if (!session || session.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Access denied. Administrator role required for this action.' });
  }
  next();
}
