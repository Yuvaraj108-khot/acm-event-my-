import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { env } from './env.js';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

if (getApps().length === 0) {
  // Possible file locations for firebase-service-account.json
  const locations = [
    path.resolve(process.cwd(), 'firebase-service-account.json'),        // backend/
    path.resolve(process.cwd(), '../firebase-service-account.json'),      // repo root
    '/etc/secrets/firebase-service-account.json',                         // Render Secret Files
  ];

  let initialized = false;

  // Try each file location
  for (const loc of locations) {
    if (fs.existsSync(loc)) {
      try {
        const raw = fs.readFileSync(loc, 'utf8');
        const sa = JSON.parse(raw);
        initializeApp({ credential: cert(sa) });
        console.log(`✅ Firebase Admin initialized from file: ${loc}`);
        initialized = true;
        break;
      } catch (err) {
        console.error(`❌ Failed to load service account from ${loc}:`, err);
      }
    }
  }

  // Fallback: try env variable
  if (!initialized) {
    const envVal = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    if (envVal) {
      try {
        let jsonStr = envVal.trim();
        if (!jsonStr.startsWith('{')) {
          jsonStr = Buffer.from(jsonStr, 'base64').toString('utf8');
        }
        const sa = JSON.parse(jsonStr);
        if (sa.private_key) sa.private_key = sa.private_key.replace(/\\n/g, '\n');
        initializeApp({ credential: cert(sa) });
        console.log('✅ Firebase Admin initialized from environment variable');
        initialized = true;
      } catch (err) {
        console.error('❌ Failed to load service account from env:', err);
      }
    }
  }

  // Last resort
  if (!initialized) {
    console.warn('⚠️ No service account found! Using projectId only (will fail on authenticated calls)');
    initializeApp({ projectId: env.FIREBASE_PROJECT_ID });
  }
}

export const firebaseAuth = getAuth();
export const db = getFirestore();
