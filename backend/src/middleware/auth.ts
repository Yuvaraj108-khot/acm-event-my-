import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JwtPayload } from '../auth/jwt.js';
import { db } from '../config/db.js';

// Extend Express Request to include user info
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload & { isActive: boolean };
    }
  }
}

/**
 * Middleware: Requires a valid Bearer JWT token.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: 'Authorization header missing or malformed' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    // Verify user still exists and is active
    const userDoc = await db.collection('users').doc(decoded.userId).get();

    if (!userDoc.exists) {
      res.status(401).json({ success: false, message: 'User no longer exists' });
      return;
    }

    const user = userDoc.data()!;

    if (!user.isActive) {
      res.status(403).json({ success: false, message: 'Account has been deactivated' });
      return;
    }

    req.user = { ...decoded, isActive: user.isActive, role: user.role };
    next();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication failed';
    res.status(401).json({ success: false, message });
  }
}

/**
 * Middleware: Requires admin, moderator, or super_admin role.
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  await requireAuth(req, res, () => {
    const adminRoles = ['admin', 'moderator', 'super_admin'];
    if (!req.user || !adminRoles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: 'Admin access required' });
      return;
    }
    next();
  });
}

/**
 * Middleware: Requires super_admin role.
 */
export async function requireSuperAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  await requireAuth(req, res, () => {
    if (!req.user || req.user.role !== 'super_admin') {
      res.status(403).json({ success: false, message: 'Super admin access required' });
      return;
    }
    next();
  });
}

/**
 * Factory: Creates a role-checking middleware for specific roles.
 */
export function requireRole(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await requireAuth(req, res, () => {
      if (!req.user || !roles.includes(req.user.role)) {
        res.status(403).json({
          success: false,
          message: `Access denied. Required role: ${roles.join(' or ')}`,
        });
        return;
      }
      next();
    });
  };
}

/**
 * Middleware: Optionally attach user info without failing if no token.
 */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = verifyAccessToken(token);
      req.user = { ...decoded, isActive: true };
    }
  } catch {
    // Silently ignore — user stays unauthenticated
  }
  next();
}
