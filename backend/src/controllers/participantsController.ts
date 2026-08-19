import { Request, Response } from 'express';
import * as participantService from '../services/participantService.js';
import { success, paginate } from '../utils/helpers.js';

export async function listParticipants(req: Request, res: Response) {
  const { competitionId, page = '1', limit = '20' } = req.query as Record<string, string>;
  const rows = await participantService.listParticipants({
    competitionId,
    page: Number(page),
    limit: Number(limit),
  });
  res.json(success(rows));
}

export async function getParticipant(req: Request, res: Response) {
  const participant = await participantService.getParticipant(req.params.id);
  res.json(success(participant));
}

export async function updateParticipantStatus(req: Request, res: Response) {
  const { competitionId, status } = req.body;
  const reg = await participantService.updateParticipantStatus(competitionId, req.params.id, status);
  res.json(success(reg, 'Participant status updated'));
}

export async function deactivateParticipant(req: Request, res: Response) {
  await participantService.deactivateParticipant(req.params.id);
  res.json(success(null, 'Participant deactivated'));
}

export async function reactivateParticipant(req: Request, res: Response) {
  await participantService.reactivateParticipant(req.params.id);
  res.json(success(null, 'Participant reactivated'));
}
