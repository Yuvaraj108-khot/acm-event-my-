import { z } from 'zod';

export const sendOtpSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
});

export const verifyOtpSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d+$/, 'OTP must contain only digits'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const completeProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  usn: z.string().min(1, 'USN is required').max(50),
  department: z.enum(['CSE', 'ISE', 'ECE', 'EEE', 'ME', 'CE', 'BT', 'CH', 'MBA', 'MCA', 'Other']),
  semester: z.coerce.number().int().min(1).max(8),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number'),
});

export type SendOtpInput = z.infer<typeof sendOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type CompleteProfileInput = z.infer<typeof completeProfileSchema>;

export const firebaseLoginSchema = z.object({
  idToken: z.string().min(1, 'ID Token is required'),
});

export type FirebaseLoginInput = z.infer<typeof firebaseLoginSchema>;

export const registerSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;


