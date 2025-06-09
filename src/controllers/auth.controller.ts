// controllers/auth.controller.ts
import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { AuthService } from '../services/auth.service';
import { logger } from '../utils/logger';
import { config } from '../config';
import { User } from '../models/user.model';
import { AuthRequest } from '../types';

const googleClient = new OAuth2Client(config.google.clientId);

export class AuthController {
  static googleSignIn = async (req: Request, res: Response): Promise<void> => {
    try {
      const { idToken, requestDriveAccess } = req.body;

      if (!idToken) {
        res.status(400).json({ 
          success: false, 
          error: 'ID token is required' 
        });
        return;
      }

      // Verify the Google ID token
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: config.google.clientId
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new Error('Invalid token payload');
      }

      // Find or create user
      const user = await AuthService.findOrCreateUser({
        id: payload.sub,
        emails: [{ value: payload.email! }],
        displayName: payload.name,
        picture: [{ value: payload.picture }],
        driveAccess: requestDriveAccess || false
      });

      // Generate tokens
      const { accessToken, refreshToken } = await AuthService.generateTokens(user);

      res.json({
        success: true,
        data: {
          user: await AuthService.getUserProfile(user),
          tokens: { accessToken, refreshToken },
          needDriveAuth: requestDriveAccess && !user.driveAccess
        }
      });
    } catch (error) {
      logger.error('Google sign in error:', error);
      res.status(401).json({ 
        success: false, 
        error: 'Authentication failed' 
      });
    }
  };

  static getDriveAuthUrl = async (req: Request, res: Response): Promise<void> => {
    try {
      const authUrl = AuthService.getGoogleAuthUrl(true);
      res.json({ 
        success: true, 
        data: { authUrl } 
      });
    } catch (error) {
      logger.error('Get drive auth URL error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to generate auth URL' 
      });
    }
  };

  static updateDriveAccess = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const { hasDriveAccess } = req.body;
      
      await AuthService.updateDriveAccess(authReq.user!._id.toString(), hasDriveAccess);
      
      res.json({ 
        success: true, 
        message: 'Drive access updated' 
      });
    } catch (error) {
      logger.error('Update drive access error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to update drive access' 
      });
    }
  };


  static refreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const { refreshToken } = req.body;
      const tokens = await AuthService.refreshTokens(refreshToken);
      res.json({ 
        success: true, 
        data: tokens 
      });
    } catch (error) {
      res.status(401).json({ 
        success: false, 
        error: 'Invalid refresh token' 
      });
    }
  };

  static getProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (req as AuthRequest).user;
      if (!user) {
        throw new Error('User not found');
      }
      const freshUser = await AuthService.getUserProfile(user)

      res.json({ 
        success: true, 
        data: freshUser
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get profile' 
      });
    }
  };
}