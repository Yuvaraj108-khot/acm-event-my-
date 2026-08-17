import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { otpRateLimiter } from '../middleware/rateLimit.js';
import { sendOtpSchema, verifyOtpSchema, refreshTokenSchema, completeProfileSchema, firebaseLoginSchema, registerSchema, loginSchema } from '../validators/auth.js';

export const authRouter = Router();

authRouter.post('/register', validate(registerSchema), authController.register);
authRouter.post('/login', validate(loginSchema), authController.login);
authRouter.post('/send-otp', otpRateLimiter, validate(sendOtpSchema), authController.sendOtp);
authRouter.post('/verify-otp', validate(verifyOtpSchema), authController.verifyOtp);
authRouter.post('/firebase-login', validate(firebaseLoginSchema), authController.firebaseLogin);
authRouter.post('/refresh', validate(refreshTokenSchema), authController.refreshToken);
authRouter.post('/logout', requireAuth, authController.logout);
authRouter.get('/me', requireAuth, authController.getMe);
authRouter.post('/complete-profile', requireAuth, validate(completeProfileSchema), authController.completeProfile);
