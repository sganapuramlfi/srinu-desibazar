import { Request, Response, NextFunction } from 'express';
import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { db } from '../../db/index.js';
import { adminUsers, adminAuditLogs } from '../../db/index.js';
import { eq } from 'drizzle-orm';

const scryptAsync = promisify(scrypt);

// Extend session type to include admin info
declare module 'express-session' {
  interface SessionData {
    adminId?: number;
    adminUsername?: string;
    isSuperAdmin?: boolean;
  }
}

/**
 * Hash password using scrypt
 */
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString('hex')}.${salt}`;
}

/**
 * Verify password against hash
 */
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const [hashedPassword, salt] = hash.split('.');
  const hashedPasswordBuf = Buffer.from(hashedPassword, 'hex');
  const suppliedPasswordBuf = (await scryptAsync(password, salt, 64)) as Buffer;
  return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
}

/**
 * Log admin action to audit log
 */
async function logAdminAction(params: {
  adminId: number;
  adminUsername: string;
  action: string;
  resourceType?: string;
  resourceId?: number;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  success?: boolean;
  errorMessage?: string;
}) {
  try {
    await db.insert(adminAuditLogs).values({
      adminId: params.adminId,
      adminUsername: params.adminUsername,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      details: params.details || {},
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      success: params.success !== false,
      errorMessage: params.errorMessage,
    });
  } catch (error) {
    console.error('Failed to log admin action:', error);
  }
}

/**
 * Middleware to require admin authentication
 */
export const adminAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.session.adminId) {
    return next();
  }

  return res.status(401).json({
    error: 'Admin authentication required',
    message: 'Please login with admin credentials'
  });
};

/**
 * Middleware to require super admin
 */
export const superAdminMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.session.adminId && req.session.isSuperAdmin) {
    return next();
  }

  return res.status(403).json({
    error: 'Super admin access required',
    message: 'This action requires super admin privileges'
  });
};

/**
 * Admin login handler
 */
export const adminLoginHandler = async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      error: 'Missing credentials',
      message: 'Username and password are required'
    });
  }

  try {
    // Find admin user
    const [admin] = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.username, username))
      .limit(1);

    if (!admin) {
      // Don't reveal if username exists
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Username or password is incorrect'
      });
    }

    // Check if account is active
    if (!admin.isActive) {
      await logAdminAction({
        adminId: admin.id,
        adminUsername: admin.username,
        action: 'login_attempt_inactive',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        success: false,
        errorMessage: 'Account is inactive'
      });

      return res.status(403).json({
        error: 'Account inactive',
        message: 'Your admin account has been deactivated'
      });
    }

    // Verify password
    const passwordValid = await verifyPassword(password, admin.passwordHash);

    if (!passwordValid) {
      await logAdminAction({
        adminId: admin.id,
        adminUsername: admin.username,
        action: 'login_failed',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        success: false,
        errorMessage: 'Invalid password'
      });

      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Username or password is incorrect'
      });
    }

    // Update last login
    await db
      .update(adminUsers)
      .set({
        lastLogin: new Date(),
        loginCount: admin.loginCount + 1,
      })
      .where(eq(adminUsers.id, admin.id));

    // Set session
    req.session.adminId = admin.id;
    req.session.adminUsername = admin.username;
    req.session.isSuperAdmin = admin.isSuperAdmin;

    // Log successful login
    await logAdminAction({
      adminId: admin.id,
      adminUsername: admin.username,
      action: 'login_success',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      success: true
    });

    res.json({
      success: true,
      message: 'Admin login successful',
      user: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        isSuperAdmin: admin.isSuperAdmin
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: 'An error occurred during login'
    });
  }
};

/**
 * Admin logout handler
 */
export const adminLogoutHandler = async (req: Request, res: Response) => {
  const adminId = req.session.adminId;
  const adminUsername = req.session.adminUsername;

  if (adminId && adminUsername) {
    await logAdminAction({
      adminId,
      adminUsername,
      action: 'logout',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      success: true
    });
  }

  req.session.adminId = undefined;
  req.session.adminUsername = undefined;
  req.session.isSuperAdmin = undefined;

  res.json({
    success: true,
    message: 'Admin logout successful'
  });
};

/**
 * Admin status handler
 */
export const adminStatusHandler = async (req: Request, res: Response) => {
  if (req.session.adminId) {
    try {
      const [admin] = await db
        .select({
          id: adminUsers.id,
          username: adminUsers.username,
          email: adminUsers.email,
          role: adminUsers.role,
          isSuperAdmin: adminUsers.isSuperAdmin,
        })
        .from(adminUsers)
        .where(eq(adminUsers.id, req.session.adminId))
        .limit(1);

      if (admin) {
        return res.json({
          authenticated: true,
          user: admin
        });
      }
    } catch (error) {
      console.error('Error fetching admin status:', error);
    }
  }

  res.json({
    authenticated: false
  });
};

/**
 * Create initial admin user (for setup only)
 * This should be called once during initial deployment
 */
export async function createInitialAdmin(username: string, password: string, email: string) {
  try {
    // Check if admin already exists
    const [existing] = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.username, username))
      .limit(1);

    if (existing) {
      console.log('Admin user already exists');
      return;
    }

    const passwordHash = await hashPassword(password);

    await db.insert(adminUsers).values({
      username,
      email,
      passwordHash,
      role: 'super_admin',
      isSuperAdmin: true,
      isActive: true,
    });

    console.log(`✅ Initial admin user created: ${username}`);
  } catch (error) {
    console.error('Failed to create initial admin:', error);
    throw error;
  }
}

// Export helper functions for use in other parts of the application
export { hashPassword, verifyPassword, logAdminAction };
