import { Request, Response } from 'express';
import * as resultsService from '../services/resultsService.js';
import { success } from '../utils/helpers.js';

export async function getRoundResults(req: Request, res: Response) {
  const { roundId } = req.params;
  const results = await resultsService.getRoundResults(roundId);
  res.json(success(results));
}

export async function getUserResult(req: Request, res: Response) {
  const { roundId } = req.params;
  const result = await resultsService.getUserResult(roundId, req.user!.userId);
  res.json(success(result));
}

export async function publishResults(req: Request, res: Response) {
  const { roundId } = req.params;
  await resultsService.publishResults(roundId);
  res.json(success(null, 'Results published successfully'));
}

export async function selectAdvancingParticipants(req: Request, res: Response) {
  const { currentRoundId, nextRoundId, participantIds } = req.body;
  const result = await resultsService.selectAdvancingParticipants({
    currentRoundId,
    nextRoundId,
    participantIds,
    adminId: req.user!.userId,
  });
  res.json(success(result, `${result.advanced} participants advanced to next round`));
}
