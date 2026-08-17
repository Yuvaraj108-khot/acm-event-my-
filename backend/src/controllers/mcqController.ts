import { Request, Response } from 'express';
import * as mcqService from '../services/mcqService.js';
import { success } from '../utils/helpers.js';

export async function getQuestions(req: Request, res: Response) {
  const { roundId } = req.query as { roundId: string };
  const isAdmin = ['admin', 'super_admin', 'moderator'].includes(req.user?.role ?? '');
  const questions = await mcqService.getQuestionsForRound(roundId, req.user?.userId ?? '', isAdmin);
  res.json(success(questions));
}

export async function createQuestion(req: Request, res: Response) {
  const question = await mcqService.createQuestion(req.body);
  res.status(201).json(success(question, 'Question created'));
}

export async function updateQuestion(req: Request, res: Response) {
  const question = await mcqService.updateQuestion(req.params.id, req.body);
  res.json(success(question, 'Question updated'));
}

export async function deleteQuestion(req: Request, res: Response) {
  await mcqService.deleteQuestion(req.params.id);
  res.json(success(null, 'Question deleted'));
}

export async function saveAnswer(req: Request, res: Response) {
  const { roundId, questionId, selectedOptionId, isMarkedForReview } = req.body;
  const result = await mcqService.saveAnswer({
    roundId,
    userId: req.user!.userId,
    questionId,
    selectedOptionId,
    isMarkedForReview,
  });
  res.json(success(result));
}

export async function submitRound(req: Request, res: Response) {
  const { roundId } = req.body;
  const result = await mcqService.submitMcqRound(roundId, req.user!.userId);
  res.json(success(result, 'Round submitted successfully'));
}
