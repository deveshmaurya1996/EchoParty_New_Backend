// middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../types';
import { config } from '../config';
import { IUser } from '../types';
import { logger } from '../utils/logger';

export const authenticateJWT = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false,
      error: 'No token provided'
    });
  }

  const token = authHeader && authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as { user: IUser };
    if (!decoded.user || !decoded.user._id) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid token payload'
      });
    }

    (req as AuthRequest).user = decoded.user;
    next();
  } catch (error) {
    logger.error('JWT verification error:', error);
    res.status(401).json({ 
      success: false,
      error: 'Invalid or expired token'
    });
  }
};