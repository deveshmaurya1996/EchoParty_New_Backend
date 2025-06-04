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
        picture: [{ value: payload.picture }]
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