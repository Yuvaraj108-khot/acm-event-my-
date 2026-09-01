import 'dotenv/config';
import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { authRouter } from './routes/auth.js';
import { competitionsRouter } from './routes/competitions.js';
import { roundsRouter } from './routes/rounds.js';
import { mcqRouter } from './routes/mcq.js';
import { codingRouter } from './routes/coding.js';
import { participantsRouter } from './routes/participants.js';
import { leaderboardRouter } from './routes/leaderboard.js';
import { resultsRouter } from './routes/results.js';
import { adminRouter } from './routes/admin.js';
import { errorHandler } from './middleware/errorHandler.js';
import { globalRateLimiter } from './middleware/rateLimit.js';

const app = express();

// Trust reverse proxy (e.g. Nginx, Vercel, Docker gateway)
app.set('trust proxy', 1);

// ── Security middleware ───────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
  origin: (origin, callback) => {
    if (
      !origin ||
      /^http:\/\/localhost:\d+$/.test(origin) ||
      /\.vercel\.app$/.test(origin) ||
      origin === env.FRONTEND_URL
    ) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Logging ───────────────────────────────────────────────────────────────────
if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ── Rate limiting ─────────────────────────────────────────────────────────────
app.use('/api', globalRateLimiter);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/competitions', competitionsRouter);
app.use('/api/rounds', roundsRouter);
app.use('/api/mcq', mcqRouter);
app.use('/api/coding', codingRouter);
app.use('/api/participants', participantsRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/results', resultsRouter);
app.use('/api/admin', adminRouter);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start server ──────────────────────────────────────────────────────────────
let server: any;
if (env.NODE_ENV !== 'test') {
  server = app.listen(env.PORT, () => {
    console.log(`\n🚀 ACM Competition Platform API`);
    console.log(`   Environment : ${env.NODE_ENV}`);
    console.log(`   Port        : ${env.PORT}`);
    console.log(`   Database    : Firebase Firestore (${env.FIREBASE_PROJECT_ID})`);
    if (env.OTP_DEV_MODE) {
      console.log(`   OTP Mode    : DEVELOPMENT (OTPs printed to console)`);
    }
    console.log('');
  });
}

// ── Graceful shutdown ─────────────────────────────────────────────────────────
const shutdown = (signal: string) => {
  console.log(`\n${signal} received — shutting down gracefully...`);
  if (server) {
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export { app };
