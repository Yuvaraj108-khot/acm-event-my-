import { z } from 'zod';

// Flexible date string: accepts any parseable date format from the frontend
const dateString = z.string().refine((val) => !isNaN(Date.parse(val)), {
  message: 'Invalid date format',
});

export const createCompetitionSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10),
  shortDescription: z.string().max(500).optional().nullable(),
  bannerUrl: z.string().url().optional().nullable(),
  maxParticipants: z.coerce.number().int().positive().optional().nullable(),
  registrationStartsAt: dateString.optional().nullable(),
  registrationEndsAt: dateString.optional().nullable(),
  startsAt: dateString.optional().nullable(),
  endsAt: dateString.optional().nullable(),
  isPublic: z.boolean().default(false),
});

export const updateCompetitionSchema = createCompetitionSchema.partial().extend({
  status: z.enum(['draft', 'published', 'active', 'completed', 'cancelled']).optional(),
});

export const competitionQuerySchema = z.object({
  status: z.enum(['draft', 'published', 'active', 'completed', 'cancelled']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
});

export type CreateCompetitionInput = z.infer<typeof createCompetitionSchema>;
export type UpdateCompetitionInput = z.infer<typeof updateCompetitionSchema>;

