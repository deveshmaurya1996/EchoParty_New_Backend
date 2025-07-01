import { Request } from 'express';
import { Types } from 'mongoose';

export interface AuthUser {
  _id: Types.ObjectId;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export interface IUser {
  _id: Types.ObjectId;
  googleId: string;
  email: string;
  name: string;
  avatar?: string;
  refreshToken?: string;
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

export interface CloudflareVideo {
  id: string;
  key: string;
  name: string;
  size: number;
  contentType: string;
  uploadedAt: string;
  duration?: number;
  streamUrl?: string;
}

export interface IVideo {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  videoId: string;
  telegramFileId: string;
  telegramMessageId: string;
  originalName: string;
  fileName: string;
  r2Key: string;
  streamUrl?: string;
  thumbnailUrl?: string;
  size: number;
  contentType: string;
  encodingStatus: 'processing' | 'completed' | 'failed';
  encodingProgress: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface VideoResponse {
  id: string;
  videoId: string;
  telegramFileId: string;
  originalName: string;
  fileName: string;
  streamUrl: string;
  size: number;
  contentType: string;
  createdAt: string;
  updatedAt: string;
}

export interface VideoUploadResponse {
  videoId: string;
  originalName: string;
  streamUrl: string;
  uploadedAt: string;
  isMultipart: boolean;
  totalParts: number;
}

export interface UserVideo {
  id: string;
  videoId: string;
  originalName: string;
  fileName: string;
  streamUrl: string;
  size: number;
  createdAt: string;
  uploadedAt: string;
}