import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { env } from './env.js';
import fs from 'fs';
import path from 'path';

if (getApps().length === 0) {
  const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const serviceAccountPath = path.resolve(process.cwd(), 'firebase-service-account.json');

  if (serviceAccountEnv) {
    try {
      const parsed = JSON.parse(serviceAccountEnv);
      initializeApp({ credential: cert(parsed) });
    } catch {
      initializeApp({ projectId: env.FIREBASE_PROJECT_ID });
    }
  } else if (fs.existsSync(serviceAccountPath)) {
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

