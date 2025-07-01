import PublitioAPI from 'publitio_js_sdk';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

interface PublitioVideo {
  id: string;
  title: string;
  description: string;
  size: number;
  created_at: string;
  url_preview: string;
  url_thumbnail: string;
  extension: string;
  width?: number;
  height?: number;
  duration?: number;
}

interface PublitioUploadResult {
  id: string;
  title: string;
  streamUrl: string;
  thumbnailUrl: string;
  size: number;
  duration?: number;
  createdAt: string;
}

export class PublitioService {
  private static publitio: any;

  private static init() {
    if (!this.publitio) {
      this.publitio = new PublitioAPI(config.publitio.apiKey, config.publitio.apiSecret);
      logger.info('Publitio service initialized');
    }
    return this.publitio;
  }

  /**
   * Upload video file to Publitio
   * @param fileBuffer Video file buffer
   * @param filename Original filename
   * @param title Video title
   * @param description Video description (optional)
   */
  static async uploadVideo(
    fileBuffer: Buffer,
    filename: string,
    title: string,
    description: string = ''
  ): Promise<PublitioUploadResult> {
    try {
      const publitio = this.init();
      
      logger.info(`Uploading video to Publitio: ${filename}`);
      
      const response = await publitio.uploadFile(fileBuffer, 'file', {
        title: title || filename,
        description,
        privacy: '1', // public
        option_download: '0', // disable download
        option_transform: '1', // enable transformations
      });

      if (!response || !response.success) {
        throw new Error(response?.message || 'Failed to upload video to Publitio');
      }

      logger.info(`Video uploaded to Publitio successfully: ${response.id}`);

      return {
        id: response.id,
        title: response.title,
        streamUrl: response.url_preview,
        thumbnailUrl: response.url_thumbnail,
        size: response.size,
        duration: response.duration,
        createdAt: response.created_at
      };
    } catch (error: any) {
      logger.error('Publitio video upload error:', {
        error: error.message,
        filename
      });
      throw new Error(`Failed to upload video: ${error.message}`);
    }
  }

  /**
   * Get all videos from Publitio
   */
  static async getVideos(limit: number = 100): Promise<PublitioUploadResult[]> {
    try {
      const publitio = this.init();
      
      logger.info('Getting videos from Publitio');
      
      const response = await publitio.call('/files/list', 'GET', {
        limit: limit.toString(),
        filter_type: 'video'
      });

      if (!response || !response.success) {
        throw new Error(response?.message || 'Failed to get videos from Publitio');
      }

      logger.info(`Found ${response.files_count} videos in Publitio`);

      const videos = response.files.map((file: PublitioVideo) => ({
        id: file.id,
        title: file.title,
        streamUrl: file.url_preview,
        thumbnailUrl: file.url_thumbnail,
        size: file.size,
        duration: file.duration,
        createdAt: file.created_at
      }));

      return videos;
    } catch (error: any) {
      logger.error('Failed to get videos from Publitio:', error);
      throw new Error(`Failed to get videos: ${error.message}`);
    }
  }

  /**
   * Get specific video by ID
   */
  static async getVideo(videoId: string): Promise<PublitioUploadResult> {
    try {
      const publitio = this.init();
      
      logger.info(`Getting video from Publitio: ${videoId}`);
      
      const response = await publitio.call(`/files/show/${videoId}`, 'GET');

      if (!response || !response.success) {
        throw new Error(response?.message || 'Failed to get video from Publitio');
      }

      return {
        id: response.id,
        title: response.title,
        streamUrl: response.url_preview,
        thumbnailUrl: response.url_thumbnail,
        size: response.size,
        duration: response.duration,
        createdAt: response.created_at
      };
    } catch (error: any) {
      logger.error(`Failed to get video from Publitio: ${videoId}`, error);
      throw new Error(`Failed to get video: ${error.message}`);
    }
  }

  /**
   * Delete video from Publitio
   */
  static async deleteVideo(videoId: string): Promise<void> {
    try {
      const publitio = this.init();
      
      logger.info(`Deleting video from Publitio: ${videoId}`);
      
      const response = await publitio.call(`/files/delete/${videoId}`, 'DELETE');

      if (!response || !response.success) {
        throw new Error(response?.message || 'Failed to delete video from Publitio');
      }

      logger.info(`Video deleted from Publitio successfully: ${videoId}`);
    } catch (error: any) {
      logger.error(`Failed to delete video from Publitio: ${videoId}`, error);
      throw new Error(`Failed to delete video: ${error.message}`);
    }
  }

  /**
   * Refresh stream URL for a video
   */
  static async refreshStreamUrl(videoId: string): Promise<string> {
    try {
      const publitio = this.init();
      
      logger.info(`Refreshing stream URL for video: ${videoId}`);
      
      // Get fresh video data
      const response = await publitio.call(`/files/show/${videoId}`, 'GET');

      if (!response || !response.success) {
        throw new Error(response?.message || 'Failed to refresh stream URL');
      }

      logger.info(`Stream URL refreshed for video: ${videoId}`);
      
      return response.url_preview;
    } catch (error: any) {
      logger.error(`Failed to refresh stream URL: ${videoId}`, error);
      throw new Error(`Failed to refresh stream URL: ${error.message}`);
    }
  }
} 