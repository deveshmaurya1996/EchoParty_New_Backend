// routes/v1/auth.routes.ts
import { Router } from 'express';
import { AuthController } from '../../controllers/auth.controller';
import { authenticateJWT } from '../../middleware/auth.middleware';
import { validate, schemas } from '../../middleware/validation.middleware';

const router = Router();

// Auth routes
router.post('/google/signin', AuthController.googleSignIn);
router.post('/refresh', validate(schemas.refreshToken), AuthController.refreshToken);
router.get('/profile', authenticateJWT, AuthController.getProfile);

export default router;