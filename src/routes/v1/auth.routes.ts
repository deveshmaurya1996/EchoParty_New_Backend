import { Router } from 'express';
import { AuthController } from '../../controllers/auth.controller';
import { 
  authenticateJWT, 
  authenticateGoogle, 
  authenticateGoogleCallback 
} from '../../middleware/auth.middleware';
import { validate, schemas } from '../../middleware/validation.middleware';

const router = Router();

// Google OAuth routes
router.get('/google', authenticateGoogle);
router.get('/google/callback', authenticateGoogleCallback, AuthController.googleCallback);

// Token routes
router.post('/refresh', validate(schemas.refreshToken), AuthController.refreshToken);

// Protected routes
router.post('/logout', authenticateJWT, AuthController.logout);
router.get('/profile', authenticateJWT, AuthController.getProfile);

export default router;