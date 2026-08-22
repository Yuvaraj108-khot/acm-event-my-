import { Request, Response } from 'express';
import { db } from '../config/db.js';
import { success } from '../utils/helpers.js';

export async function getDashboardStats(_req: Request, res: Response) {
  const [
    usersSnap,
    compsSnap,
    roundsSnap,
    regsSnap,
  ] = await Promise.all([
    db.collection('users').where('role', '==', 'participant').get(),
    db.collection('competitions').get(),
    db.collection('rounds').get(),
    db.collection('competition_registrations').get(),
  ]);

  res.json(success({
    totalParticipants: usersSnap.size,
    totalCompetitions: compsSnap.size,
    totalRounds: roundsSnap.size,
    totalRegistrations: regsSnap.size,
  }));
}

export async function getAuditLogs(req: Request, res: Response) {
  const { page = '1', limit = '50' } = req.query as Record<string, string>;
  const offset = (Number(page) - 1) * Number(limit);

  const snap = await db.collection('audit_logs').get();
  const logs = snap.docs.map((doc: any) => doc.data());

  // Sort by createdAt descending
  logs.sort((a: any, b: any) => {
    const aTime = a.createdAt ? (a.createdAt.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime()) : 0;
    const bTime = b.createdAt ? (b.createdAt.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime()) : 0;
    return bTime - aTime;
  });

  const paginatedLogs = logs.slice(offset, offset + Number(limit));

  const result = await Promise.all(paginatedLogs.map(async (log: any) => {
    let email = null;
    if (log.userId) {
      const userDoc = await db.collection('users').doc(log.userId).get();
      if (userDoc.exists) {
        email = userDoc.data()!.email;
      }
    }
    return {
      id: log.id || null,
      action: log.action,
      resourceType: log.resourceType || null,
      resourceId: log.resourceId || null,
      metadata: log.metadata || {},
      ipAddress: log.ipAddress || null,
      createdAt: log.createdAt,
      userEmail: email,
    };
  }));

  res.json(success(result));
}

export async function listAdmins(_req: Request, res: Response) {
  const snap = await db.collection('users')
    .where('role', '==', 'admin')
    .get();

  const admins = snap.docs.map((doc: any) => {
    const data = doc.data();
    return {
      id: data.id,
      email: data.email,
      role: data.role,
      isActive: data.isActive,
      lastLoginAt: data.lastLoginAt || null,
      createdAt: data.createdAt,
    };
  });

  res.json(success(admins));
}

export async function updateAdminRole(req: Request, res: Response) {
  const { id } = req.params;
  const { role } = req.body;

  const allowedRoles = ['admin', 'moderator'];
  if (!allowedRoles.includes(role)) {
    res.status(400).json({ success: false, message: 'Invalid role' });
    return;
  }

  const docRef = db.collection('users').doc(id);
  const doc = await docRef.get();
  if (!doc.exists) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }

  await docRef.update({ role, updatedAt: new Date() });
  const updatedDoc = await docRef.get();
  res.json(success(updatedDoc.data(), 'Admin role updated'));
}

export async function createAdmin(req: Request, res: Response) {
  const { email, role } = req.body;

  const allowedRoles = ['admin', 'moderator'];
  if (!allowedRoles.includes(role)) {
    res.status(400).json({ success: false, message: 'Invalid role' });
    return;
  }

  if (!email) {
    res.status(400).json({ success: false, message: 'Email is required' });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Check if user already exists
  const usersSnap = await db.collection('users')
    .where('email', '==', normalizedEmail)
    .limit(1)
    .get();

  if (!usersSnap.empty) {
    res.status(400).json({ success: false, message: 'User with this email already exists' });
    return;
  }

  const userRef = db.collection('users').doc();
  const userId = userRef.id;

  const userData = {
    id: userId,
    email: normalizedEmail,
    role,
    isActive: true,
    profileCompleted: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await userRef.set(userData);

  res.status(201).json(success(userData, 'New administrator added successfully'));
}
