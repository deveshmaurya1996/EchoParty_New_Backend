import { Router } from 'express';
import authRoutes from './auth.routes';
import roomRoutes from './room.routes';
import mediaRoutes from './media.routes';
import notificationRoutes from './notification.routes';
import r2Routes from './r2.routes';

const router = Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/rooms', roomRoutes);
router.use('/media', mediaRoutes);
router.use('/notifications', notificationRoutes);
router.use('/r2', r2Routes);

export default router;





