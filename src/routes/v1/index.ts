import { Router } from 'express';
import authRoutes from './auth.routes';
import roomRoutes from './room.routes';
import mediaRoutes from './media.routes';
import notificationRoutes from './notification.routes';

const router = Router();


// Mount routes

router.use('/auth', authRoutes);
router.use('/rooms', roomRoutes);
router.use('/media', mediaRoutes);
router.use('/notifications', notificationRoutes);

export default router;





