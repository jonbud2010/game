import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { getAllPlayers, createPlayer, updatePlayer, deletePlayer } from './playerController';
import { prisma } from '../db/connection';
import { authenticateToken, requireAdmin } from '../middleware/auth';

// Mock Prisma
vi.mock('../db/connection', () => ({
  prisma: {
    player: {
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    }
  }
}));

// Mock auth middleware
vi.mock('../middleware/auth', () => ({
  authenticateToken: vi.fn((req, res, next) => {
    req.user = { userId: 'user-1', role: 'ADMIN' };
    next();
  }),
  requireAdmin: vi.fn((req, res, next) => {
    if (req.user?.role === 'ADMIN') {
      next();
    } else {
      res.status(403).json({ error: 'Admin access required' });
    }
  })
}));

const mockedPrisma = vi.mocked(prisma);

describe('Player Controller', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Routes
    app.get('/players', getAllPlayers);
    app.post('/players', authenticateToken, requireAdmin, createPlayer);
    app.put('/players/:id', authenticateToken, requireAdmin, updatePlayer);
    app.delete('/players/:id', authenticateToken, requireAdmin, deletePlayer);

    // Reset all mocks
    vi.clearAllMocks();
  });

  describe('GET /players', () => {
    it('should return all players with filters', async () => {
      const mockPlayers = [
        {
          id: 'player-1',
          name: 'Test Player 1',
          imageUrl: '/images/player1.jpg',
          points: 85,
          position: 'ST',
          color: 'red',
          marketPrice: 200,
          theme: 'premium',
          percentage: 75,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'player-2',
          name: 'Test Player 2',
          imageUrl: '/images/player2.jpg',
          points: 78,
          position: 'GK',
          color: 'blue',
          marketPrice: 150,
          theme: 'basic',
          percentage: 60,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockedPrisma.player.findMany.mockResolvedValue(mockPlayers);

      const response = await request(app)
        .get('/players')
        .query({
          position: 'ST',
          color: 'red',
          minPoints: '80',
          maxPrice: '250'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0]).toMatchObject({
        id: 'player-1',
        name: 'Test Player 1',
        position: 'ST',
        color: 'red',
        points: 85
      });
      expect(response.body.data[1]).toMatchObject({
        id: 'player-2', 
        name: 'Test Player 2',
        position: 'GK',
        color: 'blue',
        points: 78
      });

      expect(mockedPrisma.player.findMany).toHaveBeenCalledWith({
        where: {
          position: 'ST',
          color: 'red',
          points: { gte: 80 },
          marketPrice: { lte: 250 }
        },
        orderBy: { points: 'desc' }
      });
    });

    it('should return all players without filters', async () => {
      const mockPlayers = [
        {
          id: 'player-1',
          name: 'Test Player 1',
          imageUrl: '/images/player1.jpg',
          points: 85,
          position: 'ST',
          color: 'red',
          marketPrice: 200,
          theme: 'premium',
          percentage: 75,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockedPrisma.player.findMany.mockResolvedValue(mockPlayers);

      const response = await request(app).get('/players');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toMatchObject({
        id: 'player-1',
        name: 'Test Player 1',
        position: 'ST',
        color: 'red',
        points: 85
      });

      expect(mockedPrisma.player.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { points: 'desc' }
      });
    });

    it('should handle database errors', async () => {
      mockedPrisma.player.findMany.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/players');

      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        success: false,
        error: 'Failed to fetch players'
      });
    });
  });

  describe('POST /players', () => {
    const validPlayerData = {
      name: 'New Player',
      imageUrl: '/images/newplayer.jpg',
      points: 82,
      position: 'CM',
      color: 'green',
      marketPrice: 180,
      theme: 'premium',
      percentage: 70
    };

    it('should create a new player successfully', async () => {
      const mockCreatedPlayer = {
        id: 'player-new',
        ...validPlayerData,
        color: 'HELLGRUEN', // Mock should return the transformed color
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockedPrisma.player.create.mockResolvedValue(mockCreatedPlayer);

      const response = await request(app)
        .post('/players')
        .send(validPlayerData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        name: 'New Player',
        position: 'CM',
        points: 82,
        marketPrice: 180
      });
      // The actual color should be the converted German name
      expect(response.body.data.color).toBe('HELLGRUEN');

      expect(mockedPrisma.player.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'New Player',
          position: 'CM',
          color: 'HELLGRUEN',
          points: 82,
          marketPrice: 180
        })
      });
    });

    it('should return validation error for invalid data', async () => {
      const invalidData = {
        name: '', // Empty name
        points: -5, // Negative points
        position: 'INVALID_POSITION'
      };

      const response = await request(app)
        .post('/players')
        .send(invalidData);

      expect(response.status).toBe(400);
    });

    it('should handle database errors', async () => {
      mockedPrisma.player.create.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/players')
        .send(validPlayerData);

      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        success: false,
        error: 'Failed to create player'
      });
    });
  });

  describe('PUT /players/:id', () => {
    const updateData = {
      name: 'Updated Player',
      points: 90,
      marketPrice: 250
    };

    it('should update player successfully', async () => {
      const mockExistingPlayer = {
        id: 'player-1',
        name: 'Test Player',
        imageUrl: '/images/player1.jpg',
        points: 85,
        position: 'ST',
        color: 'red',
        marketPrice: 200,
        theme: 'premium',
        percentage: 75,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockUpdatedPlayer = {
        ...mockExistingPlayer,
        ...updateData,
        updatedAt: new Date()
      };

      mockedPrisma.player.findUnique.mockResolvedValue(mockExistingPlayer);
      mockedPrisma.player.update.mockResolvedValue(mockUpdatedPlayer);

      const response = await request(app)
        .put('/players/player-1')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: 'player-1',
        name: 'Updated Player',
        points: 90,
        marketPrice: 250
      });

      expect(mockedPrisma.player.update).toHaveBeenCalledWith({
        where: { id: 'player-1' },
        data: updateData
      });
    });

    it('should return error for non-existent player', async () => {
      mockedPrisma.player.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .put('/players/nonexistent')
        .send(updateData);

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        success: false,
        error: 'Player not found'
      });
    });
  });

  describe('DELETE /players/:id', () => {
    it('should delete player successfully', async () => {
      const mockExistingPlayer = {
        id: 'player-1',
        name: 'Test Player',
        imageUrl: '/images/player1.jpg',
        points: 85,
        position: 'ST',
        color: 'red',
        marketPrice: 200,
        theme: 'premium',
        percentage: 75,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockedPrisma.player.findUnique.mockResolvedValue(mockExistingPlayer);
      mockedPrisma.player.delete.mockResolvedValue(mockExistingPlayer);

      const response = await request(app)
        .delete('/players/player-1');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        message: 'Player deleted successfully'
      });

      expect(mockedPrisma.player.delete).toHaveBeenCalledWith({
        where: { id: 'player-1' }
      });
    });

    it('should return error for non-existent player', async () => {
      mockedPrisma.player.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .delete('/players/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        success: false,
        error: 'Player not found'
      });
    });
  });
});