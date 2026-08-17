import { Request, Response } from 'express';
import * as leaderboardService from '../services/leaderboardService.js';
import { success } from '../utils/helpers.js';

export async function getCompetitionLeaderboard(req: Request, res: Response) {
  const { competitionId } = req.params;
  const board = await leaderboardService.getCompetitionLeaderboard(competitionId);
  res.json(success(board));
}

export async function getRoundLeaderboard(req: Request, res: Response) {
  const { roundId } = req.params;
  const board = await leaderboardService.getRoundLeaderboard(roundId);
  res.json(success(board));
}

export async function rebuildLeaderboard(req: Request, res: Response) {
  const { competitionId } = req.params;
  await leaderboardService.rebuildCompetitionLeaderboard(competitionId);
  res.json(success(null, 'Leaderboard rebuilt successfully'));
}
