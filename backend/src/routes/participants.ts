import { Router } from 'express';
import * as participantsController from '../controllers/participantsController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

export const participantsRouter = Router();

participantsRouter.get('/', requireAdmin, participantsController.listParticipants);
participantsRouter.get('/:id', requireAdmin, participantsController.getParticipant);
participantsRouter.put('/:id/status', requireAdmin, participantsController.updateParticipantStatus);
participantsRouter.delete('/:id', requireAdmin, participantsController.deactivateParticipant);
