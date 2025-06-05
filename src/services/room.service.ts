import { Room } from '../models/room.model';
import { IRoom, PaginatedResponse, PaginationQuery } from '../types';
import { config } from '../config';
import { logger } from '../utils/logger';

export class RoomService {
  
  private static generateRoomId(): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      result += characters[randomIndex];
    }
    return result;
  }

  static async createRoom(
    name: string,
    type: 'youtube' | 'movie',
    ownerId: string
  ): Promise<IRoom> {
    try {
      const roomId = this.generateRoomId();
      const room = await Room.create({
        roomId,
        name,
        type,
        owner: ownerId,
        participants: [ownerId],
      });

      await room.populate('owner', 'name email avatar');
      return room;
    } catch (error) {
      logger.error('Error creating room:', error);
      throw error;
    }
  }

  static async getRooms(
    userId: string,
    query: PaginationQuery
  ): Promise<PaginatedResponse<IRoom>> {
    const page = Math.max(1, query.page || 1);
    let limit = Math.min(query.limit || config.pagination.defaultPageSize, config.pagination.maxPageSize);
    const skip = (page - 1) * limit;

    const filter: any = {};

    switch (query.roomFilterType) {
      case 'created':
        filter.owner = userId;
        break;
      case 'participated':
        filter.participants = userId;
        filter.owner = { $ne: userId };
        break;
      case 'recent':
      default:
        filter.$or = [
          { owner: userId },
          { participants: userId }
        ];
        limit = limit;
        break;
    }

    logger.info('Fetching rooms with filter:', { filter, userId, roomFilterType: query.roomFilterType });

    const [rooms, total] = await Promise.all([
      Room.find(filter)
        .populate('owner', 'name email avatar')
        .populate('participants', 'name email avatar')
        .sort({ createdAt: query.order === 'asc' ? 1 : -1 })
        .skip(skip)
        .limit(limit),
      Room.countDocuments(filter),
    ]);

    logger.info('Found rooms:', { count: rooms.length, total, roomFilterType: query.roomFilterType });

    return {
      data: rooms,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  static async getRoomById(roomId: string): Promise<IRoom | null> {
    return Room.findById(roomId)
      .populate('owner', 'name email avatar')
      .populate('participants', 'name email avatar');
  }

  static async joinRoom(roomId: string, userId: string): Promise<IRoom | null> {
    const room = await Room.findByIdAndUpdate(
      roomId,
      { $addToSet: { participants: userId } },
      { new: true }
    )
      .populate('owner', 'name email avatar')
      .populate('participants', 'name email avatar');

    return room;
  }

  static async leaveRoom(roomId: string, userId: string): Promise<IRoom | null> {
    const room = await Room.findByIdAndUpdate(
      roomId,
      { $pull: { participants: userId } },
      { new: true }
    )
      .populate('owner', 'name email avatar')
      .populate('participants', 'name email avatar');

    return room;
  }

  static async updateRoom(
    roomId: string,
    updates: { name?: string; isActive?: boolean }
  ): Promise<IRoom | null> {
    return Room.findByIdAndUpdate(
      roomId,
      updates,
      { new: true }
    )
      .populate('owner', 'name email avatar')
      .populate('participants', 'name email avatar');
  }

  static async updateRoomMedia(
    roomId: string,
    mediaData: any
  ): Promise<IRoom | null> {
    return Room.findByIdAndUpdate(
      roomId,
      {
        currentMedia: mediaData,
        'playbackState.lastUpdated': new Date(),
      },
      { new: true }
    )
      .populate('owner', 'name email avatar')
      .populate('participants', 'name email avatar');
  }

  static async updatePlaybackState(
    roomId: string,
    playbackState: any
  ): Promise<IRoom | null> {
    return Room.findByIdAndUpdate(
      roomId,
      {
        playbackState: {
          ...playbackState,
          lastUpdated: new Date(),
        },
      },
      { new: true }
    );
  }

  static async deleteRoom(roomId: string): Promise<void> {
    await Room.findByIdAndDelete(roomId);
  }
}