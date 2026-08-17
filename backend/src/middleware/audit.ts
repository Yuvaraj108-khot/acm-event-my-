import { Request, Response, NextFunction } from 'express';
import { db } from '../config/db.js';

interface AuditOptions {
  action: string;
  resourceType?: string;
  getResourceId?: (req: Request) => string | undefined;
  getMetadata?: (req: Request, res: Response) => Record<string, unknown>;
}

/**
 * Audit logging middleware factory.
 * Logs user actions to the audit_logs table.
 */
export function auditLog(options: AuditOptions) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const originalJson = res.json.bind(res);

    res.json = function (body: unknown) {
      // Only log successful operations (2xx)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        setImmediate(async () => {
          try {
            await db.collection('audit_logs').add({
              userId: req.user?.userId || null,
              action: options.action,
              resourceType: options.resourceType || null,
              resourceId: options.getResourceId?.(req) || null,
              metadata: {
                ...(options.getMetadata?.(req, res) ?? {}),
                method: req.method,
                path: req.path,
              },
              ipAddress: req.ip || req.socket.remoteAddress || null,
              userAgent: req.get('user-agent') || null,
              createdAt: new Date(),
            });
          } catch (err) {
            // Never fail the request due to audit logging errors
            console.error('Audit log error:', err);
          }
        });
      }
      return originalJson(body);
    };

    next();
  };
}
