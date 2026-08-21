import { Router } from 'express';
import * as leaderboardController from '../controllers/leaderboardController.js';
import { requireAdmin, optionalAuth } from '../middleware/auth.js';

export const leaderboardRouter = Router();

leaderboardRouter.get('/competition/:competitionId', requireAdmin, leaderboardController.getCompetitionLeaderboard);
leaderboardRouter.get('/round/:roundId', requireAdmin, leaderboardController.getRoundLeaderboard);
leaderboardRouter.post('/rebuild/:competitionId', requireAdmin, leaderboardController.rebuildLeaderboard);
