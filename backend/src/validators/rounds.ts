import { z } from 'zod';

const dateString = z.string().refine((val) => !isNaN(Date.parse(val)), {
  message: 'Invalid date format',
});

export const createRoundSchema = z.object({
  competitionId: z.string().min(1),
  title: z.string().min(3).max(200),
  description: z.string().optional().nullable(),
  type: z.enum(['mcq', 'coding']),
  orderIndex: z.coerce.number().int().min(0).default(0),
  durationMinutes: z.coerce.number().int().positive().max(480).default(60),
  maxPoints: z.coerce.number().positive().default(100),
  negativeMarkingEnabled: z.boolean().default(false),
  negativeMarkingValue: z.coerce.number().min(0).max(100).default(0),
  passingScore: z.coerce.number().positive().optional().nullable(),
  maxAdvancingParticipants: z.coerce.number().int().positive().optional().nullable(),
  scheduledStartAt: dateString.optional().nullable(),
});

export const updateRoundSchema = createRoundSchema.omit({ competitionId: true }).partial().extend({
  status: z.enum(['upcoming', 'active', 'completed', 'cancelled']).optional(),
  isPublished: z.boolean().optional(),
});

export const reorderRoundsSchema = z.object({
  competitionId: z.string().min(1),
  rounds: z.array(z.object({
    id: z.string().min(1),
    orderIndex: z.number().int().min(0),
  })),
});

export type CreateRoundInput = z.infer<typeof createRoundSchema>;
export type UpdateRoundInput = z.infer<typeof updateRoundSchema>;
