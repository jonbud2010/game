import { Router } from 'express';
import authRoutes from './authRoutes.js';
import playerRoutes from './playerRoutes.js';
import lobbyRoutes from './lobbyRoutes.js';

const router = Router();

// API Routes
router.use('/auth', authRoutes);
router.use('/players', playerRoutes);
router.use('/lobbies', lobbyRoutes);

// Health check route (already defined in index.ts, but can be organized here too)
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Football TCG Backend is running!',
    timestamp: new Date().toISOString()
  });
});

// API info route
router.get('/', (req, res) => {
  res.json({ 
    message: 'Football Trading Card Game API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      players: '/api/players',
      lobbies: '/api/lobbies',
      formations: '/api/formations (coming soon)',
      packs: '/api/packs (coming soon)',
      teams: '/api/teams (coming soon)',
      matches: '/api/matches (coming soon)',
      league: '/api/league (coming soon)'
    }
  });
});

export default router;