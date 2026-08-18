import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
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

export const firebaseAuth = getAuth();
export const db = getFirestore();

