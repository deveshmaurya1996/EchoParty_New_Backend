import { logger } from '../utils/logger';
import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error('Error:', err);

  if (err.name === 'ValidationError') {
    res.status(400).json({
      error: 'Validation Error',
      details: Object.values(err.errors).map((e: any) => e.message),
    });
    return;
  }

  if (err.name === 'CastError') {
    res.status(400).json({
      error: 'Invalid ID format',
    });
    return;
  }

  if (err.code === 11000) {
    res.status(400).json({
      error: 'Duplicate value',
      field: Object.keys(err.keyValue)[0],
    });
    return;
  }

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
};

export const notFound = (req: Request, res: Response) => {
  res.status(404).json({
    error: 'Route not found',
  });
};