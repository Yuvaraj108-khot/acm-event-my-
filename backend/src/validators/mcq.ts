import { z } from 'zod';

export const createQuestionSchema = z.object({
  roundId: z.string().min(1),
  questionText: z.string().min(5),
  questionImageUrl: z.string().url().optional(),
  explanation: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  points: z.coerce.number().positive().default(1),
  orderIndex: z.coerce.number().int().min(0).default(0),
  isRandomized: z.boolean().default(true),
  options: z.array(z.object({
    optionText: z.string().min(1),
    optionImageUrl: z.string().url().optional(),
    isCorrect: z.boolean(),
    orderIndex: z.coerce.number().int().min(0).default(0),
  })).min(2).max(6).refine(
    (opts) => opts.filter(o => o.isCorrect).length === 1,
    { message: 'Exactly one option must be marked as correct' }
  ),
});

export const updateQuestionSchema = createQuestionSchema.omit({ roundId: true }).partial();

export const submitMcqAnswerSchema = z.object({
  roundId: z.string().min(1),
  questionId: z.string().min(1),
  selectedOptionId: z.string().min(1).nullable(),
  isMarkedForReview: z.boolean().default(false),
});

export const bulkSaveAnswersSchema = z.object({
  roundId: z.string().min(1),
  answers: z.array(z.object({
    questionId: z.string().min(1),
    selectedOptionId: z.string().min(1).nullable(),
    isMarkedForReview: z.boolean().default(false),
  })),
});

export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type SubmitMcqAnswerInput = z.infer<typeof submitMcqAnswerSchema>;
