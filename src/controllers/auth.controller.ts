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
      const { idToken } = req.body;

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
        driveAccess: false
      });

      // Generate tokens
      const { accessToken, refreshToken } = await AuthService.generateTokens(user);

      res.json({
        success: true,
        data: {
          user: await AuthService.getUserProfile(user),
          tokens: { accessToken, refreshToken }
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

  static handleDriveCallback = async (req: Request, res: Response): Promise<void> => {
    try {
      const { code } = req.query;
      
      if (!code) {
        res.status(400).json({ 
          success: false, 
          error: 'Authorization code is required' 
        });
        return;
      }

      // Exchange code for tokens
      const { tokens } = await AuthService.oauth2Client.getToken(code as string);
      
      // Update user's drive access
      const authReq = req as AuthRequest;
      if (authReq.user) {
        await AuthService.updateDriveAccess(authReq.user._id.toString(), true);
        await AuthService.updateGoogleTokens(authReq.user._id.toString(), tokens);
      }

      res.json({ 
        success: true, 
        message: 'Google Drive access granted successfully' 
      });
    } catch (error) {
      logger.error('Drive callback error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to complete Drive authorization' 
      });
    }
  };

  static updateDriveAccess = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const { hasDriveAccess } = req.body;
      
      await AuthService.updateDriveAccess(authReq.user!._id.toString(), hasDriveAccess);
      
      // If revoking access, also clear Google tokens
      if (!hasDriveAccess) {
        await AuthService.updateGoogleTokens(authReq.user!._id.toString(), null);
      }
      
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

  static grantDriveAccess = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const { accessToken } = req.body;
      
      if (!accessToken) {
        res.status(400).json({ 
          success: false, 
          error: 'Access token is required' 
        });
        return;
      }

      // For now, store just the access token
      // In a production environment, you would want to exchange this for a refresh token
      // using the Google OAuth2 flow, but for now we'll work with what we have
      const tokens = {
        access_token: accessToken,
        // Note: We don't have a refresh token here, so the user will need to re-authenticate
        // when the access token expires (typically after 1 hour)
      };
      
      await AuthService.updateGoogleTokens(authReq.user!._id.toString(), tokens);
      await AuthService.updateDriveAccess(authReq.user!._id.toString(), true);

      res.json({ 
        success: true, 
        message: 'Drive access granted successfully',
        note: 'Access token will expire in 1 hour. User may need to re-authenticate for Drive access after that.'
      });
    } catch (error) {
      logger.error('Grant drive access error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to grant drive access' 
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