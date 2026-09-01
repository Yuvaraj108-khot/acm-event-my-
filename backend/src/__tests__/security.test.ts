import 'dotenv/config';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../index.js';
import * as roundService from '../services/roundService.js';
import { db } from '../config/db.js';

// Mock roundService
vi.mock('../services/roundService.js', () => ({
  getRound: vi.fn(),
  getUserRoundStatus: vi.fn(),
  isRoundTimeWindowActive: vi.fn(),
}));

// Mock Firebase Admin Auth middleware verification
vi.mock('../middleware/auth.js', () => ({
  requireAuth: (req: any, res: any, next: any) => {
    req.user = { userId: 'test-user-123', role: 'participant', email: 'test@student.com' };
    next();
  },
  requireAdmin: (req: any, res: any, next: any) => {
    req.user = { userId: 'test-admin-123', role: 'admin', email: 'admin@acm.com' };
    next();
  },
  requireSuperAdmin: (req: any, res: any, next: any) => {
    req.user = { userId: 'test-super-admin-123', role: 'super_admin', email: 'super@acm.com' };
    next();
  },
  requireRole: (...roles: string[]) => (req: any, res: any, next: any) => {
    req.user = { userId: 'test-user-123', role: 'participant', email: 'test@student.com' };
    next();
  },
  optionalAuth: (req: any, res: any, next: any) => {
    req.user = { userId: 'test-user-123', role: 'participant', email: 'test@student.com' };
    next();
  },
}));

// Mock database query returns
vi.mock('../config/db.js', () => {
  const mockGet = vi.fn();
  const mockDoc = vi.fn(() => ({
    get: mockGet,
  }));
  const mockCollection = vi.fn(() => ({
    doc: mockDoc,
    where: vi.fn().mockReturnThis(),
    get: mockGet,
  }));
  return {
    db: {
      collection: mockCollection,
    },
  };
});

describe('Security and Integrity Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reject requests with invalid CORS origins', async () => {
    const res = await request(app)
      .get('/health')
      .set('Origin', 'http://malicious-website.com');
    
    // CORS middleware throws an error which triggers the global error handler
    expect(res.status).toBe(500);
    expect(res.body.message).toContain('CORS');
  });

  it('should allow requests with valid CORS origins', async () => {
    const res = await request(app)
      .get('/health')
      .set('Origin', 'http://localhost:5173');
    
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('should reject submission if participant is not enrolled in the round', async () => {
    // Mock round info
    vi.mocked(roundService.getRound).mockResolvedValue({
      id: 'round-123',
      competitionId: 'comp-123',
      status: 'active',
      durationMinutes: 60,
    });
    
    // Mock user is NOT enrolled (returns null)
    vi.mocked(roundService.getUserRoundStatus).mockResolvedValue(null);

    const res = await request(app)
      .post('/api/coding/submit')
      .send({
        problemId: 'prob-123',
        roundId: 'round-123',
        languageId: 'lang-123',
        sourceCode: 'print(1)',
      });

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('not enrolled');
  });

  it('should reject submission if the round time window is not active or has ended', async () => {
    // Mock round info
    vi.mocked(roundService.getRound).mockResolvedValue({
      id: 'round-123',
      competitionId: 'comp-123',
      status: 'active',
    });
    
    // Mock user IS enrolled
    vi.mocked(roundService.getUserRoundStatus).mockResolvedValue({
      userId: 'test-user-123',
      roundId: 'round-123',
    });

    // Mock round time window is EXPIRED
    vi.mocked(roundService.isRoundTimeWindowActive).mockReturnValue(false);

    const res = await request(app)
      .post('/api/coding/submit')
      .send({
        problemId: 'prob-123',
        roundId: 'round-123',
        languageId: 'lang-123',
        sourceCode: 'print(1)',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('time window');
  });

  it('should reject submission if the problem does not belong to the submitted round', async () => {
    // Mock round info
    vi.mocked(roundService.getRound).mockResolvedValue({
      id: 'round-123',
      competitionId: 'comp-123',
      status: 'active',
    });
    
    // Mock user IS enrolled
    vi.mocked(roundService.getUserRoundStatus).mockResolvedValue({
      userId: 'test-user-123',
      roundId: 'round-123',
    });

    // Mock round time window is ACTIVE
    vi.mocked(roundService.isRoundTimeWindowActive).mockReturnValue(true);

    // Mock problem round mapping mismatch (belongs to round-999, not round-123)
    const mockGet = vi.fn();
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ id: 'lang-123', slug: 'python' }),
    }); // For language
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ id: 'prob-123', roundId: 'round-999', points: '100' }),
    }); // For problem

    const mockDoc = vi.fn(() => ({
      get: mockGet,
    }));
    vi.mocked(db.collection).mockReturnValue({
      doc: mockDoc,
    } as any);

    const res = await request(app)
      .post('/api/coding/submit')
      .send({
        problemId: 'prob-123',
        roundId: 'round-123',
        languageId: 'lang-123',
        sourceCode: 'print(1)',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('does not belong to this round');
  });
});
