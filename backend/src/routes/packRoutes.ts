import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { validateId, validateCreatePack, validatePackPlayerManagement } from '../middleware/validation';
import { uploadSingleImage, handleUploadError } from '../middleware/upload';
import {
  getAllPacks,
  getPackById,
  createPack,
  updatePack,
  deletePack,
  addPlayersTopack,
  removePlayersFromPack,
  getAvailablePacks,
  openPack,
  recalculatePackPercentages
} from '../controllers/packController';

const router = Router();

// Public routes (players can view available packs)
router.get('/available', getAvailablePacks);
router.get('/:id', validateId, getPackById);

// Admin-only routes
router.get('/', authenticateToken, requireAdmin, getAllPacks);
router.post('/', authenticateToken, requireAdmin, ...uploadSingleImage('packs'), validateCreatePack, createPack);
router.put('/:id', authenticateToken, requireAdmin, validateId, ...uploadSingleImage('packs'), updatePack);
router.delete('/:id', authenticateToken, requireAdmin, validateId, deletePack);

// Pack player management (admin-only)
router.post('/:id/players', authenticateToken, requireAdmin, validateId, validatePackPlayerManagement, addPlayersTopack);
router.delete('/:id/players', authenticateToken, requireAdmin, validateId, validatePackPlayerManagement, removePlayersFromPack);

// Pack opening (authenticated users)
router.post('/:id/open', authenticateToken, validateId, openPack);

// Pack percentage recalculation (admin-only)
router.post('/:id/recalculate', authenticateToken, requireAdmin, validateId, recalculatePackPercentages);

// Upload error handling
router.use(handleUploadError);

export default router;