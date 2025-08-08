import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { validateId, validateCreatePack, validatePackPlayerManagement, validatePackFormationManagement } from '../middleware/validation';
import { uploadSingleImage, handleUploadError } from '../middleware/upload';
import {
  getAllPacks,
  getPackById,
  createPack,
  updatePack,
  deletePack,
  addPlayersToPack,
  removePlayersFromPack,
  addFormationsToPack,
  removeFormationsFromPack,
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
router.post('/:id/players', authenticateToken, requireAdmin, validateId, validatePackPlayerManagement, addPlayersToPack);
router.delete('/:id/players', authenticateToken, requireAdmin, validateId, validatePackPlayerManagement, removePlayersFromPack);

// Pack formation management (admin-only)
router.post('/:id/formations', authenticateToken, requireAdmin, validateId, validatePackFormationManagement, addFormationsToPack);
router.delete('/:id/formations', authenticateToken, requireAdmin, validateId, validatePackFormationManagement, removeFormationsFromPack);

// Pack opening (authenticated users)
router.post('/:id/open', authenticateToken, validateId, openPack);

// Pack percentage recalculation (admin-only)
router.post('/:id/recalculate', authenticateToken, requireAdmin, validateId, recalculatePackPercentages);

// Upload error handling
router.use(handleUploadError);

export default router;