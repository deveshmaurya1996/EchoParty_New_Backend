import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { IUser } from '../types';
import { logger } from '../utils/logger';
import { config } from '../config';

export class AuthController {

  static googleCallback = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = req.user as IUser;
      const { accessToken, refreshToken } = await AuthService.generateTokens(user);
      
      // Create deep link with tokens
      const redirectUrl = new URL(config.google.redirectLink);
      redirectUrl.searchParams.append('status', 'success');
      redirectUrl.searchParams.append('accessToken', encodeURIComponent(accessToken));
      redirectUrl.searchParams.append('refreshToken', encodeURIComponent(refreshToken));
      
      res.redirect(redirectUrl.toString());
    } catch (error) {
      logger.error('Google auth callback error:', error);
      res.redirect(`${config.google.redirectLink}?error=auth_failed`);
    }
  };

  static async refreshToken(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;
      const tokens = await AuthService.refreshTokens(refreshToken);
      res.json(tokens);
    } catch (error) {
      res.status(401).json({ error: 'Invalid refresh token' });
    }
  }

  static async logout(req: Request, res: Response) {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }
      await AuthService.logout(req.user as IUser);
      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Logout failed' });
    }
  }

  static async getProfile(req: Request, res: Response) {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }
      const profile = await AuthService.getUserProfile(req.user as IUser);
      res.json(profile);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get profile' });
    }
  }
}