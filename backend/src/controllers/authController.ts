import { Request, Response } from 'express';
import * as authService from '../services/authService.js';
import { success } from '../utils/helpers.js';

export async function register(req: Request, res: Response) {
  const { email, password } = req.body;
  const result = await authService.registerUser(email, password);
  res.json(success(result, 'Registration successful'));
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  const result = await authService.loginUser(email, password);
  res.json(success(result, 'Login successful'));
}

export async function sendOtp(req: Request, res: Response) {
  const { email } = req.body;
  await authService.sendOtp(email);
  res.json(success(null, 'OTP sent successfully. Check your email or server console in dev mode.'));
}

export async function verifyOtp(req: Request, res: Response) {
  const { email, otp } = req.body;
  const result = await authService.verifyOtpAndLogin(email, otp);
  res.json(success(result, 'Login successful'));
}

export async function refreshToken(req: Request, res: Response) {
  const { refreshToken } = req.body;
  const result = await authService.refreshAccessToken(refreshToken);
  res.json(success(result, 'Token refreshed'));
}

export async function getMe(req: Request, res: Response) {
  const result = await authService.getMe(req.user!.userId);
  res.json(success(result));
}

export async function completeProfile(req: Request, res: Response) {
  const profile = await authService.completeProfile(req.user!.userId, req.body);
  res.json(success(profile, 'Profile completed successfully'));
}

export async function firebaseLogin(req: Request, res: Response) {
  const { idToken } = req.body;
  const result = await authService.verifyFirebaseTokenAndLogin(idToken);
  res.json(success(result, 'Login successful'));
}

export async function logout(_req: Request, res: Response) {
  // JWT is stateless; client should discard tokens
  res.json(success(null, 'Logged out successfully'));
}
