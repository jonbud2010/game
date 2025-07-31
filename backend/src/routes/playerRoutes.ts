import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { validateCreatePlayer, validateId } from '../middleware/validation';
import {
  getAllPlayers,
  getPlayerById,
  createPlayer,
  updatePlayer,
  deletePlayer,
  getPlayersByFilter
} from '../controllers/playerController';

const router = Router();

// Public routes (players can view)
router.get('/', getAllPlayers);
router.get('/filter', getPlayersByFilter);
router.get('/:id', validateId, getPlayerById);

// Admin-only routes
router.post('/', authenticateToken, requireAdmin, validateCreatePlayer, createPlayer);
router.put('/:id', authenticateToken, requireAdmin, validateId, validateCreatePlayer, updatePlayer);
router.delete('/:id', authenticateToken, requireAdmin, validateId, deletePlayer);

export default router;