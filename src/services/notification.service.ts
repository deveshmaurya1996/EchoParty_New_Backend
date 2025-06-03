import { Notification } from '../models/notification.model';
import { INotification, PaginatedResponse, PaginationQuery } from '../types';
import { config } from '../config';

export class NotificationService {
  static async createNotification(
    userId: string,
    type: 'room_invite' | 'room_update' | 'system',
    title: string,
    message: string,
    data?: any
  ): Promise<INotification> {
    return Notification.create({
      user: userId,
      type,
      title,
      message,
      data,
    });
  }

  static async getNotifications(
    userId: string,
    query: PaginationQuery & { unreadOnly?: boolean }
  ): Promise<PaginatedResponse<INotification>> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(
      query.limit || config.pagination.defaultPageSize,
      config.pagination.maxPageSize
    );
    const skip = (page - 1) * limit;

    const filter: any = { user: userId };
    if (query.unreadOnly) {
      filter.read = false;
    }

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

  static async markAllAsRead(userId: string): Promise<void> {
    await Notification.updateMany(
      { user: userId, read: false },
      { read: true }
    );
  }

  static async deleteNotification(notificationId: string, userId: string): Promise<void> {
    await Notification.findOneAndDelete({ _id: notificationId, user: userId });
  }
}