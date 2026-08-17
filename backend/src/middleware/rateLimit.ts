import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

/**
 * Global rate limiter applied to all /api routes.
 */
export const globalRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: 1000, // Increased limit for dev & normal testing
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  skip: (req) => env.NODE_ENV === 'test' || env.NODE_ENV === 'development',
});

/**
 * Strict rate limiter for OTP endpoints.
 */
export const otpRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: env.OTP_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.body?.email || req.ip || 'unknown',
  message: {
    success: false,
    message: 'Too many OTP requests. Please wait before requesting another OTP.',
  },
  skip: (req) => env.NODE_ENV === 'test',
});

/**
 * Submission rate limiter (prevent spam submissions).
 */
export const submissionRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.userId || req.ip || 'unknown',
  message: {
    success: false,
    message: 'Too many submissions. Please wait before submitting again.',
  },
  skip: (req) => env.NODE_ENV === 'test',
});
