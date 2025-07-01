// controllers/auth.controller.ts
import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { AuthService } from '../services/auth.service';
import { logger } from '../utils/logger';
import { config } from '../config';
import { AuthRequest } from '../types';
import { User } from '../models/user.model';

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
        photos: [{ value: payload.picture }]
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

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          error: 'Refresh token is required'
        });
        return;
      }

      const tokens = await AuthService.refreshTokens(refreshToken);
      
      res.json({ 
        success: true, 
        data: tokens 
      });
    } catch (error: any) {
      logger.error('Token refresh error:', error);
      
      // Handle specific error cases
      if (error.message === 'Invalid refresh token') {
        res.status(401).json({
          success: false,
          error: 'Invalid or expired refresh token. Please log in again.'
        });
      } else {
        res.status(500).json({ 
          success: false, 
          error: 'Failed to refresh token. Please try again.' 
        });
      }
    }
  };

  static getProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      const authUser = (req as AuthRequest).user;
      if (!authUser?._id) {
        throw new Error('User not found');
      }

      // Get the full user from database
      const user = await User.findById(authUser._id);
      if (!user) {
        throw new Error('User not found in database');
      }

      res.json({ 
        success: true, 
        data: user.toObject()
      });
    } catch (error) {
      logger.error('Get profile error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get profile' 
      });
    }
  };
}