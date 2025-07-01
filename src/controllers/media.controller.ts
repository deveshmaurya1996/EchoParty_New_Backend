// controllers/media.controller.ts
import { Request, Response } from 'express';
import { AuthRequest } from '../types';
import { MediaService } from '../services/media.service';
import { logger } from '../utils/logger.js';
import { Video } from '../models/video.model.js';
import { PublitioService } from '../services/publitio.service';

export class MediaController {
  static searchYouTube = async (req: Request, res: Response): Promise<void> => {
    try {
      const { q } = req.query;
      
      if (!q) {
        res.status(400).json({ error: 'Search query is required' });
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
      
      if (!videoId) {
        res.status(400).json({ error: 'Video ID is required' });
        return;
      }
      
      const video = await MediaService.getYouTubeVideo(videoId);
      res.json({ video });
    } catch (error) {
      logger.error('YouTube get video error:', error);
      res.status(500).json({ error: 'Failed to get YouTube video' });
    }
  };

  // Upload video to Publitio
  static async uploadVideo(req: Request, res: Response) {
    try {
      const userId = (req as AuthRequest).user?._id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const { originalname, buffer, mimetype, size } = req.file;
      const title = req.body.title || originalname;
      const description = req.body.description || '';

      // Check file size limit (2GB)
      if (size > 2 * 1024 * 1024 * 1024) {
        return res.status(413).json({ 
          error: `File too large. Maximum size allowed is 2GB` 
        });
      }

      // Upload to Publitio
      const uploadResult = await PublitioService.uploadVideo(
        buffer,
        originalname,
        title,
        description
      );

      // Save video metadata to database
      const video = new Video({
        userId,
        publitioId: uploadResult.id,
        title: uploadResult.title,
        description: description,
        streamUrl: uploadResult.streamUrl,
        thumbnailUrl: uploadResult.thumbnailUrl,
        size: uploadResult.size,
        duration: uploadResult.duration || 0,
        isActive: true
      });
      await video.save();

      res.status(201).json({
        _id: video._id,
        title: video.title,
        streamUrl: video.streamUrl,
        thumbnailUrl: video.thumbnailUrl,
        size: video.size,
        duration: video.duration,
        createdAt: video.createdAt
      });
    } catch (error: any) {
      logger.error('Video upload error:', error);
      
      if (error.message?.includes('File is too large')) {
        res.status(413).json({ 
          error: `File too large. Maximum size allowed is 2GB` 
        });
      } else {
        res.status(500).json({ error: error.message || 'Failed to upload video' });
      }
    }
  }

  // Get user's videos
  static async getUserVideos(req: Request, res: Response) {
    try {
      const userId = (req as AuthRequest).user?._id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Get videos from database for this user
      const videos = await Video.find({ userId, isActive: true })
        .sort({ createdAt: -1 })
        .lean();
      
      res.json(videos);
    } catch (error: any) {
      logger.error('Get user videos error:', error);
      res.status(500).json({ error: error.message || 'Failed to get videos' });
    }
  }

  // Get specific video by ID
  static async getVideo(req: Request, res: Response) {
    try {
      const { videoId } = req.params;
      const userId = (req as AuthRequest).user?._id;

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Get video from database
      const video = await Video.findOne({ _id: videoId, isActive: true });
      
      if (!video) {
        return res.status(404).json({ error: 'Video not found' });
      }

      // Refresh stream URL from Publitio if needed
      if (video.streamUrl) {
        try {
          const freshStreamUrl = await PublitioService.refreshStreamUrl(video.publitioId);
          if (freshStreamUrl !== video.streamUrl) {
            video.streamUrl = freshStreamUrl;
            await video.save();
          }
        } catch (err) {
          logger.warn(`Could not refresh stream URL for video ${videoId}`, err);
        }
      }

      res.json({ video });
    } catch (error: any) {
      logger.error('Get video error:', error);
      res.status(500).json({ error: error.message || 'Failed to get video' });
    }
  }

  // Delete video
  static async deleteVideo(req: Request, res: Response) {
    try {
      const { videoId } = req.params;
      const userId = (req as AuthRequest).user?._id;

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Get video from database
      const video = await Video.findOne({ _id: videoId, userId, isActive: true });
      if (!video) {
        return res.status(404).json({ error: 'Video not found' });
      }

      // Delete from Publitio
      await PublitioService.deleteVideo(video.publitioId);

      // Mark as inactive in database (soft delete)
      video.isActive = false;
      await video.save();

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
      const userId = (req as AuthRequest).user?._id;

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Get video from database
      const video = await Video.findOne({ _id: videoId, userId, isActive: true });
      if (!video) {
        return res.status(404).json({ error: 'Video not found' });
      }

      // Generate new stream URL using PublitioService
      const streamUrl = await PublitioService.refreshStreamUrl(video.publitioId);
      
      // Update video in database
      video.streamUrl = streamUrl;
      await video.save();
      
      res.json({ streamUrl });
    } catch (error: any) {
      logger.error('Refresh stream URL error:', error);
      res.status(500).json({ error: error.message || 'Failed to refresh stream URL' });
    }
  }

  // Stream video - not needed with Publitio as it handles streaming directly
  static async streamVideo(req: Request, res: Response) {
    try {
      const { fileId } = req.params;
      
      // Simply redirect to Publitio's stream URL
      const video = await PublitioService.getVideo(fileId);
      
      if (!video) {
        return res.status(404).json({ error: 'Video not found' });
      }
      
      // Redirect to Publitio stream URL
      res.redirect(video.streamUrl);
    } catch (error: any) {
      logger.error('Stream video error:', error);
      res.status(500).json({ error: error.message || 'Failed to stream video' });
    }
  }

}