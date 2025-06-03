import jwt, { SignOptions } from 'jsonwebtoken';
import { User } from '../models/user.model';
import { IUser } from '../types';
import { config } from '../config';
import { logger } from '../utils/logger';


export class AuthService {
  static generateToken(userId: string): string {
    return jwt.sign({ userId }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    } as SignOptions);
  }

  static generateRefreshToken(userId: string): string {
    return jwt.sign({ userId, type: 'refresh' }, config.jwt.secret, {
      expiresIn: config.jwt.refreshExpiresIn,
    } as SignOptions);
  }

  static async generateTokens(user: IUser) {
    const accessToken = this.generateToken(user._id.toString());
    const refreshToken = this.generateRefreshToken(user._id.toString());
    await this.updateRefreshToken(user._id.toString(), refreshToken);
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

  static async logout(user: IUser) {
    await this.updateRefreshToken(user._id.toString(), null);
  }

  static async getUserProfile(user: IUser) {
    return {
      id: user._id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
    };
  }
}