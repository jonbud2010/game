import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { Request, Response, NextFunction } from 'express';

// Ensure upload directories exist
const ensureDirectoriesExist = async () => {
  const dirs = [
    'uploads',
    'uploads/temp',
    'uploads/images',
    'uploads/images/players',
    'uploads/images/formations',
    'uploads/images/packs'
  ];

  for (const dir of dirs) {
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
  }
};

// Initialize directories
ensureDirectoriesExist().catch(console.error);

// Multer configuration for temporary file storage
const storage = multer.memoryStorage();

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Check file type
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'));
  }
};

// Multer upload instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1 // Single file upload
  }
});

// Image processing and saving utility
export const processAndSaveImage = async (
  buffer: Buffer,
  originalName: string,
  category: 'players' | 'formations' | 'packs'
): Promise<string> => {
  try {
    // Generate unique filename
    const timestamp = Date.now();
    const ext = path.extname(originalName).toLowerCase();
    const baseName = path.basename(originalName, ext);
    const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9-_]/g, '_');
    const filename = `${sanitizedBaseName}_${timestamp}.webp`;
    const relativePath = `images/${category}/${filename}`;
    const fullPath = path.join('uploads', relativePath);

    // Process image with Sharp
    let processedBuffer;
    
    if (category === 'players') {
      // Player images: square aspect ratio, 400x400px
      processedBuffer = await sharp(buffer)
        .resize(400, 400, { 
          fit: 'cover',
          position: 'center'
        })
        .webp({ quality: 85 })
        .toBuffer();
    } else if (category === 'formations') {
      // Formation images: maintain aspect ratio, max 800px width
      processedBuffer = await sharp(buffer)
        .resize(800, null, { 
          fit: 'inside',
          withoutEnlargement: true
        })
        .webp({ quality: 90 })
        .toBuffer();
    } else if (category === 'packs') {
      // Pack images: square aspect ratio, 300x300px
      processedBuffer = await sharp(buffer)
        .resize(300, 300, { 
          fit: 'cover',
          position: 'center'
        })
        .webp({ quality: 85 })
        .toBuffer();
    }

    // Save processed image
    await fs.writeFile(fullPath, processedBuffer);

    // Return relative path for database storage
    return `/uploads/${relativePath}`;
  } catch (error) {
    console.error('Error processing image:', error);
    throw new Error('Failed to process image');
  }
};

// Middleware for single image upload
export const uploadSingleImage = (category: 'players' | 'formations' | 'packs') => {
  return [
    upload.single('image'),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        console.log('=== UPLOAD MIDDLEWARE ===');
        console.log('req.file:', req.file);
        console.log('category:', category);
        
        if (!req.file) {
          console.log('No file uploaded, continuing...');
          return next(); // No file uploaded, continue
        }

        console.log('Processing image:', req.file.originalname);
        console.log('File size:', req.file.size);
        console.log('File mimetype:', req.file.mimetype);

        // Process and save the image
        const imageUrl = await processAndSaveImage(
          req.file.buffer,
          req.file.originalname,
          category
        );

        console.log('Image processed successfully:', imageUrl);

        // Add imageUrl to request body
        req.body.imageUrl = imageUrl;
        
        next();
      } catch (error) {
        console.error('Upload middleware error:', error);
        res.status(400).json({
          error: 'Image upload failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  ];
};

// Middleware for handling upload errors
export const handleUploadError = (error: any, req: Request, res: Response, next: NextFunction) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large',
        message: 'Image must be smaller than 5MB'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: 'Too many files',
        message: 'Only one image can be uploaded at a time'
      });
    }
  }

  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({
      error: 'Invalid file type',
      message: 'Only JPEG, PNG, and WebP images are allowed'
    });
  }

  next(error);
};

// Utility function to delete old image file
export const deleteImageFile = async (imageUrl: string): Promise<void> => {
  try {
    if (imageUrl && imageUrl.startsWith('/uploads/')) {
      const filePath = path.join(process.cwd(), imageUrl.substring(1)); // Remove leading slash
      await fs.unlink(filePath);
    }
  } catch (error) {
    console.error('Error deleting image file:', error);
    // Don't throw error for file deletion failures
  }
};

// Express static middleware setup function
export const setupStaticFileServing = (app: any) => {
  // Serve uploaded images statically
  app.use('/uploads', require('express').static('uploads'));
};