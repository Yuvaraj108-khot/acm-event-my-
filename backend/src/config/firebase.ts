import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { env } from './env.js';
import fs from 'fs';
import path from 'path';

if (getApps().length === 0) {
  const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const serviceAccountPath = path.resolve(process.cwd(), 'firebase-service-account.json');
  const parentServiceAccountPath = path.resolve(process.cwd(), '../firebase-service-account.json');

  if (serviceAccountEnv) {
    try {
      const parsed = typeof serviceAccountEnv === 'string' ? JSON.parse(serviceAccountEnv) : serviceAccountEnv;
      if (parsed.private_key) {
        parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
      }
      initializeApp({ credential: cert(parsed) });
      console.log('✅ Firebase Admin initialized with service account env');
    } catch (err) {
      console.error('❌ Error initializing Firebase from env:', err);
      initializeApp({ projectId: env.FIREBASE_PROJECT_ID });
    }
  } else if (fs.existsSync(serviceAccountPath)) {
    const content = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    if (content.private_key) content.private_key = content.private_key.replace(/\\n/g, '\n');
    initializeApp({ credential: cert(content) });
    console.log('✅ Firebase Admin initialized with local service account file');
  } else if (fs.existsSync(parentServiceAccountPath)) {
    const content = JSON.parse(fs.readFileSync(parentServiceAccountPath, 'utf8'));
    if (content.private_key) content.private_key = content.private_key.replace(/\\n/g, '\n');
    initializeApp({ credential: cert(content) });
    console.log('✅ Firebase Admin initialized with parent service account file');
  } else {
    console.warn('⚠️ Firebase Admin initialized without credentials (using default project ID)');
    initializeApp({
      projectId: env.FIREBASE_PROJECT_ID,
    });
  }
}

export const firebaseAuth = getAuth();
export const db = getFirestore();

