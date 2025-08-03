import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { validateCreateLobby, validateId } from '../middleware/validation';
import {
  getAllLobbies,
  getLobbyById,
  createLobby,
  joinLobby,
  leaveLobby
} from '../controllers/lobbyController';
import {
  getThemeRewardsHistory,
  getCurrentThemeStandings,
  executeThemeRewardsManually,
  getUserThemeRewardSummary
} from '../controllers/themeRewardController';

const router = Router();

// All lobby routes require authentication
router.use(authenticateToken);

// Get all lobbies (only WAITING lobbies)
router.get('/', getAllLobbies);

// Get specific lobby
router.get('/:id', validateId, getLobbyById);

// Create new lobby
router.post('/', validateCreateLobby, createLobby);

// Join lobby
router.post('/:id/join', validateId, joinLobby);

// Leave lobby
router.post('/:id/leave', validateId, leaveLobby);

// Theme Reward Routes
// Get theme reward history for a lobby
router.get('/:id/theme-rewards/history', validateId, getThemeRewardsHistory);

// Get current theme standings for a lobby
router.get('/:id/theme-rewards/standings', validateId, getCurrentThemeStandings);

// Get user's theme reward summary for a lobby
router.get('/:id/theme-rewards/user-summary', validateId, getUserThemeRewardSummary);

// Manually execute theme rewards (admin only)
router.post('/:id/theme-rewards/execute', validateId, executeThemeRewardsManually);

export default router;