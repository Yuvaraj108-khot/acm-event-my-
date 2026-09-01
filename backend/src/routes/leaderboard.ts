import { Router } from 'express';
import * as leaderboardController from '../controllers/leaderboardController.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';

export const leaderboardRouter = Router();

leaderboardRouter.get('/competition/:competitionId', requireAuth, leaderboardController.getCompetitionLeaderboard);
leaderboardRouter.get('/round/:roundId', requireAuth, leaderboardController.getRoundLeaderboard);
leaderboardRouter.post('/rebuild/:competitionId', requireAdmin, leaderboardController.rebuildLeaderboard);
