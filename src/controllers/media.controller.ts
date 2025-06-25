// controllers/media.controller.ts
import { Request, Response } from 'express';
import { AuthRequest } from '../types';
import { MediaService } from '../services/media.service';
import { logger } from '../utils/logger';
import { User } from '../models/user.model';

export class MediaController {
  static searchYouTube = async (req: Request, res: Response): Promise<void> => {
    try {
      const { q } = req.query;

      if (!q) {
        res.status(400).json({ error: 'Search query required' });
        return;
      }

      const videos = await MediaService.searchYouTube(q as string);
      res.json({ videos });
    } catch (error) {
      logger.error('YouTube search error:', error);
      res.status(500).json({ error: 'Failed to search YouTube videos' });
    }
  };

  static getYouTubeVideo = async (req: Request, res: Response): Promise<void> => {
    try {
      const { videoId } = req.params;
      const video = await MediaService.getYouTubeVideo(videoId);
      res.json({ video });
    } catch (error) {
      logger.error('YouTube video fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch YouTube video' });
    }
  };

  static getDriveVideos = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      
      // Get the user from database to ensure we have the latest data
      const user = await User.findById(authReq.user!._id);
      
      if (!user) {
        res.status(401).json({ error: 'User not found' });
        return;
      }

      // Check if user has connected Google Drive
      if (!user.refreshToken) {
        res.status(403).json({ 
          error: 'Google Drive not connected. Please connect your Google account.',
          needAuth: true 
        });
        return;
      }

      // Check if drive access is granted
      if (!user.driveAccess) {
        res.status(403).json({ 
          error: 'Drive access not granted. Please re-authorize with proper permissions.',
          needAuth: true 
        });
        return;
      }

      const videos = await MediaService.getDriveVideos(user.refreshToken);
      res.json({ videos, needAuth: false });
    } catch (error: any) {
      logger.error('Get drive videos error:', error);
      
      if (error.message.includes('insufficient authentication scopes')) {
        res.status(403).json({ 
          error: 'Insufficient permissions. Please re-authenticate with Drive access',
          needAuth: true 
        });
        return;
      }

      if (error.message.includes('invalid_grant') || error.response?.status === 401) {
        // Token expired or revoked
        res.status(403).json({ 
          error: 'Google authorization expired. Please reconnect your Google account.',
          needAuth: true 
        });
        return;
      }
      
      res.status(500).json({ error: 'Failed to fetch drive videos' });
    }
  };

  static getDriveVideoStream = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const { fileId } = req.params;
      
      // Get the user from database
      const user = await User.findById(authReq.user!._id);
      
      if (!user) {
        res.status(401).json({ error: 'User not found' });
        return;
      }

      if (!user.refreshToken || !user.driveAccess) {
        res.status(403).json({ 
          error: 'Drive access not granted',
          needAuth: true 
        });
        return;
      }

      const streamUrl = await MediaService.getDriveVideoStreamUrl(user.refreshToken, fileId);
      res.json({ streamUrl });
    } catch (error) {
      logger.error('Get drive video stream error:', error);
      res.status(500).json({ error: 'Failed to get video stream' });
    }
  };
}