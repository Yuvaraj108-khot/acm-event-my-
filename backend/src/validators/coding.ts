import { z } from 'zod';

export const createProblemSchema = z.object({
  roundId: z.string().min(1),
  title: z.string().min(3).max(200),
  description: z.string().min(10),
  inputFormat: z.string().min(5),
  outputFormat: z.string().min(5),
  constraints: z.string().min(5),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  points: z.coerce.number().positive().default(100),
  timeLimitMs: z.coerce.number().int().positive().max(30000).default(2000),
  memoryLimitMb: z.coerce.number().int().positive().max(1024).default(256),
  orderIndex: z.coerce.number().int().min(0).default(0),
  tipDurationSeconds: z.coerce.number().int().min(1).max(300).default(10),
  tips: z.array(z.string()).default([]),
  testCases: z.array(z.object({
    input: z.string(),
    expectedOutput: z.string(),
    isSample: z.boolean().default(false),
    isHidden: z.boolean().default(true),
    explanation: z.string().optional(),
    orderIndex: z.coerce.number().int().min(0).default(0),
  })).min(1),
});

export const updateProblemSchema = createProblemSchema.omit({ roundId: true }).partial();

export const submitCodeSchema = z.object({
  problemId: z.string().min(1),
  roundId: z.string().min(1),
  languageId: z.string().min(1),
  sourceCode: z.string().min(1).max(65536),
  isRunOnly: z.boolean().default(false),
});

export type CreateProblemInput = z.infer<typeof createProblemSchema>;
export type SubmitCodeInput = z.infer<typeof submitCodeSchema>;
