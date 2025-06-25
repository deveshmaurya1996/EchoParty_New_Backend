import { Router } from 'express';
import authRoutes from './auth.routes';
import roomRoutes from './room.routes';
import mediaRoutes from './media.routes';
import notificationRoutes from './notification.routes';
import driveRoutes from './drive.routes';

const router = Router();


// Mount routes

router.use('/auth', authRoutes);
router.use('/rooms', roomRoutes);
router.use('/media', mediaRoutes);
router.use('/notifications', notificationRoutes);
router.use('/drive', driveRoutes);

export default router;





