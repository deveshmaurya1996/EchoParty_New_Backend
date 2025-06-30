// controllers/media.controller.ts
import { Request, Response } from 'express';
import { AuthRequest } from '../types';
import { MediaService } from '../services/media.service.js';
import { TelegramService } from '../services/telegram.service.js';
import { logger } from '../utils/logger.js';
import axios from 'axios';
import { config } from '../config/index.js';

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

  // User video upload endpoint
  static async uploadVideo(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No video file provided' });
      }

      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const result = await MediaService.uploadVideo(
        userId,
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );

      res.status(201).json(result);
    } catch (error: any) {
      logger.error('Upload video error:', error);
      res.status(500).json({ error: error.message || 'Failed to upload video' });
    }
  }

  // Get user's videos
  static async getUserVideos(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const videos = await MediaService.getUserVideos(userId);
      res.json(videos);
    } catch (error: any) {
      logger.error('Get user videos error:', error);
      res.status(500).json({ error: error.message || 'Failed to get user videos' });
    }
  }

  // Get specific video by ID
  static async getVideo(req: Request, res: Response) {
    try {
      const { videoId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const video = await MediaService.getVideo(videoId);
      if (!video) {
        return res.status(404).json({ error: 'Video not found' });
      }

      res.json(video);
    } catch (error: any) {
      logger.error('Get video error:', error);
      res.status(500).json({ error: error.message || 'Failed to get video' });
    }
  }

  // Delete video
  static async deleteVideo(req: Request, res: Response) {
    try {
      const { videoId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      await MediaService.deleteVideo(userId, videoId);
      res.status(204).send();
    } catch (error: any) {
      logger.error('Delete video error:', error);
      res.status(500).json({ error: error.message || 'Failed to delete video' });
    }
  }

  // Refresh stream URL
  static async refreshStreamUrl(req: Request, res: Response) {
    try {
      const { videoId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const streamUrl = await MediaService.refreshStreamUrl(userId, videoId);
      res.json({ streamUrl });
    } catch (error: any) {
      logger.error('Refresh stream URL error:', error);
      res.status(500).json({ error: error.message || 'Failed to refresh stream URL' });
    }
  }

  // Stream video
  static async streamVideo(req: Request, res: Response) {
    try {
      const { fileId } = req.params;
      const response = await TelegramService.getChannelMessages();
      const message = response.find(msg => msg.video.file_id === fileId);

      if (!message) {
        return res.status(404).json({ error: 'Video not found' });
      }

      // Get file info from Telegram
      const fileInfo = await axios.get(
        `${config.telegram.apiBaseUrl}/bot${config.telegram.botToken}/getFile?file_id=${fileId}`
      );

      if (!fileInfo.data.ok) {
        return res.status(404).json({ error: 'Video file not found' });
      }

      const filePath = fileInfo.data.result.file_path;
      const streamUrl = `${config.telegram.apiBaseUrl}/file/bot${config.telegram.botToken}/${filePath}`;

      // Proxy the video stream
      const videoStream = await axios.get(streamUrl, {
        responseType: 'stream'
      });

      // Set headers
      res.setHeader('Content-Type', message.video.mime_type);
      res.setHeader('Content-Length', message.video.file_size);
      res.setHeader('Accept-Ranges', 'bytes');

      // Pipe the video stream to response
      videoStream.data.pipe(res);
    } catch (error: any) {
      logger.error('Stream video error:', error);
      res.status(500).json({ error: error.message || 'Failed to stream video' });
    }
  }
}