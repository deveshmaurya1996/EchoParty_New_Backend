import { Request, Response } from 'express';
import { AuthRequest } from '../types';
import { RoomService } from '../services/room.service';
import { NotificationService } from '../services/notification.service';
import { logger } from '../utils/logger';

export class RoomController {
  static createRoom = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const { name, type } = req.body;
      const userId = authReq.user!._id.toString();

      if (!['youtube', 'movie', 'music', 'other'].includes(type)) {
        res.status(400).json({ error: 'Invalid room type' });
        return;
      }

      const room = await RoomService.createRoom(name, type, userId);
      res.status(201).json({ room });
    } catch (error) {
      logger.error('Create room error:', error);
      res.status(500).json({ error: 'Failed to create room' });
    }
  };

  static getRooms = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user!._id.toString();
      const { page, limit, type, active, sort, order, roomFilterType } = req.query;
      
      const result = await RoomService.getRooms(userId, {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        type: type as string,
        active: active === 'true',
        sort: sort as string,
        order: order as 'asc' | 'desc',
        roomFilterType: roomFilterType as 'recent' | 'created' | 'participated'
      });

      res.json(result);
    } catch (error) {
      logger.error('Get rooms error:', error);
      res.status(500).json({ error: 'Failed to fetch rooms' });
    }
  };

  static getRoom = async (req: Request, res: Response): Promise<void> => {
    try {
      const { roomCode } = req.params;
      const room = await RoomService.getRoomByCode(roomCode);

      if (!room) {
        res.status(404).json({ error: 'Room not found' });
        return;
      }

      res.json({ room });
    } catch (error) {
      logger.error('Get room error:', error);
      res.status(500).json({ error: 'Failed to fetch room' });
    }
  };

  static joinRoom = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const { roomCode } = req.params;
      const userId = authReq.user!._id.toString();

      const result = await RoomService.joinRoom(roomCode, userId);

      if (!result.room) {
        res.status(404).json({ error: result.message });
        return;
      }

      // Send notification to room owner
      const ownerId = typeof result.room.owner === 'object' ? result.room.owner._id.toString() : result.room.owner;
      
      if (ownerId !== userId) {
        await NotificationService.createNotification(
          ownerId,
          'room_update',
          'New participant joined',
          `Someone joined your room "${result.room.name}"`,
          { roomId: result.room._id.toString(), userId }
        );
      }

      res.json(result);
    } catch (error) {
      logger.error('Join room error:', error);
      res.status(500).json({ error: 'Failed to join room' });
    }
  };

  static leaveRoom = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const { roomId } = req.params;
      const userId = authReq.user!._id.toString();

      const room = await RoomService.leaveRoom(roomId, userId);

      if (!room) {
        res.status(404).json({ error: 'Room not found' });
        return;
      }

      res.json({ message: 'Left room successfully' });
    } catch (error) {
      logger.error('Leave room error:', error);
      res.status(500).json({ error: 'Failed to leave room' });
    }
  };

  static updateRoom = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const { roomId } = req.params;
      const { name, isActive } = req.body;
      const userId = authReq.user!._id.toString();

      const room = await RoomService.getRoomById(roomId);

      if (!room) {
        res.status(404).json({ error: 'Room not found' });
        return;
      }

      const ownerId = typeof room.owner === 'object' ? room.owner._id.toString() : room.owner;
      
      if (ownerId !== userId) {
        res.status(403).json({ error: 'Only room owner can update room' });
        return;
      }

      const updatedRoom = await RoomService.updateRoom(roomId, {
        name: name || room.name,
        isActive: isActive !== undefined ? isActive : room.isActive,
      });

      res.json({ room: updatedRoom });
    } catch (error) {
      logger.error('Update room error:', error);
      res.status(500).json({ error: 'Failed to update room' });
    }
  };

  static updateRoomPermissions = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const { roomId } = req.params;
      const { allowParticipantControl, allowedControllers } = req.body;
      const userId = authReq.user!._id.toString();

      const room = await RoomService.getRoomById(roomId);

      if (!room) {
        res.status(404).json({ error: 'Room not found' });
        return;
      }

      const ownerId = typeof room.owner === 'object' ? room.owner._id.toString() : room.owner;
      
      if (ownerId !== userId) {
        res.status(403).json({ error: 'Only room owner can update permissions' });
        return;
      }

      const updatedRoom = await RoomService.updateRoomPermissions(roomId, {
        allowParticipantControl,
        allowedControllers,
      });

      res.json({ room: updatedRoom });
    } catch (error) {
      logger.error('Update room permissions error:', error);
      res.status(500).json({ error: 'Failed to update room permissions' });
    }
  };

  static getRoomMessages = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const { roomId } = req.params;
      const { limit = 50, before } = req.query;
      const userId = authReq.user!._id.toString();
      
      // Verify user is participant
      const room = await RoomService.getRoomById(roomId);
      if (!room) {
        res.status(404).json({ error: 'Room not found' });
        return;
      }

      const isParticipant = room.participants.some(
        (p: any) => p._id?.toString() === userId || p === userId
      );

      if (!isParticipant) {
        res.status(403).json({ error: 'Not authorized to view messages' });
        return;
      }
      
      const messages = await RoomService.getRoomMessages(
        roomId,
        parseInt(limit as string),
        before as string
      );

      res.json({ messages });
    } catch (error) {
      logger.error('Get room messages error:', error);
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  };

  static deleteRoom = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const { roomId } = req.params;
      const userId = authReq.user!._id.toString();
      
      // Use a single atomic operation
      const deletedRoom = await RoomService.deleteRoomIfOwner(roomId, userId);
      
      if (!deletedRoom) {
        res.status(404).json({ error: 'Room not found or you are not the owner' });
        return;
      }
      
      res.json({ message: 'Room deleted successfully' });
    } catch (error) {
      logger.error('Delete room error:', error);
      res.status(500).json({ error: 'Failed to delete room' });
    }
  };

  static removeParticipant = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const { roomId, participantId } = req.params;
      const userId = authReq.user!._id.toString();

      const room = await RoomService.removeParticipant(roomId, userId, participantId);

      if (!room) {
        res.status(404).json({ error: 'Room not found' });
        return;
      }

      // Notify removed participant
      await NotificationService.createNotification(
        participantId,
        'room_update',
        'Removed from room',
        `You have been removed from room "${room.name}"`,
        { roomId }
      );

      res.json({ room, message: 'Participant removed successfully' });
    } catch (error: any) {
      logger.error('Remove participant error:', error);
      if (error.message.includes('Only room owner')) {
        res.status(403).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to remove participant' });
      }
    }
  };

  static getRoomStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const { roomCode } = req.params;
      const userId = authReq.user!._id.toString();

      const room = await RoomService.getRoomByCode(roomCode);
      if (!room) {
        res.status(404).json({ error: 'Room not found' });
        return;
      }

      // Check if user is participant or owner
      const ownerId = typeof room.owner === 'object' ? room.owner._id.toString() : room.owner;
      const isParticipant = room.participants.some(
        (p: any) => p._id?.toString() === userId || p === userId
      );

      if (ownerId !== userId && !isParticipant) {
        res.status(403).json({ error: 'Not authorized to view room stats' });
        return;
      }

      const stats = await RoomService.getRoomStats(room._id.toString());
      res.json({ stats });
    } catch (error) {
      logger.error('Get room stats error:', error);
      res.status(500).json({ error: 'Failed to get room stats' });
    }
  };

  static searchRooms = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const { q } = req.query;
      const userId = authReq.user!._id.toString();

      if (!q || typeof q !== 'string') {
        res.status(400).json({ error: 'Search query is required' });
        return;
      }

      const rooms = await RoomService.searchRooms(q, userId);
      res.json({ rooms });
    } catch (error) {
      logger.error('Search rooms error:', error);
      res.status(500).json({ error: 'Failed to search rooms' });
    }
  };

  static grantControlPermission = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const { roomId } = req.params;
      const { participantId, grant } = req.body;
      const userId = authReq.user!._id.toString();

      const room = await RoomService.getRoomById(roomId);

      if (!room) {
        res.status(404).json({ error: 'Room not found' });
        return;
      }

      const ownerId = typeof room.owner === 'object' ? room.owner._id.toString() : room.owner;
      
      if (ownerId !== userId) {
        res.status(403).json({ error: 'Only room owner can grant control permissions' });
        return;
      }

      let updatedControllers = room.permissions.allowedControllers.map(
        (c: any) => typeof c === 'object' ? c._id.toString() : c
      );

      if (grant) {
        if (!updatedControllers.includes(participantId)) {
          updatedControllers.push(participantId);
        }
      } else {
        updatedControllers = updatedControllers.filter((id: string) => id !== participantId);
      }

      const updatedRoom = await RoomService.updateRoomPermissions(roomId, {
        allowedControllers: updatedControllers,
      });

      // Notify participant
      await NotificationService.createNotification(
        participantId,
        'room_update',
        grant ? 'Control permission granted' : 'Control permission revoked',
        `You ${grant ? 'now have' : 'no longer have'} control permission in room "${room.name}"`,
        { roomId }
      );

      res.json({ room: updatedRoom });
    } catch (error) {
      logger.error('Grant control permission error:', error);
      res.status(500).json({ error: 'Failed to update control permissions' });
    }
  };
}