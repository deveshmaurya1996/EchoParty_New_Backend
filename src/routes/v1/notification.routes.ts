import { Router } from 'express';
import { NotificationController } from '../../controllers/notification.controller';
import { authenticateJWT } from '../../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticateJWT);

router.get('/', NotificationController.getNotifications);
router.put('/:notificationId/read', NotificationController.markAsRead);
router.put('/read-all', NotificationController.markAllAsRead);
router.delete('/:notificationId', NotificationController.deleteNotification);

export default router;