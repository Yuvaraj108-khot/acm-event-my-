import { Router } from 'express';
import * as codingController from '../controllers/codingController.js';
import { validate } from '../middleware/validate.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { createProblemSchema, submitCodeSchema, runCodeSchema } from '../validators/coding.js';
import { submissionRateLimiter } from '../middleware/rateLimit.js';

export const codingRouter = Router();

codingRouter.get('/languages', codingController.getLanguages);
codingRouter.get('/problems', requireAuth, codingController.getProblems);
codingRouter.get('/submissions/:problemId', requireAuth, codingController.getUserSubmissions);
codingRouter.post('/run', requireAuth, submissionRateLimiter, validate(runCodeSchema), codingController.runCode);
codingRouter.post('/submit', requireAuth, submissionRateLimiter, validate(submitCodeSchema), codingController.submitCode);

// Admin routes
codingRouter.post('/problems', requireAdmin, validate(createProblemSchema), codingController.createProblem);
codingRouter.put('/problems/:id', requireAdmin, codingController.updateProblem);
codingRouter.delete('/problems/:id', requireAdmin, codingController.deleteProblem);
