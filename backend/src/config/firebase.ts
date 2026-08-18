import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

console.log('🔥 firebase.ts module loading...');

const SERVICE_ACCOUNT = {
  type: 'service_account',
  project_id: 'acm-event',
  private_key_id: 'f0cbab0e9508719ff9ea8da6a873a5bd51a111e7',
  private_key: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCyvNNbDox8aVbp\n66ZQfiugjk4hsdX2a1jCgezdsQdpg9VWvGxQMvL/Ret4/vY5aU2iH50RWInNf5sI\nUk8I/3mdOZs5l/8BOGPCxCiAGrEkAyZ955UJugNejs7nSy0Va1n5RlJv95Tgzav9\nHpUQm4wr5QZLvtiQq2sjVMvcGEW3HL/sWn0P+LWj41CngijzToeKcoMcyW3++J0A\ndTnc3OFVv8CzwOuVyiEL7MFJQEjbib2kDTGKCpB1tGOHiwmzr0bR0BmhIXik3QdO\nLVVY+VZnp6zPWveNM6KCbvuxRUIvNscMzWPKkJNVnBhzcGFg+TOa93x3lCePQEgL\nens1h3d/AgMBAAECggEAJuCZnHHCrwD+razbJSD8flTVu9CBuLLKwKwgCGyMLzBE\nxDQB30PlxQ7BVDUo+33jLANyV6aJetBpuVql5FAldMRl9hYQmoRYdrHSGWM06p9g\nzPwFV/NE7lljub2JVeJe1LCuF7qjgG5cHZd8VvtudtG/F9SwKG+Qw0ObgAkriNNz\n1TJAbV0SR5DGgQcYjKVs2qc4OMNTufaEqovrMc56y/6tJh3VVD/dUH96+CH6/793\ne3YH/YOVxed8jSv1ZFhGZFWAvu3wGVxxSpoCQZ+ABRgDerwZo08E/MvvvZR7lnf7\nkdJagjjMzXIGITplXknMr7qF/mHLCdEZAsZagjwDKQKBgQDjTUv/ElIs18Pw3W5h\n+6idUQ6yAkGfB4+UQbGnJVGe5i7+A9g26vWlhH7USSvRgLNjTzCDLqwHue2OWIC3\nTwIPCXJXMNgTd41yF2VQ7jP4h7CDHMQn8p6X6wtZWQPaXI49c1D+ca+4hkKrB+7O\nEf+ezD6OQ9d/WLaDMsv/5DqS/QKBgQDJTd09CpuRbIu8NTm7OiGfcW/6HxUGtGuX\nSBCjXpnQKBmDQtQnMBjuPft8MPbVCCXC/t3yspV7eKSKpMkoayXQkEiMiX0B/HjA\nD/w+Un7Lt47ZVlx5hVfjEVj1BFS1QuOxRg01TC0SFQgnhT/WEPqRx+4llpEnXfRy\nOJwkEGgTKwKBgQCgVSHKJo44e2oHOOpnyzBA57BJ+DV5i8fHeB9sG3Lbdtqm6udU\ntZ/YxQEBlSuHeBURdAZwQjeuq4PZ6KvCocR9/tfckOOZt7baR45768pVAMGNenkT\nBJzB5FX5DEUffjIHPpRfJqogqvPT2KCmUyPQS5nEmC4l8dmr6eTj94UpsQKBgGTm\nO1tKQtmsb4nhn9NBevLhOABFrhNTQY5tV7GbTDtyrf8F8zLFP+nCdZg1LrNuxwar\nGvJ4IsblnIvFtvIkaqrUdxjCHT9undOe748JaHaRxe8YA3gBpyCwZEdDaXYFVf1Y\nIGyzhu/GTPUKLAoPLpj9flem1ZDG3iyWRWUqOBBLAoGAVap4hOBjNKKzQaV/MtEr\n9PptNZUubWNd0EaaGpzIbSjwfx3BXFXE89mc7gcequxrEY+KcTBzrix3XanRxkLu\nUfr9yeyxCYBMooJaNRMESZAqPQb5ZomJqh4RMIS50NCPcUNyBm8zaRfTOf5JQtba\nWJ5lH4d9Z+CDsa5ifSKz5zU=\n-----END PRIVATE KEY-----\n',
  client_email: 'firebase-adminsdk-fbsvc@acm-event.iam.gserviceaccount.com',
  client_id: '104209025966433802332',
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url: 'https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40acm-event.iam.gserviceaccount.com',
  universe_domain: 'googleapis.com',
};

if (getApps().length === 0) {
  try {
    initializeApp({
      credential: cert(SERVICE_ACCOUNT as any),
    });
    console.log('✅ Firebase Admin SDK initialized with NEW service account key');
  } catch (err) {
    console.error('❌ Firebase init FAILED:', err);
    process.exit(1);
  }
}

export const firebaseAuth = getAuth();
export const db = getFirestore();

// Verify connection immediately
db.listCollections()
  .then((cols) => console.log(`✅ Firestore connected! Found ${cols.length} collections`))
  .catch((err: any) => console.error('❌ Firestore connection FAILED:', err.message || err));
