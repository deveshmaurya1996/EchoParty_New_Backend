import { Request, Response } from 'express';
import { AuthRequest } from '../types';
import { NotificationService } from '../services/notification.service';
import { logger } from '../utils/logger';

export class NotificationController {
  static getNotifications = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user!._id.toString();
      const { page, limit, unreadOnly } = req.query;

      const result = await NotificationService.getNotifications(userId, {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        unreadOnly: unreadOnly === 'true',
      });

      res.json(result);
    } catch (error) {
      logger.error('Get notifications error:', error);
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  };

  static markAsRead = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const { notificationId } = req.params;
      const userId = authReq.user!._id.toString();

      const notification = await NotificationService.markAsRead(notificationId, userId);

      if (!notification) {
        res.status(404).json({ error: 'Notification not found' });
        return;
      }

      res.json({ notification });
    } catch (error) {
      logger.error('Mark as read error:', error);
      res.status(500).json({ error: 'Failed to mark notification as read' });
    }
  };

  static markAllAsRead = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user!._id.toString();
      await NotificationService.markAllAsRead(userId);
      
      res.json({ message: 'All notifications marked as read' });
    } catch (error) {
      logger.error('Mark all as read error:', error);
      res.status(500).json({ error: 'Failed to mark all as read' });
    }
  };

  static deleteNotification = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const { notificationId } = req.params;
      const userId = authReq.user!._id.toString();

      await NotificationService.deleteNotification(notificationId, userId);
      res.json({ message: 'Notification deleted' });
    } catch (error) {
      logger.error('Delete notification error:', error);
      res.status(500).json({ error: 'Failed to delete notification' });
    }
  };
}