import { Router } from 'express';
import * as competitionsController from '../controllers/competitionsController.js';
import { validate } from '../middleware/validate.js';
import { requireAuth, requireAdmin, optionalAuth } from '../middleware/auth.js';
import { createCompetitionSchema, updateCompetitionSchema, competitionQuerySchema } from '../validators/competitions.js';

export const competitionsRouter = Router();

// Public / participant routes
competitionsRouter.get('/', optionalAuth, competitionsController.listCompetitions);
competitionsRouter.get('/slug/:slug', optionalAuth, competitionsController.getCompetitionBySlug);
competitionsRouter.get('/:id', optionalAuth, competitionsController.getCompetition);
competitionsRouter.post('/:id/register', requireAuth, competitionsController.registerForCompetition);

// Admin routes
competitionsRouter.post('/', requireAdmin, validate(createCompetitionSchema), competitionsController.createCompetition);
competitionsRouter.put('/:id', requireAdmin, validate(updateCompetitionSchema), competitionsController.updateCompetition);
competitionsRouter.delete('/:id', requireAdmin, competitionsController.deleteCompetition);
