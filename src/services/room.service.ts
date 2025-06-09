import { Room } from '../models/room.model';
import { IRoom, PaginatedResponse, PaginationQuery, RoomPermissionUpdate, IMessage } from '../types';
import { config } from '../config';
import { logger } from '../utils/logger';

export class RoomService {
  
  private static generateRoomCode(): string {
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
    type: 'youtube' | 'movie' | 'music' | 'other',
    ownerId: string
  ): Promise<IRoom> {
    try {
      const roomCode = this.generateRoomCode();
      const room = await Room.create({
        roomId: roomCode, // Store the room code in roomId field
        name,
        type,
        owner: ownerId,
        participants: [ownerId],
        permissions: {
          allowParticipantControl: false,
          allowedControllers: [ownerId],
        },
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
        break;
    }

    if (query.type) {
      filter.type = query.type;
    }

    if (query.active !== undefined) {
      filter.isActive = query.active;
    }

    logger.info('Fetching rooms with filter:', { filter, userId, roomFilterType: query.roomFilterType });

    const [rooms, total] = await Promise.all([
      Room.find(filter)
        .populate('owner', 'name email avatar')
        .populate('participants', 'name email avatar')
        .populate('permissions.allowedControllers', 'name email avatar')
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
    try {
      return Room.findById(roomId)
        .populate('owner', 'name email avatar')
        .populate('participants', 'name email avatar')
        .populate('permissions.allowedControllers', 'name email avatar')
        .populate('messages.userId', 'name email avatar');
    } catch (error) {
      logger.error('Error finding room:', error);
      return null;
    }
  }

  static async getRoomByCode(roomCode: string): Promise<IRoom | null> {
    try {
      return Room.findOne({ roomId: roomCode })
        .populate('owner', 'name email avatar')
        .populate('participants', 'name email avatar')
        .populate('permissions.allowedControllers', 'name email avatar')
        .populate('messages.userId', 'name email avatar');
    } catch (error) {
      logger.error('Error finding room by code:', error);
      return null;
    }
  }

  static async joinRoom(roomCode: string, userId: string): Promise<{ room: IRoom | null; message: string }> {
    try {
      const room = await Room.findOne({ roomId: roomCode })
        .populate('owner', 'name email avatar')
        .populate('participants', 'name email avatar');

      if (!room) {
        return { room: null, message: 'Room not found with the provided code' };
      }

      if (!room.isActive) {
        return { room: null, message: 'This room is currently inactive' };
      }

      // Check if user is already a participant
      const isParticipant = room.participants.some(
        (participant: any) => participant._id.toString() === userId
      );

      if (isParticipant) {
        return { room, message: 'You are already a participant in this room' };
      }

      // Add user as participant
      const updatedRoom = await Room.findOneAndUpdate(
        { roomId: roomCode },
        { $addToSet: { participants: userId } },
        { new: true }
      )
        .populate('owner', 'name email avatar')
        .populate('participants', 'name email avatar')
        .populate('permissions.allowedControllers', 'name email avatar');

      return { room: updatedRoom, message: 'Successfully joined the room' };
    } catch (error) {
      logger.error('Error in joinRoom:', error);
      return { room: null, message: 'Failed to join room. Please try again.' };
    }
  }

  static async leaveRoom(roomId: string, userId: string): Promise<IRoom | null> {
    const room = await Room.findByIdAndUpdate(
      roomId,
      { 
        $pull: { 
          participants: userId,
          'permissions.allowedControllers': userId 
        } 
      },
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

  static async updateRoomPermissions(
    roomId: string,
    permissions: RoomPermissionUpdate
  ): Promise<IRoom | null> {
    const updateData: any = {};
    
    if (permissions.allowParticipantControl !== undefined) {
      updateData['permissions.allowParticipantControl'] = permissions.allowParticipantControl;
    }
    
    if (permissions.allowedControllers) {
      updateData['permissions.allowedControllers'] = permissions.allowedControllers;
    }

    return Room.findByIdAndUpdate(
      roomId,
      updateData,
      { new: true }
    )
      .populate('owner', 'name email avatar')
      .populate('participants', 'name email avatar')
      .populate('permissions.allowedControllers', 'name email avatar');
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

  static async addMessage(
    roomId: string,
    userId: string,
    message: string
  ): Promise<IMessage | null> {
    const room = await Room.findByIdAndUpdate(
      roomId,
      {
        $push: {
          messages: {
            userId,
            message,
            timestamp: new Date(),
          },
        },
      },
      { new: true }
    );

    if (!room) return null;

    const newMessage = room.messages[room.messages.length - 1];
    
    // Populate the user info for the new message
    await room.populate('messages.userId', 'name email avatar');
    
    return room.messages.find(m => m._id?.toString() === newMessage._id?.toString()) || null;
  }

  static async getRoomMessages(
    roomId: string,
    limit: number = 50,
    before?: string
  ): Promise<IMessage[]> {
    const room = await Room.findById(roomId)
      .select('messages')
      .populate('messages.userId', 'name email avatar');

    if (!room) return [];

    let messages = room.messages;

    if (before) {
      const beforeIndex = messages.findIndex(m => m._id?.toString() === before);
      if (beforeIndex > 0) {
        messages = messages.slice(Math.max(0, beforeIndex - limit), beforeIndex);
      }
    } else {
      messages = messages.slice(-limit);
    }

    return messages;
  }

  static async deleteRoomIfOwner(roomId: string, userId: string): Promise<boolean> {
    try {
      // Atomic operation: only delete if the user is the owner
      const result = await Room.findOneAndDelete({
        _id: roomId,
        owner: userId
      });
      
      if (!result) {
        logger.warn('Room not found or user not owner:', { roomId, userId });
        return false;
      }
      
      logger.info('Room deleted successfully:', { roomId, owner: userId });
      return true;
    } catch (error) {
      logger.error('Error deleting room:', error);
      throw error;
    }
  }
  
  static async canUserControlMedia(roomId: string, userId: string): Promise<boolean> {
    const room = await this.getRoomById(roomId);
    
    if (!room) return false;

    const ownerId = typeof room.owner === 'object' ? room.owner._id.toString() : room.owner;
    
    // Owner can always control
    if (ownerId === userId) return true;

    // Check if participant control is allowed
    if (!room.permissions.allowParticipantControl) return false;

    // If participant control is allowed, all participants can control
    // Unless there's a specific allowedControllers list
    if (room.permissions.allowedControllers && room.permissions.allowedControllers.length > 0) {
      return room.permissions.allowedControllers.some((controller: any) => {
        const controllerId = typeof controller === 'object' ? controller._id.toString() : controller;
        return controllerId === userId;
      });
    }

    // If allowParticipantControl is true and no specific controllers list, all participants can control
    const isParticipant = room.participants.some((participant: any) => {
      const participantId = typeof participant === 'object' ? participant._id.toString() : participant;
      return participantId === userId;
    });

    return isParticipant;
  }

  static async removeParticipant(roomId: string, userId: string, targetUserId: string): Promise<IRoom | null> {
    try {
      // Check if user is room owner
      const room = await this.getRoomById(roomId);
      if (!room) return null;

      const ownerId = typeof room.owner === 'object' ? room.owner._id.toString() : room.owner;
      if (ownerId !== userId) {
        throw new Error('Only room owner can remove participants');
      }

      // Don't allow owner to remove themselves
      if (ownerId === targetUserId) {
        throw new Error('Owner cannot be removed from the room');
      }

      return Room.findByIdAndUpdate(
        roomId,
        { 
          $pull: { 
            participants: targetUserId,
            'permissions.allowedControllers': targetUserId 
          } 
        },
        { new: true }
      )
        .populate('owner', 'name email avatar')
        .populate('participants', 'name email avatar')
        .populate('permissions.allowedControllers', 'name email avatar');
    } catch (error) {
      logger.error('Error removing participant:', error);
      throw error;
    }
  }

  static async getRoomStats(roomId: string): Promise<any> {
    const room = await this.getRoomById(roomId);
    if (!room) return null;

    return {
      participantCount: room.participants.length,
      messageCount: room.messages.length,
      isActive: room.isActive,
      currentMedia: room.currentMedia,
      playbackState: room.playbackState,
      permissions: room.permissions,
      createdAt: room.createdAt,
      type: room.type,
    };
  }

  static async searchRooms(query: string, userId: string): Promise<IRoom[]> {
    const searchRegex = new RegExp(query, 'i');
    
    return Room.find({
      $and: [
        {
          $or: [
            { name: searchRegex },
            { roomId: searchRegex }
          ]
        },
        {
          $or: [
            { owner: userId },
            { participants: userId }
          ]
        },
        { isActive: true }
      ]
    })
      .populate('owner', 'name email avatar')
      .populate('participants', 'name email avatar')
      .limit(10)
      .sort({ createdAt: -1 });
  }

  static async updateLastActivity(roomId: string): Promise<void> {
    await Room.findByIdAndUpdate(
      roomId,
      { 
        $set: { 
          'playbackState.lastUpdated': new Date() 
        } 
      }
    );
  }
}