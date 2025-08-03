import { Request, Response, NextFunction } from 'express';
import { upload, processAndSaveImage, handleUploadError } from './upload';

export const uploadFormationImage = [
  (upload.single('image') as any),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return next(); // No file uploaded, continue
      }

      // Process and save the image
      const imageUrl = await processAndSaveImage(
        req.file.buffer,
        req.file.originalname,
        'formations'
      );

      // Add imageUrl to request body
      req.body.imageUrl = imageUrl;
      
      next();
    } catch (error) {
      res.status(400).json({
        error: 'Image upload failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
];

export const uploadPackImage = [
  (upload.single('image') as any),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return next(); // No file uploaded, continue
      }

      // Process and save the image
      const imageUrl = await processAndSaveImage(
        req.file.buffer,
        req.file.originalname,
        'packs'
      );

      // Add imageUrl to request body
      req.body.imageUrl = imageUrl;
      
      next();
    } catch (error) {
      res.status(400).json({
        error: 'Image upload failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
];

export const uploadPlayerImage = [
  (upload.single('image') as any),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return next(); // No file uploaded, continue
      }

      // Process and save the image
      const imageUrl = await processAndSaveImage(
        req.file.buffer,
        req.file.originalname,
        'players'
      );

      // Add imageUrl to request body
      req.body.imageUrl = imageUrl;
      
      next();
    } catch (error) {
      res.status(400).json({
        error: 'Image upload failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
];