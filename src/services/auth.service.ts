import jwt, { SignOptions } from 'jsonwebtoken';
import { User } from '../models/user.model';
import { IUser } from '../types';
import { config } from '../config';
import { logger } from '../utils/logger';


export class AuthService {
  static generateToken(user: IUser): string {
    return jwt.sign({ user }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    } as SignOptions);
  }

  static generateRefreshToken(user: IUser): string {
    return jwt.sign({ user, type: 'refresh' }, config.jwt.secret, {
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

      const freshUser :IUser = await User.findById(user._id);
      if (!freshUser) {
        throw new Error('User not found in database');
      }
      
      return {
        id: freshUser._id,
        email: freshUser.email,
        name: freshUser.name,
        avatar: freshUser.avatar,
        createdAt: freshUser.createdAt,
        updatedAt: freshUser.updatedAt
      };
    } catch (error) {
      logger.error('Error in getUserProfile:', error);
      throw error;
    }
  }
}