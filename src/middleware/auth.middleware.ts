import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest, IUser } from '../types';
import { config } from '../config';
import { logger } from '../utils/logger';


export const authMiddleware = (
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

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as { userId: string };
    
    if (!decoded.userId) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid token payload'
      });
    }

    // For now, just set the userId. In a real app, you might want to fetch the full user
    (req as AuthRequest).user = { _id: decoded.userId } as unknown as IUser;
    next();
  } catch (error) {
    logger.error('JWT verification error:', error);
    res.status(401).json({ 
      success: false,
      error: 'Invalid or expired token'
    });
  }
};

// Alias for backward compatibility
export const authenticateJWT = authMiddleware;