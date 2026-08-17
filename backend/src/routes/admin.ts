import { Router } from 'express';
import * as adminController from '../controllers/adminController.js';
import { requireAdmin, requireSuperAdmin } from '../middleware/auth.js';

export const adminRouter = Router();

adminRouter.get('/stats', requireAdmin, adminController.getDashboardStats);
adminRouter.get('/audit-logs', requireAdmin, adminController.getAuditLogs);
adminRouter.get('/admins', requireSuperAdmin, adminController.listAdmins);
adminRouter.patch('/admins/:id/role', requireSuperAdmin, adminController.updateAdminRole);
