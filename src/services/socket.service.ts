import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { MediaSyncData, ChatMessage } from '../types';
import { RoomService } from './room.service';
import { logger } from '../utils/logger';

export class SocketService {
  private io: Server;
  private userSocketMap: Map<string, string> = new Map();
  private roomUserMap: Map<string, Set<string>> = new Map(); // Using room codes as keys

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

    // Join room - expects room code
    socket.on('join-room', async (roomCode: string) => {
      try {
        const room = await RoomService.getRoomByCode(roomCode);
        
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

        // Join new room using room code
        socket.join(roomCode);
        this.addUserToRoom(userId, roomCode);

        // Notify others
        socket.to(roomCode).emit('user-joined', {
          userId,
          roomCode,
          participants: Array.from(this.roomUserMap.get(roomCode) || []),
        });

        // Send current room state
        socket.emit('room-state', {
          room,
          participants: Array.from(this.roomUserMap.get(roomCode) || []),
        });

        logger.info(`User ${userId} joined room ${roomCode}`);
      } catch (error) {
        logger.error('Error joining room:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // Media sync events
    socket.on('media-sync', async (data: MediaSyncData) => {
      try {
        const { roomId: roomCode, action, currentTime, mediaId, mediaData } = data;
        
        // Get room by code first
        const room = await RoomService.getRoomByCode(roomCode);
        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        // Check if user can control media using MongoDB _id
        const canControl = await RoomService.canUserControlMedia(room._id.toString(), userId);
        
        if (!canControl) {
          socket.emit('error', { message: 'You do not have permission to control media' });
          return;
        }

        // Update room state in database using MongoDB _id
        if (action === 'play' || action === 'pause') {
          await RoomService.updatePlaybackState(room._id.toString(), {
            isPlaying: action === 'play',
            currentTime: currentTime || 0,
          });
        } else if (action === 'seek') {
          await RoomService.updatePlaybackState(room._id.toString(), {
            currentTime: currentTime || 0,
          });
        } else if (action === 'load' && mediaData) {
          // Update current media
          await RoomService.updateRoomMedia(room._id.toString(), mediaData);
        }

        // Broadcast to all users in the room except sender (using room code)
        socket.to(roomCode).emit('media-sync', {
          ...data,
          userId,
          timestamp: Date.now(),
        });

        logger.info(`Media sync event: ${action} in room ${roomCode} by user ${userId}`);
      } catch (error) {
        logger.error('Error in media sync:', error);
        socket.emit('error', { message: 'Failed to sync media' });
      }
    });

    // Chat messages
    socket.on('chat-message', async (data: ChatMessage) => {
      try {
        const { roomId: roomCode, message } = data;
        
        // Get room by code
        const room = await RoomService.getRoomByCode(roomCode);
        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        const isParticipant = room.participants.some(
          (p: any) => p._id.toString() === userId
        );

        if (!isParticipant) {
          socket.emit('error', { message: 'Not authorized to send messages' });
          return;
        }

        // Save message to database using MongoDB _id
        const savedMessage = await RoomService.addMessage(room._id.toString(), userId, message);
        
        if (!savedMessage) {
          socket.emit('error', { message: 'Failed to save message' });
          return;
        }

        // Broadcast to all users in the room including sender (using room code)
        this.io.to(roomCode).emit('chat-message', savedMessage);

        logger.info(`Chat message in room ${roomCode} by user ${userId}`);
      } catch (error) {
        logger.error('Error in chat message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Request control permission
    socket.on('request-control', async (roomCode: string) => {
      try {
        const room = await RoomService.getRoomByCode(roomCode);
        
        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        const ownerId = typeof room.owner === 'object' ? room.owner._id.toString() : room.owner;
        
        // Notify room owner
        const ownerSocketId = this.userSocketMap.get(ownerId);
        if (ownerSocketId) {
          this.io.to(ownerSocketId).emit('control-request', {
            roomCode,
            roomId: room._id.toString(), // Include MongoDB _id for reference
            userId,
            userName: socket.data.userName,
          });
        }

        socket.emit('control-request-sent');
      } catch (error) {
        logger.error('Error requesting control:', error);
        socket.emit('error', { message: 'Failed to request control' });
      }
    });

    // Leave room - expects room code
    socket.on('leave-room', (roomCode: string) => {
      socket.leave(roomCode);
      this.removeUserFromRoom(userId, roomCode);
      
      socket.to(roomCode).emit('user-left', {
        userId,
        roomCode,
        participants: Array.from(this.roomUserMap.get(roomCode) || []),
      });

      logger.info(`User ${userId} left room ${roomCode}`);
    });

    // Get room state - expects room code
    socket.on('get-room-state', async (roomCode: string) => {
      try {
        const room = await RoomService.getRoomByCode(roomCode);
        
        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        socket.emit('room-state', {
          room,
          participants: Array.from(this.roomUserMap.get(roomCode) || []),
        });
      } catch (error) {
        logger.error('Error getting room state:', error);
        socket.emit('error', { message: 'Failed to get room state' });
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      this.userSocketMap.delete(userId);
      
      // Remove user from all rooms
      const rooms = Array.from(socket.rooms);
      rooms.forEach((roomCode) => {
        if (roomCode !== socket.id) {
          this.removeUserFromRoom(userId, roomCode);
          socket.to(roomCode).emit('user-left', {
            userId,
            roomCode,
            participants: Array.from(this.roomUserMap.get(roomCode) || []),
          });
        }
      });

      logger.info(`User ${userId} disconnected`);
    });
  }

  private addUserToRoom(userId: string, roomCode: string) {
    if (!this.roomUserMap.has(roomCode)) {
      this.roomUserMap.set(roomCode, new Set());
    }
    this.roomUserMap.get(roomCode)!.add(userId);
  }

  private removeUserFromRoom(userId: string, roomCode: string) {
    if (this.roomUserMap.has(roomCode)) {
      this.roomUserMap.get(roomCode)!.delete(userId);
      
      if (this.roomUserMap.get(roomCode)!.size === 0) {
        this.roomUserMap.delete(roomCode);
      }
    }
  }

  public getIO(): Server {
    return this.io;
  }
}