import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      res.status(400).json({
        error: 'Validation error',
        details: error.details.map(d => d.message),
      });
      return;
    }
    
    next();
  };
};

// Validation schemas
export const schemas = {
  createRoom: Joi.object({
    name: Joi.string().required().min(3).max(50),
    type: Joi.string().valid('youtube', 'movie').required(),
  }),

  updateRoom: Joi.object({
    name: Joi.string().min(3).max(50),
    isActive: Joi.boolean(),
  }),

  refreshToken: Joi.object({
    refreshToken: Joi.string().required(),
  }),

  pagination: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    sort: Joi.string(),
    order: Joi.string().valid('asc', 'desc'),
  }),
};