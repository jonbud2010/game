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

    it('should reject lobby creation with name too short', async () => {
      const lobbyData = {
        name: 'AB' // Too short (less than 3 characters)
      };

      const response = await request(app)
        .post('/api/lobbies')
        .set('Authorization', `Bearer ${playerToken}`)
        .send(lobbyData)
        .expect(400);

      expect(response.body.error).toBe('Validation error');
      expect(response.body.details).toContain('3 characters long');
    });

    it('should reject lobby creation with invalid characters', async () => {
      const lobbyData = {
        name: 'Test@Lobby!' // Invalid special characters
      };

      const response = await request(app)
        .post('/api/lobbies')
        .set('Authorization', `Bearer ${playerToken}`)
        .send(lobbyData)
        .expect(400);

      expect(response.body.error).toBe('Validation error');
      expect(response.body.details).toContain('letters, numbers, spaces, hyphens, and underscores');
    });

    it('should accept lobby creation with valid special characters', async () => {
      const lobbyData = {
        name: 'Test-Lobby_123' // Valid characters
      };

      const response = await request(app)
        .post('/api/lobbies')
        .set('Authorization', `Bearer ${playerToken}`)
        .send(lobbyData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Test-Lobby_123');
    });

    it('should trim whitespace from lobby names', async () => {
      const lobbyData = {
        name: '  Test Lobby  ' // Name with leading/trailing whitespace
      };

      const response = await request(app)
        .post('/api/lobbies')
        .set('Authorization', `Bearer ${playerToken}`)
        .send(lobbyData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Test Lobby'); // Trimmed
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

      expect(response.body.error).toBe('Lobby is not accepting new members');
    });

    it('should automatically set lobby to IN_PROGRESS when 4th player joins', async () => {
      // Use the existing test lobby and fill it up step by step
      const players = [];
      
      // Register 4 new players
      for (let i = 0; i < 4; i++) {
        const player = await request(app)
          .post('/api/auth/register')
          .send({
            username: `joinplayer${i}`,
            email: `joinplayer${i}@test.com`,
            password: 'password123'
          });
        players.push(player.body.token);
      }

      // Add first 3 players
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post(`/api/lobbies/${testLobby.id}/join`)
          .set('Authorization', `Bearer ${players[i]}`)
          .expect(200);
      }

      // 4th player joins - should trigger IN_PROGRESS
      const response = await request(app)
        .post(`/api/lobbies/${testLobby.id}/join`)
        .set('Authorization', `Bearer ${players[3]}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('IN_PROGRESS');
      expect(response.body.data.members).toHaveLength(4);
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

    it('should reject leaving lobby when game is IN_PROGRESS', async () => {
      // Create lobby and add player
      const inProgressLobby = await testDb.lobby.create({
        data: {
          name: 'In Progress Lobby',
          maxPlayers: 4,
          status: 'IN_PROGRESS'
        }
      });

      const member = await testDb.user.findFirst({
        where: { username: 'lobbyplayer' }
      });

      await testDb.lobbyMember.create({
        data: {
          lobbyId: inProgressLobby.id,
          userId: member!.id
        }
      });

      const response = await request(app)
        .post(`/api/lobbies/${inProgressLobby.id}/leave`)
        .set('Authorization', `Bearer ${playerToken}`)
        .expect(400);

      expect(response.body.error).toBe('Cannot leave lobby while game is in progress');
    });

    it('should delete lobby when last member leaves', async () => {
      // Create lobby with single member
      const singleMemberLobby = await testDb.lobby.create({
        data: {
          name: 'Single Member Lobby',
          maxPlayers: 4,
          status: 'WAITING'
        }
      });

      const member = await testDb.user.findFirst({
        where: { username: 'lobbyplayer' }
      });

      await testDb.lobbyMember.create({
        data: {
          lobbyId: singleMemberLobby.id,
          userId: member!.id
        }
      });

      // Leave the lobby
      const response = await request(app)
        .post(`/api/lobbies/${singleMemberLobby.id}/leave`)
        .set('Authorization', `Bearer ${playerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Left lobby successfully');

      // Verify lobby was deleted
      const deletedLobby = await testDb.lobby.findUnique({
        where: { id: singleMemberLobby.id }
      });

      expect(deletedLobby).toBeNull();
    });
  });
});