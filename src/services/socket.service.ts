import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { MediaSyncData } from '../types';
import { RoomService } from './room.service';
import { logger } from '../utils/logger';


export class SocketService {
  private io: Server;
  private userSocketMap: Map<string, string> = new Map();
  private roomUserMap: Map<string, Set<string>> = new Map();

  constructor(server: HttpServer) {
    this.io = new Server(server, {
      cors: {
        origin: config.cors.origin,
        methods: ['GET', 'POST'],
      },
      pingTimeout: config.socket.pingTimeout,
      pingInterval: config.socket.pingInterval,
    });

    this.initialize();
  }

  private initialize() {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        
        if (!token) {
          return next(new Error('Authentication error'));
        }

        const decoded = jwt.verify(token, config.jwt.secret) as any;
        socket.data.userId = decoded.userId;
        
        next();
      } catch (err) {
        next(new Error('Authentication error'));
      }
    });

    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });
  }

  private handleConnection(socket: Socket) {
    const userId = socket.data.userId;
    logger.info(`User ${userId} connected with socket ${socket.id}`);
    
    this.userSocketMap.set(userId, socket.id);

    // Join room
    socket.on('join-room', async (roomId: string) => {
      try {
        const room = await RoomService.getRoomById(roomId);
        
        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        // Check if user is a participant
        const isParticipant = room.participants.some(
          (p: any) => p._id.toString() === userId
        );

        if (!isParticipant) {
          socket.emit('error', { message: 'Not authorized to join this room' });
          return;
        }

        // Leave previous rooms
        const rooms = Array.from(socket.rooms);
        rooms.forEach((r) => {
          if (r !== socket.id) {
            socket.leave(r);
            this.removeUserFromRoom(userId, r);
          }
        });

        // Join new room
        socket.join(roomId);
        this.addUserToRoom(userId, roomId);

        // Notify others
        socket.to(roomId).emit('user-joined', {
          userId,
          roomId,
          participants: Array.from(this.roomUserMap.get(roomId) || []),
        });

        // Send current room state
        socket.emit('room-state', {
          room,
          participants: Array.from(this.roomUserMap.get(roomId) || []),
        });

        logger.info(`User ${userId} joined room ${roomId}`);
      } catch (error) {
        logger.error('Error joining room:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // Media sync events
    socket.on('media-sync', async (data: MediaSyncData) => {
      try {
        const { roomId, action, currentTime, mediaId } = data;
        
        // Update room state in database
        if (action === 'play' || action === 'pause') {
          await RoomService.updatePlaybackState(roomId, {
            isPlaying: action === 'play',
            currentTime: currentTime || 0,
          });
        } else if (action === 'seek') {
          await RoomService.updatePlaybackState(roomId, {
            currentTime: currentTime || 0,
          });
        } else if (action === 'load' && mediaId) {
          // Handle media loading based on room type
          const room = await RoomService.getRoomById(roomId);
          if (room) {
            // Update current media
            await RoomService.updateRoomMedia(roomId, {
              id: mediaId,
              // Additional media info can be fetched here
            });
          }
        }

        // Broadcast to all users in the room except sender
        socket.to(roomId).emit('media-sync', {
          ...data,
          userId,
          timestamp: Date.now(),
        });

        logger.info(`Media sync event: ${action} in room ${roomId} by user ${userId}`);
      } catch (error) {
        logger.error('Error in media sync:', error);
        socket.emit('error', { message: 'Failed to sync media' });
      }
    });

    // Chat messages (for future implementation)
    socket.on('chat-message', (roomId: string, message: string) => {
      socket.to(roomId).emit('chat-message', {
        userId,
        message,
        timestamp: Date.now(),
      });
    });

    // Leave room
    socket.on('leave-room', (roomId: string) => {
      socket.leave(roomId);
      this.removeUserFromRoom(userId, roomId);
      
      socket.to(roomId).emit('user-left', {
        userId,
        roomId,
        participants: Array.from(this.roomUserMap.get(roomId) || []),
      });

      logger.info(`User ${userId} left room ${roomId}`);
    });

    // Disconnect
    socket.on('disconnect', () => {
      this.userSocketMap.delete(userId);
      
      // Remove user from all rooms
      const rooms = Array.from(socket.rooms);
      rooms.forEach((roomId) => {
        if (roomId !== socket.id) {
          this.removeUserFromRoom(userId, roomId);
          socket.to(roomId).emit('user-left', {
            userId,
            roomId,
            participants: Array.from(this.roomUserMap.get(roomId) || []),
          });
        }
      });

      logger.info(`User ${userId} disconnected`);
    });
  }

  private addUserToRoom(userId: string, roomId: string) {
    if (!this.roomUserMap.has(roomId)) {
      this.roomUserMap.set(roomId, new Set());
    }
    this.roomUserMap.get(roomId)!.add(userId);
  }

  private removeUserFromRoom(userId: string, roomId: string) {
    if (this.roomUserMap.has(roomId)) {
      this.roomUserMap.get(roomId)!.delete(userId);
      
      if (this.roomUserMap.get(roomId)!.size === 0) {
        this.roomUserMap.delete(roomId);
      }
    }
  }

  public getIO(): Server {
    return this.io;
  }
}