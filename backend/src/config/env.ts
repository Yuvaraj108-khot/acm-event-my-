import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),

  // Database
  DATABASE_URL: z.string().default('firestore'),

  // JWT
  JWT_SECRET: z.string().min(32).default('dev-secret-change-in-production-min-32-chars'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  REFRESH_TOKEN_SECRET: z.string().min(32).default('dev-refresh-secret-change-in-prod-min-32'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('30d'),

  // OTP
  OTP_EXPIRES_MINUTES: z.coerce.number().default(10),
  OTP_LENGTH: z.coerce.number().default(6),
  OTP_DEV_MODE: z.string().transform(v => v === 'true').default('true'),

  // Email
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().default('noreply@acm-nmamit.com'),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
  OTP_RATE_LIMIT_MAX: z.coerce.number().default(5),

  // Sandbox
  SANDBOX_TIMEOUT_MS: z.coerce.number().default(10000),
  SANDBOX_MEMORY_LIMIT_MB: z.coerce.number().default(256),
  USE_DOCKER_SANDBOX: z.string().transform(v => v === 'true').default('true'),

  // Firebase
  FIREBASE_PROJECT_ID: z.string().default('acm-event'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
