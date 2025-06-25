import { Router } from 'express';
import { AuthController } from '../../controllers/auth.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { body } from 'express-validator';

const router = Router();

// Google Sign In
router.post(
  '/google/signin',
  validate([
    body('idToken').notEmpty().withMessage('ID token is required'),
  ]),
  AuthController.googleSignIn
);

// Refresh token
router.post(
  '/refresh',
  validate([
    body('refreshToken').notEmpty().withMessage('Refresh token is required'),
  ]),
  AuthController.refreshToken
);

// Get profile
router.get('/profile', authMiddleware, AuthController.getProfile);

// Get Drive auth URL
router.get('/drive/auth-url', authMiddleware, AuthController.getDriveAuthUrl);

// Handle Drive auth callback
router.get('/drive/callback', authMiddleware, AuthController.handleDriveCallback);

// Update Drive access
router.post(
  '/drive/access',
  authMiddleware,
  validate([
    body('hasDriveAccess').isBoolean(),
  ]),
  AuthController.updateDriveAccess
);

// Grant Drive access with access token
router.post(
  '/drive/grant',
  authMiddleware,
  validate([
    body('accessToken').notEmpty().withMessage('Access token is required'),
  ]),
  AuthController.grantDriveAccess
);

export default router;