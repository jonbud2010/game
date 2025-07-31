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

export default router;