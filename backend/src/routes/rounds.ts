import { Router } from 'express';
import * as roundsController from '../controllers/roundsController.js';
import { validate } from '../middleware/validate.js';
import { requireAuth, requireAdmin, optionalAuth } from '../middleware/auth.js';
import { createRoundSchema, updateRoundSchema, reorderRoundsSchema } from '../validators/rounds.js';

export const roundsRouter = Router();

roundsRouter.get('/', optionalAuth, roundsController.listRounds);
roundsRouter.get('/:id', optionalAuth, roundsController.getRound);

// Admin routes
roundsRouter.post('/', requireAdmin, validate(createRoundSchema), roundsController.createRound);
roundsRouter.put('/reorder', requireAdmin, validate(reorderRoundsSchema), roundsController.reorderRounds);
roundsRouter.put('/:id', requireAdmin, validate(updateRoundSchema), roundsController.updateRound);
roundsRouter.delete('/:id', requireAdmin, roundsController.deleteRound);
roundsRouter.post('/:id/start', requireAdmin, roundsController.startRound);
roundsRouter.post('/:id/end', requireAdmin, roundsController.endRound);
