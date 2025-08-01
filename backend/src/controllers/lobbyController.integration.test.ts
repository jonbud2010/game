/**
 * Lobby Controller Integration Tests
 * Tests mit echter SQLite Database - Complete Lobby Workflow
 */

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { testDb } from '../../vitest.integration.setup';
import lobbyRoutes from '../routes/lobbyRoutes';
import authRoutes from '../routes/authRoutes';

// Express App für Integration Tests
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/lobbies', lobbyRoutes);

describe('Lobby Integration Tests', () => {
  let playerUser: any;
  let adminUser: any;
  let playerToken: string;
  let adminToken: string;

  beforeEach(async () => {
    // Create real authentication tokens
    const playerRegister = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'lobbyplayer',
        email: 'lobbyplayer@test.com',
        password: 'password123'
      });
    playerToken = playerRegister.body.token;
    playerUser = playerRegister.body.user;

    const adminRegister = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'lobbyadmin',
        email: 'lobbyadmin@test.com',
        password: 'password123'
      });
    
    // Update admin role in database
    await testDb.user.update({
      where: { email: 'lobbyadmin@test.com' },
      data: { role: 'ADMIN' }
    });
    adminToken = adminRegister.body.token;
    adminUser = adminRegister.body.user;
  });

  describe('POST /api/lobbies', () => {
    it('should create a new lobby with valid data', async () => {
      const lobbyData = {
        name: 'Test Lobby'
      };

      const response = await request(app)
        .post('/api/lobbies')
        .set('Authorization', `Bearer ${playerToken}`)
        .send(lobbyData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        name: 'Test Lobby',
        maxPlayers: 4,
        status: 'WAITING',
        members: expect.arrayContaining([
          expect.objectContaining({
            username: 'lobbyplayer'
          })
        ])
      });

      // Verify lobby was created in database
      const createdLobby = await testDb.lobby.findFirst({
        where: { name: 'Test Lobby' },
        include: { members: true }
      });

      expect(createdLobby).toBeTruthy();
      expect(createdLobby?.members).toHaveLength(1);
    });

    it('should reject lobby creation without authentication', async () => {
      const lobbyData = {
        name: 'Unauthorized Lobby'
      };

      const response = await request(app)
        .post('/api/lobbies')
        .send(lobbyData)
        .expect(401);

      expect(response.body.error).toBe('Access denied. No token provided.');
    });

    it('should reject lobby creation with invalid data', async () => {
      const lobbyData = {
        name: '' // Empty name
      };

      const response = await request(app)
        .post('/api/lobbies')
        .set('Authorization', `Bearer ${playerToken}`)
        .send(lobbyData)
        .expect(400);

      expect(response.body.error).toBe('Validation error');
    });
  });

  describe('GET /api/lobbies', () => {
    let testLobby: any;

    beforeEach(async () => {
      // Create test lobby
      testLobby = await testDb.lobby.create({
        data: {
          name: 'Integration Test Lobby',
          maxPlayers: 4,
          status: 'WAITING'
        }
      });

      await testDb.lobbyMember.create({
        data: {
          lobbyId: testLobby.id,
          userId: playerUser.id
        }
      });
    });

    it('should return all lobbies for authenticated user', async () => {
      const response = await request(app)
        .get('/api/lobbies')
        .set('Authorization', `Bearer ${playerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      const lobby = response.body.data.find((l: any) => l.name === 'Integration Test Lobby');
      expect(lobby).toBeTruthy();
      expect(lobby.maxPlayers).toBe(4);
      expect(lobby.status).toBe('WAITING');
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/lobbies')
        .expect(401);

      expect(response.body.error).toBe('Access denied. No token provided.');
    });
  });

  describe('POST /api/lobbies/:id/join', () => {
    let testLobby: any;
    let secondPlayerToken: string;

    beforeEach(async () => {
      // Create test lobby
      testLobby = await testDb.lobby.create({
        data: {
          name: 'Joinable Lobby',
          maxPlayers: 4,
          status: 'WAITING'
        }
      });

      // Create second player
      const secondPlayer = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'secondplayer',
          email: 'secondplayer@test.com',
          password: 'password123'
        });
      secondPlayerToken = secondPlayer.body.token;
    });

    it('should allow player to join available lobby', async () => {
      const response = await request(app)
        .post(`/api/lobbies/${testLobby.id}/join`)
        .set('Authorization', `Bearer ${secondPlayerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.members).toHaveLength(1);

      // Verify membership in database
      const lobbyMember = await testDb.lobbyMember.findFirst({
        where: {
          lobbyId: testLobby.id,
          user: { username: 'secondplayer' }
        }
      });

      expect(lobbyMember).toBeTruthy();
    });

    it('should reject joining non-existent lobby', async () => {
      const response = await request(app)
        .post('/api/lobbies/nonexistent-id/join')
        .set('Authorization', `Bearer ${secondPlayerToken}`)
        .expect(404);

      expect(response.body.error).toBe('Lobby not found');
    });

    it('should reject joining lobby when already a member', async () => {
      // First join
      await request(app)
        .post(`/api/lobbies/${testLobby.id}/join`)
        .set('Authorization', `Bearer ${secondPlayerToken}`)
        .expect(200);

      // Try to join again
      const response = await request(app)
        .post(`/api/lobbies/${testLobby.id}/join`)
        .set('Authorization', `Bearer ${secondPlayerToken}`)
        .expect(400);

      expect(response.body.error).toBe('You are already in an active lobby');
    });

    it('should reject joining full lobby', async () => {
      // Fill lobby to capacity (4 players)
      const players = [];
      for (let i = 0; i < 4; i++) {
        const player = await request(app)
          .post('/api/auth/register')
          .send({
            username: `player${i}`,
            email: `player${i}@test.com`,
            password: 'password123'
          });
        
        await request(app)
          .post(`/api/lobbies/${testLobby.id}/join`)
          .set('Authorization', `Bearer ${player.body.token}`)
          .expect(200);
      }

      // Try to join full lobby
      const extraPlayer = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'extraplayer',
          email: 'extraplayer@test.com',
          password: 'password123'
        });

      const response = await request(app)
        .post(`/api/lobbies/${testLobby.id}/join`)
        .set('Authorization', `Bearer ${extraPlayer.body.token}`)
        .expect(400);

      expect(response.body.error).toBe('Lobby is full');
    });
  });

  describe('POST /api/lobbies/:id/leave', () => {
    let testLobby: any;
    let lobbyMember: any;

    beforeEach(async () => {
      // Create lobby and add player
      testLobby = await testDb.lobby.create({
        data: {
          name: 'Leavable Lobby',
          maxPlayers: 4,
          status: 'WAITING'
        }
      });

      const member = await testDb.user.findFirst({
        where: { username: 'lobbyplayer' }
      });

      lobbyMember = await testDb.lobbyMember.create({
        data: {
          lobbyId: testLobby.id,
          userId: member!.id
        }
      });
    });

    it('should allow player to leave lobby', async () => {
      const response = await request(app)
        .post(`/api/lobbies/${testLobby.id}/leave`)
        .set('Authorization', `Bearer ${playerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Left lobby successfully');

      // Verify membership removed from database
      const remainingMember = await testDb.lobbyMember.findFirst({
        where: {
          lobbyId: testLobby.id,
          userId: lobbyMember.userId
        }
      });

      expect(remainingMember).toBeNull();
    });

    it('should reject leaving lobby when not a member', async () => {
      const nonMember = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'nonmember',
          email: 'nonmember@test.com',
          password: 'password123'
        });

      const response = await request(app)
        .post(`/api/lobbies/${testLobby.id}/leave`)
        .set('Authorization', `Bearer ${nonMember.body.token}`)
        .expect(400);

      expect(response.body.error).toBe('You are not a member of this lobby');
    });

    it('should reject leaving non-existent lobby', async () => {
      const response = await request(app)
        .post('/api/lobbies/nonexistent-id/leave')
        .set('Authorization', `Bearer ${playerToken}`)
        .expect(400);

      expect(response.body.error).toBe('You are not a member of this lobby');
    });
  });
});