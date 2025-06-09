import { Router } from 'express';
import { NotificationController } from '../../controllers/notification.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { query, param } from 'express-validator';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get notifications
router.get(
  '/',
  validate([
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('read').optional().isBoolean(),
    query('type').optional().isIn(['room_invite', 'room_update', 'system']),
  ]),
  NotificationController.getNotifications
);

// Mark notification as read
router.patch(
  '/:notificationId/read',
  validate([
    param('notificationId').isMongoId(),
  ]),
  NotificationController.markAsRead
);

// Mark all notifications as read
router.patch(
  '/read-all',
  NotificationController.markAllAsRead
);

// Delete notification
router.delete(
  '/:notificationId',
  validate([
    param('notificationId').isMongoId(),
  ]),
  NotificationController.deleteNotification
);

// Get unread count
router.get('/unread-count', NotificationController.getUnreadCount);

export default router;