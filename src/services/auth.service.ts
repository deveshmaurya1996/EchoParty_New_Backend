import jwt, { SignOptions } from 'jsonwebtoken';
import { User } from '../models/user.model';
import { IUser } from '../types';
import { config } from '../config';
import { logger } from '../utils/logger';
import { OAuth2Client } from 'google-auth-library';

export class AuthService {
  private static oauth2Client = new OAuth2Client(
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
      driveAccess: user.driveAccess,
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
          driveAccess: profile.driveAccess || false,
        });
        logger.info(`New user created: ${user.email}`);
      } else if (profile.driveAccess && !user.driveAccess) {
        // Update drive access if requested
        user.driveAccess = true;
        await user.save();
      }

      return user;
    } catch (error) {
      logger.error('Error in findOrCreateUser:', error);
      throw error;
    }
  }

  static async updateRefreshToken(userId: string, refreshToken: string | null): Promise<void> {
    await User.findByIdAndUpdate(userId, { refreshToken });
  }

  static async validateRefreshToken(token: string): Promise<IUser | null> {
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as any;
      
      if (decoded.type !== 'refresh') {
        return null;
      }

      const user = await User.findById(decoded.userId);
      
      if (!user || user.refreshToken !== token) {
        return null;
      }

      return user;
    } catch (error) {
      return null;
    }
  }

  static async refreshTokens(refreshToken: string) {
    const user = await this.validateRefreshToken(refreshToken);
    if (!user) {
      throw new Error('Invalid refresh token');
    }
    return this.generateTokens(user);
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

  static getGoogleAuthUrl(includeDriveScope: boolean = false): string {
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ];

    if (includeDriveScope) {
      scopes.push('https://www.googleapis.com/auth/drive');
    }

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
    });
  }

  static async updateDriveAccess(userId: string, hasDriveAccess: boolean): Promise<void> {
    await User.findByIdAndUpdate(userId, { driveAccess: hasDriveAccess });
  }

  static async getGoogleTokenFromRefreshToken(refreshToken: string): Promise<string> {
    try {
      this.oauth2Client.setCredentials({ refresh_token: refreshToken });
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      return credentials.access_token!;
    } catch (error) {
      logger.error('Error refreshing Google token:', error);
      throw new Error('Failed to refresh Google token');
    }
  }
}