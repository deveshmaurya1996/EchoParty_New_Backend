import { Request, Response } from 'express';
import { AuthRequest } from '../types';
import { MediaService } from '../services/media.service';
import { logger } from '../utils/logger';

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
      
      if (!authReq.user!.driveAccess) {
        res.status(403).json({ 
          error: 'Drive access not granted',
          needAuth: true 
        });
        return;
      }

      const userToken = authReq.user!.refreshToken;
      if (!userToken) {
        res.status(401).json({ error: 'No authentication token found' });
        return;
      }

      const videos = await MediaService.getDriveVideos(userToken);
      res.json({ videos });
    } catch (error: any) {
      logger.error('Get drive videos error:', error);
      
      if (error.message.includes('insufficient authentication scopes')) {
        res.status(403).json({ 
          error: 'Insufficient permissions. Please re-authenticate with Drive access',
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
      
      if (!authReq.user!.driveAccess) {
        res.status(403).json({ error: 'Drive access not granted' });
        return;
      }

      const userToken = authReq.user!.refreshToken;
      if (!userToken) {
        res.status(401).json({ error: 'No authentication token found' });
        return;
      }

      const streamUrl = await MediaService.getDriveVideoStreamUrl(userToken, fileId);
      res.json({ streamUrl });
    } catch (error) {
      logger.error('Get drive video stream error:', error);
      res.status(500).json({ error: 'Failed to get video stream' });
    }
  };
}