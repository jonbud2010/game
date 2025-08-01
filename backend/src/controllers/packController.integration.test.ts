/**
 * Pack Controller Integration Tests
 * Tests mit echter SQLite Database - Complete Pack Opening Workflow
 */

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { testDb, createTestUsers, createTestPlayers, createTestPack } from '../../jest.integration.setup';
import { packRoutes } from '../routes/packRoutes';
import { authRoutes } from '../routes/authRoutes';

// Express App für Integration Tests
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/packs', packRoutes);

describe('Pack Integration Tests', () => {
  let playerToken: string;
  let adminToken: string;
  let testPlayers: any[];
  let testPack: any;

  beforeEach(async () => {
    // Create authentication tokens
    const playerRegister = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'packplayer',
        email: 'packplayer@test.com',
        password: 'password123'
      });
    playerToken = playerRegister.body.token;

    const adminRegister = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'packadmin',
        email: 'packadmin@test.com',
        password: 'password123'
      });
    
    // Update admin role
    await testDb.user.update({
      where: { email: 'packadmin@test.com' },
      data: { role: 'ADMIN' }
    });
    adminToken = adminRegister.body.token;

    // Create test data
    testPlayers = await createTestPlayers();
    testPack = await createTestPack(testPlayers);
  });

  describe('GET /api/packs/available', () => {
    it('should return available packs for purchase', async () => {
      const response = await request(app)
        .get('/api/packs/available')
        .set('Authorization', `Bearer ${playerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data).toHaveLength(1);

      const pack = response.body.data[0];
      expect(pack).toMatchObject({
        name: 'Test Pack',
        price: 100,
        playerCount: 3,
        status: 'ACTIVE'
      });
      
      // Should not expose internal pack details
      expect(pack.packPlayers).toBeUndefined();
    });

    it('should not return inactive packs', async () => {
      // Create inactive pack
      await testDb.pack.create({
        data: {
          name: 'Inactive Pack',
          imageUrl: '/test/inactive.jpg',
          price: 200,
          status: 'INACTIVE'
        }
      });

      const response = await request(app)
        .get('/api/packs/available')
        .set('Authorization', `Bearer ${playerToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Test Pack');
    });
  });

  describe('POST /api/packs/:id/open', () => {
    it('should successfully open pack and draw player', async () => {
      // Ensure user has enough coins
      const user = await testDb.user.findFirst({
        where: { username: 'packplayer' }
      });
      
      await testDb.user.update({
        where: { id: user!.id },
        data: { coins: 500 }
      });

      const response = await request(app)
        .post(`/api/packs/${testPack.id}/open`)
        .set('Authorization', `Bearer ${playerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        coinsSpent: 100,
        remainingCoins: 400,
        remainingPlayersInPack: 2,
        packNowEmpty: false
      });

      expect(response.body.data.drawnPlayer).toBeDefined();
      expect(['Test Goalkeeper', 'Test Defender', 'Test Midfielder'])
        .toContain(response.body.data.drawnPlayer.name);

      // Verify player was added to user collection
      const userPlayer = await testDb.userPlayer.findFirst({
        where: {
          userId: user!.id,
          playerId: response.body.data.drawnPlayer.id
        }
      });
      expect(userPlayer).toBeTruthy();

      // Verify player was removed from pack
      const remainingPackPlayers = await testDb.packPlayer.count({
        where: { packId: testPack.id }
      });
      expect(remainingPackPlayers).toBe(2);

      // Verify user coins were deducted
      const updatedUser = await testDb.user.findUnique({
        where: { id: user!.id }
      });
      expect(updatedUser!.coins).toBe(400);
    });

    it('should reject pack opening with insufficient coins', async () => {
      // Set user coins below pack price
      const user = await testDb.user.findFirst({
        where: { username: 'packplayer' }
      });
      
      await testDb.user.update({
        where: { id: user!.id },
        data: { coins: 50 }
      });

      const response = await request(app)
        .post(`/api/packs/${testPack.id}/open`)
        .set('Authorization', `Bearer ${playerToken}`)
        .expect(400);

      expect(response.body.error).toBe('Insufficient coins');
      expect(response.body.message).toBe('You need 100 coins to open this pack');
    });

    it('should reject opening non-existent pack', async () => {
      const response = await request(app)
        .post('/api/packs/nonexistent-id/open')
        .set('Authorization', `Bearer ${playerToken}`)
        .expect(404);

      expect(response.body.error).toBe('Pack not found');
    });

    it('should reject opening inactive pack', async () => {
      // Set pack to inactive
      await testDb.pack.update({
        where: { id: testPack.id },
        data: { status: 'INACTIVE' }
      });

      const response = await request(app)
        .post(`/api/packs/${testPack.id}/open`)
        .set('Authorization', `Bearer ${playerToken}`)
        .expect(400);

      expect(response.body.error).toBe('Pack not available');
    });

    it('should mark pack as empty when last player is drawn', async () => {
      const user = await testDb.user.findFirst({
        where: { username: 'packplayer' }
      });
      
      await testDb.user.update({
        where: { id: user!.id },
        data: { coins: 1000 }
      });

      // Open pack until empty
      let packEmptyResponse;
      for (let i = 0; i < 3; i++) {
        packEmptyResponse = await request(app)
          .post(`/api/packs/${testPack.id}/open`)
          .set('Authorization', `Bearer ${playerToken}`)
          .expect(200);
      }

      expect(packEmptyResponse.body.data.packNowEmpty).toBe(true);
      expect(packEmptyResponse.body.data.remainingPlayersInPack).toBe(0);

      // Verify pack status updated in database
      const updatedPack = await testDb.pack.findUnique({
        where: { id: testPack.id }
      });
      expect(updatedPack!.status).toBe('EMPTY');

      // Verify cannot open empty pack
      const emptyPackResponse = await request(app)
        .post(`/api/packs/${testPack.id}/open`)
        .set('Authorization', `Bearer ${playerToken}`)
        .expect(400);
        
      expect(emptyPackResponse.body.error).toBe('Pack not available');
    });

    it('should reject unauthorized pack opening', async () => {
      const response = await request(app)
        .post(`/api/packs/${testPack.id}/open`)
        .expect(401);

      expect(response.body.error).toBe('User not authenticated');
    });
  });

  describe('Admin Pack Management', () => {
    describe('POST /api/packs', () => {
      it('should allow admin to create new pack', async () => {
        const packData = {
          name: 'Admin Created Pack',
          price: 150,
          playerIds: testPlayers.map(p => p.id)
        };

        const response = await request(app)
          .post('/api/packs')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(packData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toMatchObject({
          name: 'Admin Created Pack',
          price: 150,
          status: 'ACTIVE'
        });

        // Verify pack was created in database
        const createdPack = await testDb.pack.findFirst({
          where: { name: 'Admin Created Pack' },
          include: { packPlayers: true }
        });

        expect(createdPack).toBeTruthy();
        expect(createdPack!.packPlayers).toHaveLength(3);
      });

      it('should reject pack creation by non-admin', async () => {
        const packData = {
          name: 'Unauthorized Pack',
          price: 100
        };

        const response = await request(app)
          .post('/api/packs')
          .set('Authorization', `Bearer ${playerToken}`)
          .send(packData)
          .expect(403);

        expect(response.body.error).toBe('Admin access required');
      });
    });

    describe('GET /api/packs', () => {
      it('should allow admin to view all packs with details', async () => {
        const response = await request(app)
          .get('/api/packs')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
        expect(response.body.data).toHaveLength(1);

        const pack = response.body.data[0];
        expect(pack).toMatchObject({
          name: 'Test Pack',
          price: 100,
          playerCount: 3,
          totalPercentage: expect.any(Number)
        });

        expect(pack.players).toBeInstanceOf(Array);
        expect(pack.players).toHaveLength(3);
      });

      it('should reject non-admin access to detailed pack info', async () => {
        const response = await request(app)
          .get('/api/packs')
          .set('Authorization', `Bearer ${playerToken}`)
          .expect(403);

        expect(response.body.error).toBe('Admin access required');
      });
    });
  });

  describe('Pack Drawing Algorithm', () => {
    it('should draw players according to percentage distribution', async () => {
      // Create pack with specific percentage distribution
      const specialPlayers = [];
      
      // High percentage player (should be drawn more often)
      const commonPlayer = await testDb.player.create({
        data: {
          name: 'Common Player',
          imageUrl: '/test/common.jpg',
          points: 70,
          position: 'ST',
          color: 'GELB',
          marketPrice: 50,
          theme: 'Common',
          percentage: 0.7 // 70% chance
        }
      });
      specialPlayers.push(commonPlayer);
      
      // Low percentage player (should be drawn rarely)
      const rarePlayer = await testDb.player.create({
        data: {
          name: 'Rare Player',
          imageUrl: '/test/rare.jpg',
          points: 95,
          position: 'ST',
          color: 'LILA',
          marketPrice: 200,
          theme: 'Rare',
          percentage: 0.3 // 30% chance
        }
      });
      specialPlayers.push(rarePlayer);

      const specialPack = await createTestPack(specialPlayers);

      // Set user with lots of coins for multiple openings
      const user = await testDb.user.findFirst({
        where: { username: 'packplayer' }
      });
      
      await testDb.user.update({
        where: { id: user!.id },
        data: { coins: 10000 }
      });

      // Open pack multiple times to test distribution
      const draws = [];
      for (let i = 0; i < 10; i++) {
        // Re-add players to pack for each test
        await testDb.packPlayer.deleteMany({
          where: { packId: specialPack.id }
        });
        
        for (const player of specialPlayers) {
          await testDb.packPlayer.create({
            data: {
              packId: specialPack.id,
              playerId: player.id
            }
          });
        }

        const response = await request(app)
          .post(`/api/packs/${specialPack.id}/open`)
          .set('Authorization', `Bearer ${playerToken}`);

        draws.push(response.body.data.drawnPlayer.name);
      }

      // Statistical test - common player should appear more than rare player
      const commonDraws = draws.filter(name => name === 'Common Player').length;
      const rareDraws = draws.filter(name => name === 'Rare Player').length;
      
      // With 70%/30% distribution over 10 draws, common should generally be more frequent
      // This is a probabilistic test, so we use a reasonable threshold
      expect(commonDraws).toBeGreaterThan(rareDraws);
    });
  });
});