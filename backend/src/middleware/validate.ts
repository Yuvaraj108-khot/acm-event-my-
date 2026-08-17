import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

type Target = 'body' | 'query' | 'params';

/**
 * Zod validation middleware factory.
 * Usage: router.post('/endpoint', validate(MySchema), handler)
 */
export function validate(schema: ZodSchema, target: Target = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      console.warn(`[VALIDATION WARNING] Request validation failed on target "${target}":`, JSON.stringify(result.error.flatten().fieldErrors));
      const errors = result.error.flatten();
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.fieldErrors,
      });
      return;
    }
    // Replace the target with the parsed (coerced/transformed) data
    (req as any)[target] = result.data;
    next();
  };
}
