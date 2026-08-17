import { Router } from 'express';
import * as mcqController from '../controllers/mcqController.js';
import { validate } from '../middleware/validate.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { createQuestionSchema, submitMcqAnswerSchema } from '../validators/mcq.js';
import { z } from 'zod';

export const mcqRouter = Router();

const submitRoundSchema = z.object({ roundId: z.string().min(1) });

mcqRouter.get('/questions', requireAuth, mcqController.getQuestions);
mcqRouter.post('/answers/save', requireAuth, validate(submitMcqAnswerSchema), mcqController.saveAnswer);
mcqRouter.post('/submit', requireAuth, validate(submitRoundSchema), mcqController.submitRound);

// Admin routes
mcqRouter.post('/questions', requireAdmin, validate(createQuestionSchema), mcqController.createQuestion);
mcqRouter.put('/questions/:id', requireAdmin, mcqController.updateQuestion);
mcqRouter.delete('/questions/:id', requireAdmin, mcqController.deleteQuestion);
