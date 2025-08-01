/**
 * Player Controller Integration Tests
 * Tests mit echter SQLite Database - Player CRUD und Collection Workflow
 */

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { testDb, createTestUsers, createTestPlayers } from '../../jest.integration.setup';
import { playerRoutes } from '../routes/playerRoutes';
import { authRoutes } from '../routes/authRoutes';

// Express App für Integration Tests
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/players', playerRoutes);

describe('Player Integration Tests', () => {
  let playerToken: string;
  let adminToken: string;
  let testPlayers: any[];

  beforeEach(async () => {
    // Create authentication tokens
    const playerRegister = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'playeruser',
        email: 'playeruser@test.com',
        password: 'password123'
      });
    playerToken = playerRegister.body.token;

    const adminRegister = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'playeradmin',
        email: 'playeradmin@test.com',
        password: 'password123'
      });
    
    // Update admin role
    await testDb.user.update({
      where: { email: 'playeradmin@test.com' },
      data: { role: 'ADMIN' }
    });
    adminToken = adminRegister.body.token;

    testPlayers = await createTestPlayers();
  });

  describe('GET /api/players', () => {
    it('should return all players for any authenticated user', async () => {
      const response = await request(app)
        .get('/api/players')
        .set('Authorization', `Bearer ${playerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.count).toBe(3);

      const players = response.body.data;
      expect(players).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Test Goalkeeper',
            position: 'GK',
            color: 'DUNKELGRÜN',
            points: 85
          }),
          expect.objectContaining({
            name: 'Test Defender',
            position: 'CB',
            color: 'HELLBLAU',
            points: 80
          }),
          expect.objectContaining({
            name: 'Test Midfielder',
            position: 'CM',
            color: 'ROT',
            points: 90
          })
        ])
      );
    });

    it('should allow unauthenticated access to player list', async () => {
      const response = await request(app)
        .get('/api/players')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
    });
  });

  describe('GET /api/players/collection/my', () => {
    beforeEach(async () => {
      // Add some players to user collection
      const user = await testDb.user.findFirst({
        where: { username: 'playeruser' }
      });

      await testDb.userPlayer.create({
        data: {
          userId: user!.id,
          playerId: testPlayers[0].id
        }
      });

      await testDb.userPlayer.create({
        data: {
          userId: user!.id,
          playerId: testPlayers[1].id
        }
      });
    });

    it('should return user\'s player collection', async () => {
      const response = await request(app)
        .get('/api/players/collection/my')
        .set('Authorization', `Bearer ${playerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.count).toBe(2);

      const collection = response.body.data;
      expect(collection[0]).toMatchObject({
        id: expect.any(String),
        playerId: expect.any(String),
        acquiredAt: expect.any(String),
        player: expect.objectContaining({
          name: expect.any(String),
          position: expect.any(String),
          points: expect.any(Number)
        })
      });

      // Should be ordered by acquired date (newest first)
      const dates = collection.map((c: any) => new Date(c.acquiredAt));
      expect(dates[0].getTime()).toBeGreaterThanOrEqual(dates[1].getTime());
    });

    it('should return empty collection for new user', async () => {
      const newUser = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newcollectionuser',
          email: 'newcollectionuser@test.com',
          password: 'password123'
        });

      const response = await request(app)
        .get('/api/players/collection/my')
        .set('Authorization', `Bearer ${newUser.body.token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
      expect(response.body.count).toBe(0);
    });

    it('should reject unauthenticated access to collection', async () => {
      const response = await request(app)
        .get('/api/players/collection/my')
        .expect(401);

      expect(response.body.error).toBe('User not authenticated');
    });
  });

  describe('Admin Player Management', () => {
    describe('POST /api/players', () => {
      it('should allow admin to create new player', async () => {
        const playerData = {
          name: 'Integration Test Player',
          points: 88,
          position: 'LW',
          color: 'GELB',
          marketPrice: 120,
          theme: 'Integration Test',
          percentage: 0.08
        };

        const response = await request(app)
          .post('/api/players')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(playerData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toMatchObject({
          name: 'Integration Test Player',
          points: 88,  
          position: 'LW',
          color: 'GELB',
          marketPrice: 120,
          theme: 'Integration Test',
          percentage: 0.08,
          imageUrl: '/images/players/default.jpg'
        });

        // Verify player was created in database
        const createdPlayer = await testDb.player.findFirst({
          where: { name: 'Integration Test Player' }
        });

        expect(createdPlayer).toBeTruthy();
        expect(createdPlayer!.color).toBe('GELB');
      });

      it('should reject player creation by non-admin', async () => {
        const playerData = {
          name: 'Unauthorized Player',
          points: 85,
          position: 'ST',
          color: 'ROT',
          marketPrice: 100,
          theme: 'Test'
        };

        const response = await request(app)
          .post('/api/players')
          .set('Authorization', `Bearer ${playerToken}`)
          .send(playerData)
          .expect(403);

        expect(response.body.error).toBe('Admin access required');
      });
    });
  });
});