import { getFirestore } from 'firebase-admin/firestore';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { env } from './env.js';
import fs from 'fs';
import path from 'path';

if (getApps().length === 0) {
  const serviceAccountPath = path.resolve(process.cwd(), 'firebase-service-account.json');
  if (fs.existsSync(serviceAccountPath)) {
    initializeApp({
      credential: cert(serviceAccountPath),
    });
  } else {
    initializeApp({
      projectId: env.FIREBASE_PROJECT_ID,
    });
  }
}

export const db = getFirestore();
export type DB = typeof db;

export async function checkDatabaseConnection(): Promise<void> {
  await db.listCollections();
  console.log('✅ Firestore database connection established');
}
