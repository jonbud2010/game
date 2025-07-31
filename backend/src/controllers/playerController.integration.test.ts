import request from 'supertest';
import { app } from '../index';
import { prisma } from '../db/client';

// Mock JWT middleware for admin user
jest.mock('../middleware/auth', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    req.user = { id: 'admin-user-id', role: 'ADMIN' };
    next();
  },
  requireAdmin: (req: any, res: any, next: any) => {
    next();
  }
}));

describe('Player Controller Integration Tests', () => {
  beforeAll(async () => {
    // Clean up test data
    await prisma.player.deleteMany({
      where: { name: { startsWith: 'Test' } }
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.player.deleteMany({
      where: { name: { startsWith: 'Test' } }
    });
    await prisma.$disconnect();
  });

  describe('POST /api/players', () => {
    it('should create a player with FormData', async () => {
      const response = await request(app)
        .post('/api/players')
        .field('name', 'Test Player Integration')
        .field('points', '85')
        .field('position', 'ST')
        .field('color', 'RED')
        .field('marketPrice', '100')
        .field('theme', 'Test Theme')
        .field('percentage', '0.05')
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Player created successfully',
        data: expect.objectContaining({
          name: 'Test Player Integration',
          points: 85,
          position: 'ST',
          color: 'RED',
          marketPrice: 100,
          theme: 'Test Theme',
          percentage: 0.05
        })
      });

      // Verify player was created in database
      const createdPlayer = await prisma.player.findFirst({
        where: { name: 'Test Player Integration' }
      });
      expect(createdPlayer).toBeTruthy();
    });

    it('should handle validation errors', async () => {
      const response = await request(app)
        .post('/api/players')
        .field('name', '') // Invalid: empty name
        .field('points', '85')
        .field('position', 'ST')
        .field('color', 'RED')
        .field('marketPrice', '100')
        .field('theme', 'Test Theme')
        .field('percentage', '0.05')
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Validation error'
      });
    });

    it('should handle invalid position', async () => {
      const response = await request(app)
        .post('/api/players')
        .field('name', 'Test Invalid Position')
        .field('points', '85')
        .field('position', 'INVALID') // Invalid position
        .field('color', 'RED')
        .field('marketPrice', '100')
        .field('theme', 'Test Theme')
        .field('percentage', '0.05')
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Validation error'
      });
    });
  });

  describe('GET /api/players', () => {
    it('should return all players', async () => {
      const response = await request(app)
        .get('/api/players')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array),
        count: expect.any(Number)
      });
    });
  });

  describe('PUT /api/players/:id', () => {
    it('should update an existing player', async () => {
      // First create a player
      const createResponse = await request(app)
        .post('/api/players')
        .field('name', 'Test Player for Update')
        .field('points', '75')
        .field('position', 'CM')
        .field('color', 'BLUE')
        .field('marketPrice', '120')
        .field('theme', 'Update Theme')
        .field('percentage', '0.04')
        .expect(201);

      const playerId = createResponse.body.data.id;

      // Update the player
      const updateResponse = await request(app)
        .put(`/api/players/${playerId}`)
        .field('name', 'Test Player Updated')
        .field('points', '90')
        .field('position', 'CAM')
        .field('color', 'GREEN')
        .field('marketPrice', '150')
        .field('theme', 'Updated Theme')
        .field('percentage', '0.06')
        .expect(200);

      expect(updateResponse.body).toMatchObject({
        success: true,
        message: 'Player updated successfully',
        data: expect.objectContaining({
          id: playerId,
          name: 'Test Player Updated',
          points: 90,
          position: 'CAM',
          color: 'GREEN',
          marketPrice: 150,
          theme: 'Updated Theme',
          percentage: 0.06
        })
      });
    });

    it('should return 404 for non-existent player', async () => {
      const response = await request(app)
        .put('/api/players/non-existent-id')
        .field('name', 'Test Update')
        .field('points', '75')
        .field('position', 'ST')
        .field('color', 'RED')
        .field('marketPrice', '100')
        .field('theme', 'Test')
        .field('percentage', '0.05')
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'Player not found'
      });
    });
  });

  describe('DELETE /api/players/:id', () => {
    it('should delete an existing player', async () => {
      // First create a player
      const createResponse = await request(app)
        .post('/api/players')
        .field('name', 'Test Player for Delete')
        .field('points', '70')
        .field('position', 'GK')
        .field('color', 'YELLOW')
        .field('marketPrice', '80')
        .field('theme', 'Delete Theme')
        .field('percentage', '0.03')
        .expect(201);

      const playerId = createResponse.body.data.id;

      // Delete the player
      const deleteResponse = await request(app)
        .delete(`/api/players/${playerId}`)
        .expect(200);

      expect(deleteResponse.body).toMatchObject({
        success: true,
        message: 'Player deleted successfully',
        data: { id: playerId }
      });

      // Verify player was deleted
      const deletedPlayer = await prisma.player.findUnique({
        where: { id: playerId }
      });
      expect(deletedPlayer).toBeNull();
    });

    it('should return 404 for non-existent player', async () => {
      const response = await request(app)
        .delete('/api/players/non-existent-id')
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'Player not found'
      });
    });
  });
});

describe('FormData Validation Integration', () => {
  it('should properly convert FormData strings to numbers', async () => {
    const response = await request(app)
      .post('/api/players')
      .field('name', 'Test FormData Types')
      .field('points', '95') // String that should be converted to number
      .field('position', 'ST')
      .field('color', 'PURPLE')
      .field('marketPrice', '200') // String that should be converted to number
      .field('theme', 'FormData Test')
      .field('percentage', '0.08') // String that should be converted to float
      .expect(201);

    expect(response.body.data).toMatchObject({
      points: 95, // Should be number, not string
      marketPrice: 200, // Should be number, not string
      percentage: 0.08 // Should be float, not string
    });
  });

  it('should handle invalid numeric strings', async () => {
    const response = await request(app)
      .post('/api/players')
      .field('name', 'Test Invalid Numbers')
      .field('points', 'not-a-number') // Invalid numeric string
      .field('position', 'ST')
      .field('color', 'RED')
      .field('marketPrice', '100')
      .field('theme', 'Invalid Test')
      .field('percentage', '0.05')
      .expect(400);

    expect(response.body).toMatchObject({
      error: 'Validation error'
    });
  });
});