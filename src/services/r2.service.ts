import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config';
import { logger } from '../utils/logger';
import { CloudflareVideo } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class R2Service {
  private static s3Client: S3Client;

  static {
    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: config.cloudflare.r2.endpoint,
      credentials: {
        accessKeyId: config.cloudflare.r2.accessKeyId,
        secretAccessKey: config.cloudflare.r2.secretAccessKey,
      },
    });
  }

  static async checkStorageQuota(): Promise<{ used: number; available: number; canUpload: boolean }> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: config.cloudflare.r2.bucketName,
      });

      const response = await this.s3Client.send(command);
      let totalSize = 0;

      if (response.Contents) {
        for (const object of response.Contents) {
          totalSize += object.Size || 0;
        }
      }

      const maxSize = config.storage.maxTotalSize;
      const available = maxSize - totalSize;
      const canUpload = available > 0;

      logger.info(`Storage usage: ${totalSize} bytes / ${maxSize} bytes (${(totalSize / maxSize * 100).toFixed(2)}%)`);

      return {
        used: totalSize,
        available,
        canUpload,
      };
    } catch (error) {
      logger.error('Error checking storage quota:', error);
      throw new Error('Failed to check storage quota');
    }
  }

  static async uploadVideo(fileBuffer: Buffer, fileName: string, contentType: string): Promise<CloudflareVideo> {
    try {
      // Check storage quota before upload
      const quota = await this.checkStorageQuota();
      if (!quota.canUpload || fileBuffer.length > quota.available) {
        throw new Error('Storage quota exceeded. Cannot upload more videos.');
      }

      // Validate file size
      if (fileBuffer.length > config.storage.maxFileSize) {
        throw new Error(`File too large. Maximum size is ${config.storage.maxFileSize / (1024 * 1024)}MB`);
      }

      const videoId = uuidv4();
      const key = `videos/${videoId}-${fileName}`;

      const uploadCommand = new PutObjectCommand({
        Bucket: config.cloudflare.r2.bucketName,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
        Metadata: {
          originalName: fileName,
          uploadedAt: new Date().toISOString(),
        },
      });

      await this.s3Client.send(uploadCommand);

      const video: CloudflareVideo = {
        id: videoId,
        key,
        name: fileName,
        size: fileBuffer.length,
        contentType,
        uploadedAt: new Date().toISOString(),
      };

      logger.info(`Successfully uploaded video: ${fileName} (${fileBuffer.length} bytes)`);
      return video;
    } catch (error) {
      logger.error('Error uploading video to R2:', error);
      throw error;
    }
  }

  static async getVideos(): Promise<CloudflareVideo[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: config.cloudflare.r2.bucketName,
        Prefix: 'videos/',
      });

      const response = await this.s3Client.send(command);
      const videos: CloudflareVideo[] = [];

      if (response.Contents) {
        for (const object of response.Contents) {
          if (object.Key && object.Key !== 'videos/') {
            try {
              // Get metadata
              const headCommand = new HeadObjectCommand({
                Bucket: config.cloudflare.r2.bucketName,
                Key: object.Key,
              });

              const headResponse = await this.s3Client.send(headCommand);
              
              const videoId = object.Key.split('/')[1]?.split('-')[0] || object.Key;
              const originalName = headResponse.Metadata?.originalname || object.Key.split('/')[1] || 'Unknown';

              videos.push({
                id: videoId,
                key: object.Key,
                name: originalName,
                size: object.Size || 0,
                contentType: headResponse.ContentType || 'video/mp4',
                uploadedAt: object.LastModified?.toISOString() || new Date().toISOString(),
              });
            } catch (headError) {
              logger.warn(`Could not get metadata for ${object.Key}:`, headError);
              // Add video with minimal info
              const videoId = object.Key.split('/')[1]?.split('-')[0] || object.Key;
              videos.push({
                id: videoId,
                key: object.Key,
                name: object.Key.split('/')[1] || 'Unknown',
                size: object.Size || 0,
                contentType: 'video/mp4',
                uploadedAt: object.LastModified?.toISOString() || new Date().toISOString(),
              });
            }
          }
        }
      }

      logger.info(`Found ${videos.length} videos in R2`);
      return videos.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
    } catch (error) {
      logger.error('Error fetching videos from R2:', error);
      throw error;
    }
  }

  static async getVideoStreamUrl(key: string): Promise<string> {
    try {
      // Generate a presigned URL for streaming (valid for 1 hour)
      const command = new GetObjectCommand({
        Bucket: config.cloudflare.r2.bucketName,
        Key: key,
      });

      const streamUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
      
      logger.info(`Generated stream URL for: ${key}`);
      return streamUrl;
    } catch (error) {
      logger.error('Error generating stream URL:', error);
      throw error;
    }
  }

  static async deleteVideo(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: config.cloudflare.r2.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      
      logger.info(`Successfully deleted video: ${key}`);
    } catch (error) {
      logger.error('Error deleting video from R2:', error);
      throw error;
    }
  }

  static async getStorageStats(): Promise<{ totalVideos: number; totalSize: number; quota: number; usagePercentage: number }> {
    try {
      const videos = await this.getVideos();
      const totalSize = videos.reduce((sum, video) => sum + video.size, 0);
      const quota = config.storage.maxTotalSize;
      const usagePercentage = (totalSize / quota) * 100;

      return {
        totalVideos: videos.length,
        totalSize,
        quota,
        usagePercentage,
      };
    } catch (error) {
      logger.error('Error getting storage stats:', error);
      throw error;
    }
  }

  // New methods for video processing
  static async uploadFile(fileBuffer: Buffer, key: string, contentType: string): Promise<void> {
    try {
      const uploadCommand = new PutObjectCommand({
        Bucket: config.cloudflare.r2.bucketName,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
      });

      await this.s3Client.send(uploadCommand);
      logger.info(`Successfully uploaded file: ${key} (${fileBuffer.length} bytes)`);
    } catch (error) {
      logger.error('Error uploading file to R2:', error);
      throw error;
    }
  }

  static async getFileStream(key: string): Promise<NodeJS.ReadableStream> {
    try {
      const getCommand = new GetObjectCommand({
        Bucket: config.cloudflare.r2.bucketName,
        Key: key,
      });

      const response = await this.s3Client.send(getCommand);
      
      if (!response.Body) {
        throw new Error('No file data received');
      }

      return response.Body as NodeJS.ReadableStream;
    } catch (error) {
      logger.error(`Error getting file stream for ${key}:`, error);
      throw error;
    }
  }

  static async deleteFile(key: string): Promise<void> {
    try {
      const deleteCommand = new DeleteObjectCommand({
        Bucket: config.cloudflare.r2.bucketName,
        Key: key,
      });

      await this.s3Client.send(deleteCommand);
      logger.info(`Successfully deleted file: ${key}`);
    } catch (error) {
      logger.error(`Error deleting file ${key}:`, error);
      throw error;
    }
  }

  static async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const getCommand = new GetObjectCommand({
        Bucket: config.cloudflare.r2.bucketName,
        Key: key,
      });

      const signedUrl = await getSignedUrl(this.s3Client, getCommand, { expiresIn });
      logger.info(`Generated signed URL for: ${key}`);
      return signedUrl;
    } catch (error) {
      logger.error(`Error generating signed URL for ${key}:`, error);
      throw error;
    }
  }
} 