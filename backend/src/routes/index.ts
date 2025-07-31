import { Router } from 'express';
import authRoutes from './authRoutes';
import playerRoutes from './playerRoutes';
import lobbyRoutes from './lobbyRoutes';
import formationRoutes from './formationRoutes';
import packRoutes from './packRoutes';
import teamRoutes from './teamRoutes';
import matchRoutes from './matchRoutes';
import uploadRoutes from './uploadRoutes';

const router = Router();

// API Routes
router.use('/auth', authRoutes);
router.use('/players', playerRoutes);
router.use('/lobbies', lobbyRoutes);
router.use('/formations', formationRoutes);
router.use('/packs', packRoutes);
router.use('/teams', teamRoutes);
router.use('/matches', matchRoutes);
router.use('/uploads', uploadRoutes);

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
      formations: '/api/formations',
      packs: '/api/packs',
      teams: '/api/teams',
      matches: '/api/matches',
      league: '/api/league (coming soon)'
    }
  });
});

export default router;