import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { env } from './env.js';
import fs from 'fs';
import path from 'path';

if (getApps().length === 0) {
  const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  const serviceAccountPath = path.resolve(process.cwd(), 'firebase-service-account.json');
  const parentServiceAccountPath = path.resolve(process.cwd(), '../firebase-service-account.json');
  const renderSecretPath = '/etc/secrets/firebase-service-account.json';

  let initialized = false;

  // 1. Try Environment Variable (JSON or Base64)
  if (serviceAccountEnv && !initialized) {
    try {
      let jsonStr = serviceAccountEnv.trim();
      // Check if base64 encoded
      if (!jsonStr.startsWith('{')) {
        jsonStr = Buffer.from(jsonStr, 'base64').toString('utf8');
      }
      const parsed = JSON.parse(jsonStr);
      if (parsed.private_key) {
        parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
      }
      initializeApp({ credential: cert(parsed) });
      console.log('✅ Firebase Admin initialized via environment variable');
      initialized = true;
    } catch (err) {
      console.error('❌ Failed to initialize Firebase from env variable:', err);
    }
  }

  // 2. Try Render Secret File (/etc/secrets/firebase-service-account.json)
  if (!initialized && fs.existsSync(renderSecretPath)) {
    try {
      const content = JSON.parse(fs.readFileSync(renderSecretPath, 'utf8'));
      if (content.private_key) content.private_key = content.private_key.replace(/\\n/g, '\n');
      initializeApp({ credential: cert(content) });
      console.log('✅ Firebase Admin initialized via Render Secret File (/etc/secrets)');
      initialized = true;
    } catch (err) {
      console.error('❌ Error reading Render Secret File:', err);
    }
  }

  // 3. Try Local File
  if (!initialized && fs.existsSync(serviceAccountPath)) {
    try {
      const content = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      if (content.private_key) content.private_key = content.private_key.replace(/\\n/g, '\n');
      initializeApp({ credential: cert(content) });
      console.log('✅ Firebase Admin initialized via local service account file');
      initialized = true;
    } catch (err) {
      console.error('❌ Error reading local service account file:', err);
    }
  }

  // 4. Try Parent Directory File
  if (!initialized && fs.existsSync(parentServiceAccountPath)) {
    try {
      const content = JSON.parse(fs.readFileSync(parentServiceAccountPath, 'utf8'));
      if (content.private_key) content.private_key = content.private_key.replace(/\\n/g, '\n');
      initializeApp({ credential: cert(content) });
      console.log('✅ Firebase Admin initialized via parent service account file');
      initialized = true;
    } catch (err) {
      console.error('❌ Error reading parent service account file:', err);
    }
  }

  // Fallback
  if (!initialized) {
    console.warn('⚠️ WARNING: Firebase Admin initialized without service account credentials!');
    initializeApp({ projectId: env.FIREBASE_PROJECT_ID });
  }
}

export const firebaseAuth = getAuth();
export const db = getFirestore();

