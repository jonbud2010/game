import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { uploadSingleImage, handleUploadError, deleteImageFile } from '../middleware/upload';
import { Request, Response } from 'express';

const router = Router();

// Upload image for players
router.post('/players', 
  authenticateToken, 
  requireAdmin,
  ...uploadSingleImage('players'),
  handleUploadError,
  (req: Request, res: Response) => {
    if (!req.body.imageUrl) {
      return res.status(400).json({
        error: 'No image uploaded',
        message: 'Please select an image file to upload'
      });
    }

    res.json({
      success: true,
      message: 'Player image uploaded successfully',
      data: {
        imageUrl: req.body.imageUrl,
        category: 'players'
      }
    });
  }
);

// Upload image for formations
router.post('/formations', 
  authenticateToken, 
  requireAdmin,
  ...uploadSingleImage('formations'),
  handleUploadError,
  (req: Request, res: Response) => {
    if (!req.body.imageUrl) {
      return res.status(400).json({
        error: 'No image uploaded',
        message: 'Please select an image file to upload'
      });
    }

    res.json({
      success: true,
      message: 'Formation image uploaded successfully',
      data: {
        imageUrl: req.body.imageUrl,
        category: 'formations'
      }
    });
  }
);

// Upload image for packs
router.post('/packs', 
  authenticateToken, 
  requireAdmin,
  ...uploadSingleImage('packs'),
  handleUploadError,
  (req: Request, res: Response) => {
    if (!req.body.imageUrl) {
      return res.status(400).json({
        error: 'No image uploaded',
        message: 'Please select an image file to upload'
      });
    }

    res.json({
      success: true,
      message: 'Pack image uploaded successfully',
      data: {
        imageUrl: req.body.imageUrl,
        category: 'packs'
      }
    });
  }
);

// Delete uploaded image (admin only)
router.delete('/:category/:filename',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { category, filename } = req.params;
      
      // Validate category
      const validCategories = ['players', 'formations', 'packs'];
      if (!validCategories.includes(category)) {
        return res.status(400).json({
          error: 'Invalid category',
          message: 'Category must be one of: players, formations, packs'
        });
      }

      // Construct image URL
      const imageUrl = `/uploads/images/${category}/${filename}`;
      
      // Delete the file
      await deleteImageFile(imageUrl);

      res.json({
        success: true,
        message: 'Image deleted successfully',
        data: {
          imageUrl,
          category,
          filename
        }
      });
    } catch (error) {
      console.error('Error deleting image:', error);
      res.status(500).json({
        error: 'Failed to delete image',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

// Get upload info (for frontend to know upload limits, etc.)
router.get('/info', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      maxFileSize: '5MB',
      allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
      categories: {
        players: {
          dimensions: '400x400px (square)',
          description: 'Player profile images'
        },
        formations: {
          dimensions: 'Max 800px width (aspect ratio maintained)',
          description: 'Formation layout diagrams'
        },
        packs: {
          dimensions: '300x300px (square)',
          description: 'Pack cover images'
        }
      },
      outputFormat: 'WebP (optimized for web)'
    }
  });
});

export default router;