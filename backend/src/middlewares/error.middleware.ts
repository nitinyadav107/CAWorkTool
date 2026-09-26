import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err);

  if (err instanceof ZodError) {
    return res.status(400).json({
      message: 'Validation Error',
      errors: err.issues,
    });
  }

  if (err?.name === 'CastError' || err?.name === 'ValidationError') {
    return res.status(400).json({ message: 'Invalid request data', details: err.message });
  }

  // Mongoose Duplicate Key Error
  if (err.code === 11000) {
    return res.status(409).json({ message: 'A record already exists for these values', field: Object.keys(err.keyValue || {}) });
  }

  res.status(500).json({ message: err.message || 'Internal Server Error' });
};
