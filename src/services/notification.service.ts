import { Notification } from '../models/notification.model';
import { INotification, PaginatedResponse } from '../types';
import { logger } from '../utils/logger';

export class NotificationService {
  static async createNotification(
    userId: string,
    type: 'room_invite' | 'room_update' | 'system',
    title: string,
    message: string,
    data?: any
  ): Promise<INotification> {
    try {
      const notification = await Notification.create({
        user: userId,
        type,
        title,
        message,
        data,
      });

      // Here you could emit a socket event to notify the user in real-time
      // socketService.emitToUser(userId, 'new-notification', notification);

      return notification;
    } catch (error) {
      logger.error('Error creating notification:', error);
      throw error;
    }
  }

  static async getNotifications(
    userId: string,
    options: { page: number; limit: number; read?: boolean; type?: string }
  ): Promise<PaginatedResponse<INotification>> {
    const { page, limit, read, type } = options;
    const skip = (page - 1) * limit;

    const filter: any = { user: userId };
    if (read !== undefined) filter.read = read;
    if (type) filter.type = type;

    const [notifications, total] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments(filter),
    ]);

    return {
      data: notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  static async markAsRead(notificationId: string, userId: string): Promise<INotification | null> {
    return Notification.findOneAndUpdate(
      { _id: notificationId, user: userId },
      { read: true },
      { new: true }
    );
  }

  static async markAllAsRead(userId: string): Promise<number> {
    const result = await Notification.updateMany(
      { user: userId, read: false },
      { read: true }
    );
    return result.modifiedCount;
  }

  static async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    const result = await Notification.deleteOne({ _id: notificationId, user: userId });
    return result.deletedCount > 0;
  }

  static async getUnreadCount(userId: string): Promise<number> {
    return Notification.countDocuments({ user: userId, read: false });
  }
}