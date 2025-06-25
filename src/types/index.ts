import { Request } from 'express';
import { Types } from 'mongoose';

export interface AuthRequest extends Request {
  user?: IUser;
}

export interface IUser {
  _id: Types.ObjectId;
  googleId: string;
  email: string;
  name: string;
  avatar?: string;
  refreshToken?: string;
  driveAccess?: boolean; // Track if user has granted drive access
  googleTokens?: any; // Store Google OAuth tokens for Drive access
  createdAt: Date;
  updatedAt: Date;
}

export interface IMessage {
  _id?: Types.ObjectId;
  userId: Types.ObjectId | IUser;
  message: string;
  timestamp: Date;
}

export interface IRoom {
  _id: Types.ObjectId;
  roomId: string;
  name: string;
  owner: Types.ObjectId | IUser;
  type: 'youtube' | 'movie' | 'music' | 'other';
  participants: Types.ObjectId[] | IUser[];
  currentMedia?: {
    id: string;
    title: string;
    duration?: number;
    url?: string;
    thumbnail?: string;
    type: string; // youtube, drive, etc.
  };
  playbackState: {
    isPlaying: boolean;
    currentTime: number;
    lastUpdated: Date;
  };
  permissions: {
    allowParticipantControl: boolean;
    allowedControllers: Types.ObjectId[] | IUser[];
  };
  messages: IMessage[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface INotification {
  _id: Types.ObjectId;
  user: Types.ObjectId | IUser;
  type: 'room_invite' | 'room_update' | 'system';
  title: string;
  message: string;
  data?: any;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  type?: string;
  active?: boolean;
  roomFilterType?: 'recent' | 'created' | 'participated';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: string;
  webViewLink?: string;
  webContentLink?: string;
  thumbnailLink?: string;
  createdTime?: string;
  modifiedTime?: string;
}

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
  channelTitle: string;
}

export interface MediaSyncData {
  roomId: string;
  action: 'play' | 'pause' | 'seek' | 'load' | 'ended';
  currentTime?: number;
  mediaId?: string;
  mediaData?: {
    id: string;
    title: string;
    url: string;
    duration?: number;
    thumbnail?: string;
    type: string;
  };
  timestamp?: number;
}

export interface ChatMessage {
  roomId: string;
  message: string;
  replyTo?: string;
}

export interface RoomPermissionUpdate {
  allowParticipantControl?: boolean;
  allowedControllers?: string[];
}