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

  static getDriveAuthUrl = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user!._id.toString();
      const authUrl = MediaService.getGoogleDriveAuthUrl(userId);
      res.json({ authUrl });
    } catch (error) {
      logger.error('Drive auth URL error:', error);
      res.status(500).json({ error: 'Failed to generate auth URL' });
    }
  };

  static handleDriveCallback = async (req: Request, res: Response): Promise<void> => {
    try {
      const { code, state } = req.query;

      if (!code) {
        res.redirect(`${process.env.FRONTEND_URL}/drive/error`);
        return;
      }

      const tokens = await MediaService.handleDriveCallback(code as string);

      // Store tokens in session or database for the user
      // For now, we'll redirect with tokens (in production, store securely)
      const redirectUrl = new URL(`${process.env.FRONTEND_URL}/drive/success`);
      redirectUrl.searchParams.append('tokens', JSON.stringify(tokens));
      
      res.redirect(redirectUrl.toString());
    } catch (error) {
      logger.error('Drive callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/drive/error`);
    }
  };

  static uploadToDrive = async (req: Request, res: Response): Promise<void> => {
    try {
      const { tokens } = req.body;
      const file = req.file;

      if (!file) {
        res.status(400).json({ error: 'No file provided' });
        return;
      }

      if (!tokens) {
        res.status(400).json({ error: 'Drive tokens required' });
        return;
      }

      const driveFile = await MediaService.uploadToDrive(
        JSON.parse(tokens),
        file.buffer,
        file.originalname,
        file.mimetype
      );

      res.json({ file: driveFile });
    } catch (error) {
      logger.error('Drive upload error:', error);
      res.status(500).json({ error: 'Failed to upload to Google Drive' });
    }
  };
}