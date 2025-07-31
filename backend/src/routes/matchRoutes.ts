import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { validateId } from '../middleware/validation';
import {
  getLobbyMatches,
  getMatchById,
  generateMatchdayMatches,
  simulateMatch,
  simulateMatchday,
  getLeagueTable,
  createLeague,
  simulateEntireLeague,
  getLeagueStatus
} from '../controllers/matchController';

const router = Router();

// All match routes require authentication
router.use(authenticateToken);

// Match management routes
router.get('/lobby/:lobbyId', getLobbyMatches); // Get all matches for a lobby
router.get('/:id', validateId, getMatchById); // Get specific match
router.post('/lobby/:lobbyId/generate', generateMatchdayMatches); // Generate matches for a matchday
router.post('/:id/simulate', validateId, simulateMatch); // Simulate single match
router.post('/lobby/:lobbyId/simulate-matchday', simulateMatchday); // Simulate all matches for a matchday

// League table routes
router.get('/lobby/:lobbyId/table', getLeagueTable); // Get league table for lobby

// Tournament/League management routes
router.post('/lobby/:lobbyId/create-league', createLeague); // Create complete league (all 3 matchdays)
router.post('/lobby/:lobbyId/simulate-league', simulateEntireLeague); // Simulate entire league
router.get('/lobby/:lobbyId/status', getLeagueStatus); // Get league status and progress

export default router;