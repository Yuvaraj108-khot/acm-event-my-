import crypto from 'crypto';
import { db } from '../config/db.js';
import { env } from '../config/env.js';
import { sendOtpEmail } from '../utils/email.js';

/**
 * Generates a numeric OTP of the specified length.
 */
export function generateOtp(length: number = env.OTP_LENGTH): string {
  const digits = '0123456789';
  let otp = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    otp += digits[bytes[i] % digits.length];
  }
  return otp;
}

/**
 * Creates and stores an OTP for the given email. Invalidates previous OTPs.
 */
export async function createOtp(email: string): Promise<string> {
  const normalizedEmail = email.toLowerCase();

  // Invalidate previous OTPs for this email
  const snap = await db.collection('otp_tokens')
    .where('email', '==', normalizedEmail)
    .where('used', '==', false)
    .get();

  if (!snap.empty) {
    const batch = db.batch();
    snap.docs.forEach(doc => {
      batch.update(doc.ref, { used: true });
    });
    await batch.commit();
  }

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + env.OTP_EXPIRES_MINUTES * 60 * 1000);

  await db.collection('otp_tokens').add({
    email: normalizedEmail,
    otp,
    expiresAt,
    used: false,
    attempts: 0,
    createdAt: new Date(),
  });

  // In dev mode, print to console instead of sending email
  if (env.OTP_DEV_MODE) {
    console.log('\n' + '═'.repeat(50));
    console.log('🔑 OTP FOR DEVELOPMENT');
    console.log(`   Email : ${email}`);
    console.log(`   OTP   : ${otp}`);
    console.log(`   Expires in ${env.OTP_EXPIRES_MINUTES} minutes`);
    console.log('═'.repeat(50) + '\n');
  } else {
    await sendOtpEmail(email, otp);
  }

  return otp;
}

/**
 * Verifies an OTP for the given email.
 * Returns true if valid, throws if invalid/expired/used.
 */
export async function verifyOtp(email: string, otp: string): Promise<boolean> {
  const normalizedEmail = email.toLowerCase();
  const now = new Date();

  const snap = await db.collection('otp_tokens')
    .where('email', '==', normalizedEmail)
    .where('used', '==', false)
    .where('expiresAt', '>', now)
    .get();

  // Sort by createdAt manual since Firestore indexing might complain if compound query doesn't have order index configured
  const docs = snap.docs.sort((a, b) => {
    const aTime = a.createTime ? a.createTime.seconds : 0;
    const bTime = b.createTime ? b.createTime.seconds : 0;
    return aTime - bTime;
  });

  if (docs.length === 0) {
    throw new Error('OTP not found or has expired. Please request a new OTP.');
  }

  const tokenDoc = docs[0];
  const tokenData = tokenDoc.data();
  const currentAttempts = tokenData.attempts || 0;

  // Increment attempt count
  await tokenDoc.ref.update({ attempts: currentAttempts + 1 });

  if (currentAttempts >= 5) {
    await tokenDoc.ref.update({ used: true });
    throw new Error('Too many failed attempts. Please request a new OTP.');
  }

  if (tokenData.otp !== otp) {
    throw new Error(`Invalid OTP. ${4 - currentAttempts} attempt(s) remaining.`);
  }

  // Mark as used
  await tokenDoc.ref.update({ used: true });

  return true;
}

/**
 * Cleans up expired OTPs older than 1 hour.
 */
export async function cleanupExpiredOtps(): Promise<void> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const snap = await db.collection('otp_tokens')
    .where('createdAt', '<=', oneHourAgo)
    .get();

  if (!snap.empty) {
    const batch = db.batch();
    snap.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  }
}
