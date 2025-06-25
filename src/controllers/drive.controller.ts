import { Request, Response } from 'express';
import { DriveService } from '../services/drive.service';
import { logger } from '../utils/logger';
import { AuthRequest } from '../types';

export class DriveController {
  static getVideos = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user!._id.toString();
      
      logger.info('Drive getVideos endpoint called for user:', userId);
      
      const videos = await DriveService.getDriveVideos(userId);
      
      logger.info('Sending videos response:', { count: videos.length });
      
      res.json({
        success: true,
        data: { videos }
      });
    } catch (error: any) {
      logger.error('Get Drive videos error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch Drive videos'
      });
    }
  };

  static getVideoStream = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user!._id.toString();
      const { fileId } = req.params;
      
      if (!fileId) {
        res.status(400).json({
          success: false,
          error: 'File ID is required'
        });
        return;
      }
      
      const streamUrl = await DriveService.getVideoStreamUrl(userId, fileId);
      
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

  static streamVideo = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user!._id.toString();
      const { fileId } = req.params;
      
      if (!fileId) {
        res.status(400).json({
          success: false,
          error: 'File ID is required'
        });
        return;
      }

      // Get a valid access token
      const accessToken = await DriveService.getValidAccessToken(userId);

      // Set appropriate headers for video streaming
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Range');

      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
      }

      // Get the range header for partial content requests
      const range = req.headers.range;
      
      if (range) {
        // Handle range requests for seeking
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : undefined;
        
        logger.info(`Streaming range request: ${start}-${end || 'end'} for file: ${fileId}`);
        
        // Make a range request to Google Drive
        const driveResponse = await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Range': `bytes=${start}-${end || ''}`
            }
          }
        );

        if (driveResponse.ok) {
          const contentLength = driveResponse.headers.get('content-length');
          const contentRange = driveResponse.headers.get('content-range');
          const acceptRanges = driveResponse.headers.get('accept-ranges');
          
          if (contentRange) {
            res.setHeader('Content-Range', contentRange);
          }
          if (contentLength) {
            res.setHeader('Content-Length', contentLength);
          }
          if (acceptRanges) {
            res.setHeader('Accept-Ranges', acceptRanges);
          }
          
          res.status(206); // Partial Content
          
          // Stream the response data efficiently
          const reader = driveResponse.body?.getReader();
          if (reader) {
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                res.write(value);
              }
            } finally {
              reader.releaseLock();
            }
            res.end();
          }
        } else {
          logger.error(`Drive API error: ${driveResponse.status} for file: ${fileId}`);
          res.status(driveResponse.status).json({
            success: false,
            error: 'Failed to fetch video from Drive'
          });
        }
      } else {
        // Full video request
        logger.info(`Streaming full video for file: ${fileId}`);
        
        const driveResponse = await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          }
        );

        if (driveResponse.ok) {
          const contentLength = driveResponse.headers.get('content-length');
          const acceptRanges = driveResponse.headers.get('accept-ranges');
          
          if (contentLength) {
            res.setHeader('Content-Length', contentLength);
          }
          if (acceptRanges) {
            res.setHeader('Accept-Ranges', acceptRanges);
          }
          
          res.status(200);
          
          // Stream the response data efficiently
          const reader = driveResponse.body?.getReader();
          if (reader) {
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                res.write(value);
              }
            } finally {
              reader.releaseLock();
            }
            res.end();
          }
        } else {
          logger.error(`Drive API error: ${driveResponse.status} for file: ${fileId}`);
          res.status(driveResponse.status).json({
            success: false,
            error: 'Failed to fetch video from Drive'
          });
        }
      }
    } catch (error: any) {
      logger.error('Stream video error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to stream video'
      });
    }
  };
} 