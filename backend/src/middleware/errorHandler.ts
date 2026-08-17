import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';

interface ApiError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

/**
 * Global error handler — must be the last middleware registered.
 */
export function errorHandler(
  err: ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode || 500;
  const isProduction = env.NODE_ENV === 'production';

  // Log all errors
  if (statusCode >= 500) {
    console.error(`[ERROR] ${req.method} ${req.path}:`, err);
  }

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(isProduction ? {} : { stack: err.stack }),
  });
}

/**
 * Creates an operational HTTP error.
 */
export function createError(message: string, statusCode: number = 500): ApiError {
  const error: ApiError = new Error(message);
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
}

export function notFound(message = 'Resource not found'): ApiError {
  return createError(message, 404);
}

export function forbidden(message = 'Access denied'): ApiError {
  return createError(message, 403);
}

export function badRequest(message = 'Bad request'): ApiError {
  return createError(message, 400);
}

export function unauthorized(message = 'Unauthorized'): ApiError {
  return createError(message, 401);
}
