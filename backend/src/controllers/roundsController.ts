import { Request, Response } from 'express';
import * as roundService from '../services/roundService.js';
import { success } from '../utils/helpers.js';

export async function listRounds(req: Request, res: Response) {
  const { competitionId } = req.query as { competitionId: string };
  const isAdmin = ['admin', 'super_admin', 'moderator'].includes(req.user?.role ?? '');
  const rounds = await roundService.getRoundsByCompetition(competitionId, isAdmin);
  res.json(success(rounds));
}

export async function getRound(req: Request, res: Response) {
  const round = await roundService.getRound(req.params.id);
  const userStatus = req.user ? await roundService.getUserRoundStatus(round.id, req.user.userId) : null;
  res.json(success({ ...round, userStatus }));
}

export async function createRound(req: Request, res: Response) {
  const round = await roundService.createRound(req.body);
  res.status(201).json(success(round, 'Round created successfully'));
}

export async function updateRound(req: Request, res: Response) {
  const round = await roundService.updateRound(req.params.id, req.body);
  res.json(success(round, 'Round updated successfully'));
}

export async function deleteRound(req: Request, res: Response) {
  await roundService.deleteRound(req.params.id);
  res.json(success(null, 'Round deleted successfully'));
}

export async function reorderRounds(req: Request, res: Response) {
  const { competitionId, rounds } = req.body;
  const updated = await roundService.reorderRounds(competitionId, rounds);
  res.json(success(updated, 'Rounds reordered successfully'));
}

export async function startRound(req: Request, res: Response) {
  const round = await roundService.startRound(req.params.id);
  // Enroll participants automatically
  await roundService.enrollParticipantsInRound(round.id, round.competitionId);
  res.json(success(round, 'Round started'));
}

export async function endRound(req: Request, res: Response) {
  const round = await roundService.endRound(req.params.id);
  res.json(success(round, 'Round ended'));
}
