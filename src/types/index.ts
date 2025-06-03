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
  createdAt: Date;
  updatedAt: Date;
}

export interface IRoom {
  _id: Types.ObjectId;
  name: string;
  owner: Types.ObjectId | IUser;
  type: 'youtube' | 'movie';
  participants: Types.ObjectId[] | IUser[];
  currentMedia?: {
    id: string;
    title: string;
    duration?: number;
    url?: string;
  };
  playbackState: {
    isPlaying: boolean;
    currentTime: number;
    lastUpdated: Date;
  };
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

export interface AuthRequest extends Request {
  user?: IUser;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
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
  action: 'play' | 'pause' | 'seek' | 'load';
  currentTime?: number;
  mediaId?: string;
  timestamp: number;
}