/**
 * Generates a URL-friendly slug from a string.
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .substring(0, 100);
}

/**
 * Creates a paginated response object.
 */
export function paginate<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
) {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    },
  };
}

export function serializeFirestore(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj.toDate === 'function') {
    return obj.toDate();
  }

  if (Array.isArray(obj)) {
    return obj.map(serializeFirestore);
  }

  if (typeof obj === 'object') {
    if (obj instanceof Date) return obj;
    const serialized: any = {};
    for (const key of Object.keys(obj)) {
      serialized[key] = serializeFirestore(obj[key]);
    }
    return serialized;
  }

  return obj;
}

/**
 * Creates a standard API success response.
 */
export function success<T>(data: T, message?: string) {
  return { success: true, ...(message ? { message } : {}), data: serializeFirestore(data) };
}

/**
 * Calculates score for MCQ based on correct/incorrect and negative marking.
 */
export function calculateMcqScore(
  correct: boolean,
  pointsPerQuestion: number,
  negativeMarkingEnabled: boolean,
  negativeMarkingValue: number
): number {
  if (correct) return pointsPerQuestion;
  if (negativeMarkingEnabled) return -negativeMarkingValue;
  return 0;
}

/**
 * Normalizes email to lowercase.
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Safely parses an integer, returning a default if invalid.
 */
export function safeInt(val: unknown, defaultVal: number): number {
  const n = parseInt(String(val), 10);
  return isNaN(n) ? defaultVal : n;
}
