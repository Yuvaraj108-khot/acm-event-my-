import { getApps, initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

if (getApps().length === 0) {
  // Find the service account file
  const locations = [
    path.resolve(process.cwd(), 'firebase-service-account.json'),
    path.resolve(process.cwd(), '../firebase-service-account.json'),
    '/etc/secrets/firebase-service-account.json',
  ];

  let saPath: string | null = null;
  for (const loc of locations) {
    console.log(`🔍 Checking for service account at: ${loc} — exists: ${fs.existsSync(loc)}`);
    if (fs.existsSync(loc)) {
      saPath = loc;
      break;
    }
  }

  if (saPath) {
    // Set GOOGLE_APPLICATION_CREDENTIALS and let the SDK handle auth natively
    process.env.GOOGLE_APPLICATION_CREDENTIALS = saPath;
    initializeApp({ credential: applicationDefault() });
    console.log(`✅ Firebase Admin initialized using GOOGLE_APPLICATION_CREDENTIALS: ${saPath}`);
  } else {
    // No file found — try cert() with env variable
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
      } catch (err) {
        console.error('❌ Failed to parse service account from env:', err);
        initializeApp({ projectId: 'acm-event' });
      }
    } else {
      console.error('❌ NO SERVICE ACCOUNT FOUND ANYWHERE');
      console.error('   Checked locations:', locations);
      console.error('   Env vars FIREBASE_SERVICE_ACCOUNT_JSON:', !!process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      console.error('   Env vars FIREBASE_SERVICE_ACCOUNT_BASE64:', !!process.env.FIREBASE_SERVICE_ACCOUNT_BASE64);
      initializeApp({ projectId: 'acm-event' });
    }
  }
}

export const firebaseAuth = getAuth();
export const db = getFirestore();
