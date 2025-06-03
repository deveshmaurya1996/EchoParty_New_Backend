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
      const { page, limit, type, active, sort, order } = req.query;

      const result = await RoomService.getRooms(userId, {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        type: type as string,
        active: active === 'true',
        sort: sort as string,
        order: order as 'asc' | 'desc',
      });

      res.json(result);
    } catch (error) {
      logger.error('Get rooms error:', error);
      res.status(500).json({ error: 'Failed to fetch rooms' });
    }
  };

  static getRoom = async (req: Request, res: Response): Promise<void> => {
    try {
      const { roomId } = req.params;
      const room = await RoomService.getRoomById(roomId);

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
      const { roomId } = req.params;
      const userId = authReq.user!._id.toString();
  
      const room = await RoomService.joinRoom(roomId, userId);
  
      if (!room) {
        res.status(404).json({ error: 'Room not found' });
        return;
      }
  
      // Send notification to room owner
      const ownerId = typeof room.owner === 'object' ? room.owner._id.toString() : room.owner;
      
      if (ownerId !== userId) {
        await NotificationService.createNotification(
          ownerId,
          'room_update',
          'New participant joined',
          `${authReq.user!.name} joined your room "${room.name}"`,
          { roomId, userId }
        );
      }
  
      res.json({ room });
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
  
      if (room.owner._id.toString() !== userId) {
        res.status(403).json({ error: 'Only room owner can update room' });
        return;
      }
  
      // Use the service to update the room
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

  static deleteRoom = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const { roomId } = req.params;
      const userId = authReq.user!._id.toString();

      const room = await RoomService.getRoomById(roomId);

      if (!room) {
        res.status(404).json({ error: 'Room not found' });
        return;
      }

      if (room.owner.toString() !== userId) {
        res.status(403).json({ error: 'Only room owner can delete room' });
        return;
      }

      await RoomService.deleteRoom(roomId);

      res.json({ message: 'Room deleted successfully' });
    } catch (error) {
      logger.error('Delete room error:', error);
      res.status(500).json({ error: 'Failed to delete room' });
    }
  };
}