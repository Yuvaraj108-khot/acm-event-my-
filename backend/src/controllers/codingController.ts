import { Request, Response } from 'express';
import * as codingService from '../services/codingService.js';
import { success } from '../utils/helpers.js';

export async function getLanguages(_req: Request, res: Response) {
  const languages = await codingService.getLanguages();
  res.json(success(languages));
}

import { getUserRoundStatus } from '../services/roundService.js';

export async function getProblems(req: Request, res: Response) {
  const { roundId } = req.query as { roundId: string };
  const isAdmin = ['admin', 'super_admin', 'moderator'].includes(req.user?.role ?? '');
  
  if (!isAdmin) {
    const enrollment = await getUserRoundStatus(roundId, req.user!.userId);
    if (!enrollment) {
      throw Object.assign(new Error('User is not enrolled in this round'), { statusCode: 403 });
    }
  }

  const problems = await codingService.getProblemsForRound(roundId, isAdmin);
  res.json(success(problems));
}

export async function createProblem(req: Request, res: Response) {
  const problem = await codingService.createProblem(req.body);
  res.status(201).json(success(problem, 'Problem created'));
}

export async function updateProblem(req: Request, res: Response) {
  const problem = await codingService.updateProblem(req.params.id, req.body);
  res.json(success(problem, 'Problem updated'));
}

export async function deleteProblem(req: Request, res: Response) {
  await codingService.deleteProblem(req.params.id);
  res.json(success(null, 'Problem deleted'));
}

export async function runCode(req: Request, res: Response) {
  const result = await codingService.runCode(req.body, req.user!.userId);
  res.json(success(result, 'Code executed'));
}

export async function submitCode(req: Request, res: Response) {
  const result = await codingService.submitCode(req.body, req.user!.userId);
  res.json(success(result, 'Code submitted'));
}

export async function getUserSubmissions(req: Request, res: Response) {
  const { problemId } = req.params;
  const submissions = await codingService.getUserSubmissions(problemId, req.user!.userId);
  res.json(success(submissions));
}
