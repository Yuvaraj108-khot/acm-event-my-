import { Router } from 'express';
import * as resultsController from '../controllers/resultsController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';

export const resultsRouter = Router();

const selectAdvancingSchema = z.object({
  currentRoundId: z.string().min(1),
  nextRoundId: z.string().min(1),
  participantIds: z.array(z.string().min(1)).min(1),
});

resultsRouter.get('/round/:roundId', requireAdmin, resultsController.getRoundResults);
resultsRouter.get('/round/:roundId/me', requireAuth, resultsController.getUserResult);
resultsRouter.post('/round/:roundId/publish', requireAdmin, resultsController.publishResults);
resultsRouter.post('/advance', requireAdmin, validate(selectAdvancingSchema), resultsController.selectAdvancingParticipants);
