import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { validateId } from '../middleware/validation';
import {
  getUserTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
  validateTeam
} from '../controllers/teamController';

const router = Router();

// All team routes require authentication
router.use(authenticateToken);

// Team management routes
router.get('/lobby/:lobbyId', getUserTeams); // Get all teams for user in a lobby
router.get('/:id', validateId, getTeamById); // Get specific team
router.post('/', createTeam); // Create new team
router.put('/:id', validateId, updateTeam); // Update team
router.delete('/:id', validateId, deleteTeam); // Delete team
router.get('/:id/validate', validateId, validateTeam); // Validate team chemistry and composition

export default router;