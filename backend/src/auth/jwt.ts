import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Signs a JWT access token.
 */
export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    issuer: 'acm-competition-platform',
    audience: 'acm-participants',
  });
}

/**
 * Signs a JWT refresh token.
 */
export function signRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.REFRESH_TOKEN_SECRET, {
    expiresIn: env.REFRESH_TOKEN_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    issuer: 'acm-competition-platform',
    audience: 'acm-participants',
  });
}

/**
 * Creates both access and refresh tokens.
 */
export function createTokenPair(payload: JwtPayload): TokenPair {
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

/**
 * Verifies and decodes an access token.
 */
export function verifyAccessToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      issuer: 'acm-competition-platform',
      audience: 'acm-participants',
    }) as JwtPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token has expired. Please log in again.');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token. Please log in again.');
    }
    throw error;
  }
}

/**
 * Verifies and decodes a refresh token.
 */
export function verifyRefreshToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, env.REFRESH_TOKEN_SECRET, {
      issuer: 'acm-competition-platform',
      audience: 'acm-participants',
    }) as JwtPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Refresh token has expired. Please log in again.');
    }
    throw new Error('Invalid refresh token.');
  }
}
