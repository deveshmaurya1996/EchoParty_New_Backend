import jwt, { SignOptions } from 'jsonwebtoken';
import { User } from '../models/user.model';
import { IUser } from '../types';
import { config } from '../config';
import { logger } from '../utils/logger';
import { OAuth2Client } from 'google-auth-library';

export class AuthService {
  static oauth2Client = new OAuth2Client(
    config.google.clientId,
    config.google.clientSecret,
    config.google.redirectLink
  );

  static generateToken(user: IUser): string {
    return jwt.sign({ userId: user._id }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    } as SignOptions);
  }

  static generateRefreshToken(user: IUser): string {
    return jwt.sign({ userId: user._id, type: 'refresh' }, config.jwt.secret, {
      expiresIn: config.jwt.refreshExpiresIn,
    } as SignOptions);
  }

  static async generateTokens(user: IUser) {
    const tokenUser = {
      _id: user._id,
      googleId: user.googleId,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }
    const accessToken = this.generateToken(tokenUser);
    const refreshToken = this.generateRefreshToken(tokenUser);
    await this.updateRefreshToken(tokenUser._id.toString(), refreshToken);
    return { accessToken, refreshToken };
  }

  static async findOrCreateUser(profile: any): Promise<IUser> {
    try {
      let user = await User.findOne({ googleId: profile.id });

      if (!user) {
        user = await User.create({
          googleId: profile.id,
          email: profile.emails[0].value,
          name: profile.displayName,
          avatar: profile.photos[0]?.value,
        });
        logger.info(`New user created: ${user.email}`);
      }

      return user;
    } catch (error) {
      logger.error('Error in findOrCreateUser:', error);
      throw error;
    }
  }

  static async updateRefreshToken(userId: string, refreshToken: string | null): Promise<void> {
    try {
      await User.findByIdAndUpdate(userId, { refreshToken });
      logger.info(`Updated refresh token for user: ${userId}`);
    } catch (error) {
      logger.error(`Failed to update refresh token for user ${userId}:`, error);
      throw error;
    }
  }

  static async validateRefreshToken(token: string): Promise<IUser | null> {
    try {
      // First verify the token is valid JWT
      const decoded = jwt.verify(token, config.jwt.secret) as any;
      logger.info('Refresh token decoded successfully');
      
      // Check if it's actually a refresh token
      if (decoded.type !== 'refresh') {
        logger.warn('Token is not a refresh token');
        return null;
      }

      // Find the user and verify the refresh token matches
      const user = await User.findById(decoded.userId);
      
      if (!user) {
        logger.warn(`User not found for ID: ${decoded.userId}`);
        return null;
      }

      if (user.refreshToken !== token) {
        logger.warn(`Stored refresh token doesn't match for user: ${decoded.userId}`);
        return null;
      }

      logger.info(`Refresh token validated successfully for user: ${user.email}`);
      return user;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        logger.warn('Refresh token has expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        logger.warn('Invalid refresh token format');
      } else {
        logger.error('Error validating refresh token:', error);
      }
      return null;
    }
  }

  static async refreshTokens(refreshToken: string) {
    try {
      const user = await this.validateRefreshToken(refreshToken);
      if (!user) {
        logger.warn('Invalid or expired refresh token');
        throw new Error('Invalid refresh token');
      }
      
      logger.info(`Generating new tokens for user: ${user.email}`);
      const tokens = await this.generateTokens(user);
      return tokens;
    } catch (error) {
      logger.error('Error refreshing tokens:', error);
      throw error;
    }
  }

  static async getUserProfile(user: IUser) {
    try {
      if (!user || !user._id) {
        throw new Error('Invalid user data');
      }

      const freshUser = await User.findById(user._id).select('-refreshToken');
      if (!freshUser) {
        throw new Error('User not found in database');
      }
      
      return freshUser;
    } catch (error) {
      logger.error('Error in getUserProfile:', error);
      throw error;
    }
  }

  static getGoogleAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
    });
  }
}