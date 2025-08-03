import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { validateId, validateCreateFormation } from '../middleware/validation';
import {
  getAllFormations,
  getFormationById,
  createFormation,
  updateFormation,
  deleteFormation,
  getFormationStats
} from '../controllers/formationController';

const router = Router();

// Public routes (players can view)
router.get('/', getAllFormations);
router.get('/stats', getFormationStats);
router.get('/:id', validateId, getFormationById);

// Admin-only routes
router.post('/', authenticateToken, requireAdmin, validateCreateFormation, createFormation);
router.put('/:id', authenticateToken, requireAdmin, validateId, validateCreateFormation, updateFormation);
router.delete('/:id', authenticateToken, requireAdmin, validateId, deleteFormation);

export default router;