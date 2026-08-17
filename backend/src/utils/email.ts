import { env } from '../config/env.js';

/**
 * Sends an OTP email via Resend.
 * Falls back to console.log in dev mode.
 */
export async function sendOtpEmail(email: string, otp: string): Promise<void> {
  if (!env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not configured. OTP not sent via email.');
    return;
  }

  // Dynamic import to avoid loading if key not present
  const { Resend } = await import('resend');
  const resend = new Resend(env.RESEND_API_KEY);

  const expiryMinutes = env.OTP_EXPIRES_MINUTES;

  await resend.emails.send({
    from: env.EMAIL_FROM,
    to: email,
    subject: 'Your ACM NMAMIT Competition Platform OTP',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>OTP Verification</title>
      </head>
      <body style="font-family: 'Segoe UI', Arial, sans-serif; background: #0a0a0a; color: #e5e5e5; margin: 0; padding: 20px;">
        <div style="max-width: 480px; margin: 40px auto; background: #111; border: 1px solid #222; border-radius: 12px; padding: 40px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #a855f7; margin: 0; font-size: 24px;">ACM NMAMIT</h1>
            <p style="color: #888; margin: 8px 0 0 0; font-size: 14px;">Competition Platform</p>
          </div>
          
          <h2 style="color: #e5e5e5; font-size: 18px; margin: 0 0 16px 0;">Your One-Time Password</h2>
          <p style="color: #aaa; font-size: 14px; margin: 0 0 24px 0;">
            Use the code below to log in. This code expires in <strong style="color: #e5e5e5;">${expiryMinutes} minutes</strong>.
          </p>
          
          <div style="background: #1a1a1a; border: 1px solid #333; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
            <span style="font-size: 48px; font-weight: bold; letter-spacing: 12px; color: #a855f7; font-family: 'Courier New', monospace;">${otp}</span>
          </div>
          
          <p style="color: #666; font-size: 12px; margin: 0; text-align: center;">
            If you did not request this, please ignore this email.<br>
            Do not share this OTP with anyone.
          </p>
        </div>
      </body>
      </html>
    `,
  });
}
