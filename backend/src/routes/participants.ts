import { Router } from 'express';
import * as participantsController from '../controllers/participantsController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';

export const participantsRouter = Router();

participantsRouter.get('/', requireAdmin, participantsController.listParticipants);
participantsRouter.get('/:id', requireAdmin, participantsController.getParticipant);
participantsRouter.put(
  '/:id/status',
  requireAdmin,
  auditLog({
    action: 'UPDATE_PARTICIPANT_STATUS',
    resourceType: 'participant',
    getResourceId: (req) => req.params.id,
    getMetadata: (req) => ({ status: req.body.status, competitionId: req.body.competitionId }),
  }),
  participantsController.updateParticipantStatus
);
participantsRouter.delete(
  '/:id',
  requireAdmin,
  auditLog({
    action: 'DEACTIVATE_PARTICIPANT',
    resourceType: 'user',
    getResourceId: (req) => req.params.id,
  }),
  participantsController.deactivateParticipant
);
participantsRouter.post(
  '/:id/reactivate',
  requireAdmin,
  auditLog({
    action: 'REACTIVATE_PARTICIPANT',
    resourceType: 'user',
    getResourceId: (req) => req.params.id,
  }),
  participantsController.reactivateParticipant
);
