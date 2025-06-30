import { Request, Response } from 'express';
import { R2Service } from '../services/r2.service';
import { logger } from '../utils/logger';

export class R2Controller {
  static getVideos = async (req: Request, res: Response): Promise<void> => {
    try {
      logger.info('R2 getVideos endpoint called');
      
      const videos = await R2Service.getVideos();
      
      logger.info('Sending R2 videos response:', { count: videos.length });
      
      res.json({
        success: true,
        data: { videos }
      });
    } catch (error: any) {
      logger.error('Get R2 videos error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch videos'
      });
    }
  };

  static getVideoStream = async (req: Request, res: Response): Promise<void> => {
    try {
      const { key } = req.params;
      
      if (!key) {
        res.status(400).json({
          success: false,
          error: 'Video key is required'
        });
        return;
      }
      
      const streamUrl = await R2Service.getVideoStreamUrl(decodeURIComponent(key));
      
      res.json({
        success: true,
        data: { streamUrl }
      });
    } catch (error: any) {
      logger.error('Get video stream error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get video stream'
      });
    }
  };

  static uploadVideo = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'No video file provided'
        });
        return;
      }

      const { originalname, buffer, mimetype } = req.file;
      
      // Validate file type
      const allowedTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/webm', 'video/mkv'];
      if (!allowedTypes.includes(mimetype)) {
        res.status(400).json({
          success: false,
          error: 'Invalid file type. Only video files are allowed.'
        });
        return;
      }

      const video = await R2Service.uploadVideo(buffer, originalname, mimetype);
      
      res.json({
        success: true,
        data: { video }
      });
    } catch (error: any) {
      logger.error('Upload video error:', error);
      
      if (error.message.includes('Storage quota exceeded')) {
        res.status(413).json({
          success: false,
          error: error.message
        });
      } else if (error.message.includes('File too large')) {
        res.status(413).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: error.message || 'Failed to upload video'
        });
      }
    }
  };

  static deleteVideo = async (req: Request, res: Response): Promise<void> => {
    try {
      const { key } = req.params;
      
      if (!key) {
        res.status(400).json({
          success: false,
          error: 'Video key is required'
        });
        return;
      }
      
      await R2Service.deleteVideo(decodeURIComponent(key));
      
      res.json({
        success: true,
        message: 'Video deleted successfully'
      });
    } catch (error: any) {
      logger.error('Delete video error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete video'
      });
    }
  };

  static getStorageStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = await R2Service.getStorageStats();
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      logger.error('Get storage stats error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get storage stats'
      });
    }
  };
} 