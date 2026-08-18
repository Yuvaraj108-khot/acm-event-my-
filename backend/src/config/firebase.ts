import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

console.log('🔥 firebase.ts module loading...');

const SERVICE_ACCOUNT = {
  type: 'service_account',
  project_id: 'acm-event',
  private_key_id: '5093cb0206e53718355af9890229207758bb4931',
  private_key: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC277YoK/gh4EFz\ncaUeCXa42kG0r482R+YnaWC6uOCfFvR6cC0WiUBHQ5hrdIYg5LkLFNNaSV9AuXde\nK8G6d2qzgnphBKzg9mEjSf62I1wruShiDvxEx/XYVLwUvvgbZNfaYU5WaaYJVaI7\npJW3Ipg/mE3xrEqP8iTccpZ9j/w1ORbw2q60PTXYEoSUQ/GOr2VS0xpCp8Lz0Dp8\nWQcKT/EmoEfygOxt8Zr6Ux5DRL2GHuC3Ott4ixFAKCNT3+NsMzOhZxkTGiGeJc7U\nYruAZchSIVFdFHhgtq1FyIFcnO9xgPEiHRonzymC39p6o4WZBi5tLvZusbbqOILn\nlTdUfDvzAgMBAAECggEALzzpAaiQ81ZwMDpJU99Hu+YID3tB9NdOFCE+7BhvUEVi\nLfenfOlGIuDOi/jT5cyKB9WB2g+WPCVoMHYGGXtany3zIfhOF+0nGjCySCALXfL6\n/Y83Dx+/WPRQeN7zPEenAWodC21OhZyKPvJ6Aoc5XzqZ7ez6d/8kC5S/TX8PtkIu\n4Xv9AEfIzegUkP/LqncE81bC2Pk3lxkNkLUyzthc9QwQ0nAlMPMBJ4Szpy1aJfME\n3KuPkfdPud4VdJLOEKlFL3ERtwgETFc1GLKMPqXZwKObmu6tZTW0M8H1KagYp4Q6\nbifYepRT6+5bONSWRkvPICMtoRaAHOF8in7S/jthsQKBgQDdw91aAmq4wNqjlBAn\nuRuBV+PxwhVteKF0EyOD9opLiFGZ2XZON1yIAFjGjQV9UoTsLdvIbhRkCxOom5+g\ne+eBLe/GkcjdmAcwqm0JW1odZ5fk3gpZvUsROlg6mc5wJSkz0aOK6xvXlVzIaLSZ\nfiIAvvBRs6dmTXBSXH73YIuSOwKBgQDTLVboWTmBKiTyjBwPBdazpJd6MaLcDJt0\neEOp1TPpwsdtsW9Pq64bujAl4l+abn1WTy9rbAWHWyStBfirU0yPyJV0HdgXOffu\nO/82O9Nu6elAd67xNnEE1wUZs9Oe57PKSa2xoVh5By3LomMdInBIEEPpTIC6ix6L\nlHXY47PpqQKBgQCyL1hBpEN/42VJngRFBpS1HpuGev2gkhaYH3Cf7Y49FnEKfxJx\n0kXE+RJbpp/MjGtFIavApcI4iDXpefGOjz/6KaDJGgYdFrRgQ++MXxxPGBeRy17h\nsBkK5KhTnZWjwhgTDNStIC+kztxYItlJo3FKzCBoZUOSDZK8epmBxs8eVQKBgA2h\nUYixqZqCo9vb2zvE/rSdnQFQDtjxH1+HG6bskes2nTShTTPxOs2jWNQ5Jj6Lfx+B\nAOiIEltIMLfSONimCb0GD09tVbM6FJyV1sUjW2Q/SMTWdL4w616KmlOsXa5V+i7G\nTqW2akV1hykrlAYfYOvl0NxQCccAj7omnOyg1c3xAoGAOKq7cn6dYl/MEOE0GqPs\nF3u5D7/DOHiEGqUAOytdLNw4BrlnBVPKXc3ovpqQTbaiKrAlcTdA8guBK2DPtPw8\n+oaV5kzI0XeRbru3y+EsfhkvmuTzqF6uLhbRsCQXbyjq8qVESF+46YCnOoS9lIlP\nt/TxyHM494MDCHE2n5l7mzo=\n-----END PRIVATE KEY-----\n',
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
    console.log('✅ Firebase Admin SDK initialized with hardcoded service account');
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
