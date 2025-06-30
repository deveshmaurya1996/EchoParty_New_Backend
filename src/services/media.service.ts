import axios from 'axios';
import { config } from '../config/index.js';
import { YouTubeVideo, VideoResponse, VideoUploadResponse, UserVideo } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { Video } from '../models/video.model.js';
import { R2Service } from './r2.service.js';
import { TelegramService } from './telegram.service.js';
import { v4 as uuidv4 } from 'uuid';
import { Types } from 'mongoose';

export class MediaService {
  static async searchYouTube(query: string): Promise<YouTubeVideo[]> {
    try {
      const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
        params: {
          part: 'snippet',
          q: query,
          type: 'video',
          maxResults: 10,
          key: config.youtube.apiKey,
        },
      });

      const videoIds = response.data.items.map((item: any) => item.id.videoId).join(',');

      const detailsResponse = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
        params: {
          part: 'contentDetails,snippet',
          id: videoIds,
          key: config.youtube.apiKey,
        },
      });

      return detailsResponse.data.items.map((item: any) => ({
        id: item.id,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail: item.snippet.thumbnails.medium.url,
        duration: item.contentDetails.duration,
        channelTitle: item.snippet.channelTitle,
      }));
    } catch (error) {
      logger.error('YouTube search error:', error);
      throw new Error('Failed to search YouTube videos');
    }
  }

  static async getYouTubeVideo(videoId: string): Promise<YouTubeVideo> {
    try {
      const response = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
        params: {
          part: 'snippet,contentDetails',
          id: videoId,
          key: config.youtube.apiKey,
        },
      });

      if (!response.data.items || response.data.items.length === 0) {
        throw new Error('Video not found');
      }

      const item = response.data.items[0];
      return {
        id: item.id,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail: item.snippet.thumbnails.medium.url,
        duration: item.contentDetails.duration,
        channelTitle: item.snippet.channelTitle,
      };
    } catch (error) {
      logger.error('YouTube video fetch error:', error);
      throw new Error('Failed to fetch YouTube video');
    }
  }

  static async uploadVideo(userId: string, fileBuffer: Buffer, originalName: string, contentType: string): Promise<VideoUploadResponse> {
    try {
      // Validate file size
      if (fileBuffer.length > config.storage.maxFileSize) {
        throw new Error(`File too large. Maximum size is ${config.storage.maxFileSize / (1024 * 1024)}MB`);
      }

      const videoId = uuidv4();
      const r2Key = `videos/original/${userId}/${videoId}.mp4`;

      // Create video record in database
      const video = new Video({
        userId: new Types.ObjectId(userId),
        videoId,
        originalName,
        fileName: `${videoId}.mp4`,
        r2Key,
        size: fileBuffer.length,
        contentType: 'video/mp4',
        encodingStatus: 'processing',
        encodingProgress: 0,
        isActive: true,
      });

      await video.save();

      try {
        // Upload to both R2 and Telegram in parallel
        const [telegramResult] = await Promise.all([
          // Upload to Telegram for streaming
          TelegramService.uploadVideo(fileBuffer, originalName),
          // Upload to R2 for backup
          R2Service.uploadFile(fileBuffer, r2Key, contentType)
        ]);

        // Update video record with Telegram details
        video.telegramFileId = telegramResult.fileId;
        video.telegramMessageId = telegramResult.messageId;
        video.streamUrl = telegramResult.streamUrl;
        video.encodingStatus = 'completed';
        video.encodingProgress = 100;
        await video.save();

        logger.info(`Video upload completed for ${videoId}, Telegram File ID: ${telegramResult.fileId}`);

        return {
          videoId,
          originalName,
          encodingStatus: 'completed',
          uploadedAt: video.createdAt.toISOString(),
        };

      } catch (error) {
        logger.error(`Failed to upload video ${videoId}:`, error);
        video.encodingStatus = 'failed';
        await video.save();
        throw error;
      }
    } catch (error) {
      logger.error('Video upload error:', error);
      throw error;
    }
  }

  static async getVideo(videoId: string): Promise<VideoResponse | null> {
    try {
      const video = await Video.findOne({ videoId, isActive: true });
      if (!video) {
        return null;
      }

      return {
        id: video._id.toString(),
        videoId: video.videoId,
        telegramFileId: video.telegramFileId,
        originalName: video.originalName,
        fileName: video.fileName,
        streamUrl: video.streamUrl,
        size: video.size,
        contentType: video.contentType,
        encodingStatus: video.encodingStatus,
        encodingProgress: video.encodingProgress,
        createdAt: video.createdAt.toISOString(),
        updatedAt: video.updatedAt.toISOString(),
      };
    } catch (error) {
      logger.error(`Failed to get video ${videoId}:`, error);
      throw error;
    }
  }

  static async getUserVideos(userId: string): Promise<UserVideo[]> {
    try {
      const videos = await Video.find({ 
        userId: new Types.ObjectId(userId), 
        isActive: true,
        encodingStatus: 'completed'
      }).sort({ createdAt: -1 });

      return videos.map(video => ({
        id: video._id.toString(),
        videoId: video.videoId,
        originalName: video.originalName,
        fileName: video.fileName,
        streamUrl: video.streamUrl,
        size: video.size,
        encodingStatus: video.encodingStatus,
        encodingProgress: video.encodingProgress,
        createdAt: video.createdAt.toISOString(),
        uploadedAt: video.createdAt.toISOString(),
      }));
    } catch (error) {
      logger.error(`Failed to get videos for user ${userId}:`, error);
      throw error;
    }
  }

  static async deleteVideo(userId: string, videoId: string): Promise<void> {
    try {
      const video = await Video.findOne({ 
        userId: new Types.ObjectId(userId), 
        videoId,
        isActive: true 
      });

      if (!video) {
        throw new Error('Video not found');
      }

      // Delete from both R2 and Telegram in parallel
      await Promise.all([
        // Delete from Telegram
        video.telegramMessageId && TelegramService.deleteVideo(video.telegramMessageId).catch(error => {
          logger.error(`Failed to delete video ${videoId} from Telegram:`, error);
        }),
        // Delete from R2
        video.r2Key && R2Service.deleteFile(video.r2Key).catch(error => {
          logger.error(`Failed to delete video ${videoId} from R2:`, error);
        })
      ]);

      // Soft delete in database
      video.isActive = false;
      await video.save();

      logger.info(`Video ${videoId} deleted successfully`);
    } catch (error) {
      logger.error(`Failed to delete video ${videoId}:`, error);
      throw error;
    }
  }

  static async refreshStreamUrl(userId: string, videoId: string): Promise<string> {
    try {
      const video = await Video.findOne({ 
        userId: new Types.ObjectId(userId), 
        videoId,
        isActive: true 
      });

      if (!video) {
        throw new Error('Video not found');
      }

      if (!video.telegramFileId) {
        throw new Error('Video stream not ready');
      }

      return TelegramService.getProxiedStreamUrl(video.telegramFileId);
    } catch (error) {
      logger.error(`Failed to refresh stream URL for video ${videoId}:`, error);
      throw error;
    }
  }
}