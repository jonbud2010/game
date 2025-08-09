/**
 * Team Controller Integration Tests
 * Tests team creation and validation with Liga Phase rules
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { testDb as prisma } from '../../vitest.integration.setup';
import teamRoutes from '../routes/teamRoutes';
import authRoutes from '../routes/authRoutes';
import { setTestDatabase, clearTestDatabase } from '../middleware/auth';
import { PLAYER_POSITIONS_ENUM, DUMMY_PLAYER_SETTINGS } from '@football-tcg/shared';

// Express App für Integration Tests
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/teams', teamRoutes);

describe('Team Controller Integration - Liga Phase Rules', () => {
  const testUserId = 'team-integration-user';
  const testLobbyId = 'team-integration-lobby';
  const testFormationId = 'team-integration-formation';
  let authToken = '';

  beforeAll(async () => {
    // Set up test database for middleware
    setTestDatabase(prisma);
  });

  beforeEach(async () => {
    // Create dummy players first (required for team creation)
    for (const position of PLAYER_POSITIONS_ENUM) {
      await prisma.player.upsert({
        where: { id: `dummy-${position.toLowerCase()}` },
        update: {},
        create: {
          id: `dummy-${position.toLowerCase()}`,
          name: `Dummy ${position}`,
          imageUrl: DUMMY_PLAYER_SETTINGS.IMAGE_URL,
          points: DUMMY_PLAYER_SETTINGS.POINTS,
          position: position,
          color: DUMMY_PLAYER_SETTINGS.COLOR,
          marketPrice: DUMMY_PLAYER_SETTINGS.MARKET_PRICE,
          theme: DUMMY_PLAYER_SETTINGS.THEME,
          percentage: DUMMY_PLAYER_SETTINGS.PERCENTAGE,
        },
      });
    }

    // Create test user (after database cleanup)
    const passwordHash = await bcrypt.hash('testpass123', 12);
    const testUserEmail = 'teamuser@test.com';
    await prisma.user.upsert({
      where: { id: testUserId },
      update: {},
      create: {
        id: testUserId,
        username: 'teamuser',
        email: testUserEmail,
        passwordHash,
      },
    });

    // Create test lobby
    await prisma.lobby.upsert({
      where: { id: testLobbyId },
      update: {},
      create: {
        id: testLobbyId,
        name: 'Team Integration Test Lobby',
        adminId: testUserId,
      },
    });

    // Add user to lobby
    await prisma.lobbyMember.upsert({
      where: { 
        lobbyId_userId: { 
          lobbyId: testLobbyId, 
          userId: testUserId 
        } 
      },
      update: {},
      create: {
        lobbyId: testLobbyId,
        userId: testUserId,
      },
    });

    // Create test formation
    await prisma.formation.upsert({
      where: { id: testFormationId },
      update: {},
      create: {
        id: testFormationId,
        name: 'Integration 4-3-3',
        imageUrl: '/integration-formation.png',
        positions: JSON.stringify(['GK', 'LB', 'CB', 'CB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'ST', 'RW']),
      },
    });

    // Login to get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUserEmail,
        password: 'testpass123',
      });

    if (loginResponse.status === 200 && loginResponse.body.token) {
      authToken = loginResponse.body.token;
      console.log('✅ Got auth token from login:', authToken.substring(0, 20) + '...');
    } else {
      console.log('❌ Login failed, creating token manually. Status:', loginResponse.status, 'Body:', loginResponse.body);
      // Fallback: create JWT manually for testing
      authToken = jwt.sign(
        { userId: testUserId },
        process.env.JWT_SECRET || 'test-jwt-secret-key-for-integration-tests',
        { expiresIn: '1h' }
      );
      console.log('🔧 Created manual token:', authToken.substring(0, 20) + '...');
    }
  });

  afterAll(async () => {
    // Clear test database override
    clearTestDatabase();
    
    // Cleanup - testDb cleanup is handled by vitest.integration.setup
    await prisma.teamPlayer.deleteMany({});
    await prisma.team.deleteMany({});
    await prisma.lobbyMember.deleteMany({ where: { lobbyId: testLobbyId } });
    await prisma.formation.deleteMany({ where: { id: testFormationId } });
    await prisma.lobby.deleteMany({ where: { id: testLobbyId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });
  });

  test('should create team with dummy players automatically', async () => {
    const response = await request(app)
      .post('/api/teams')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        lobbyId: testLobbyId,
        formationId: testFormationId,
        name: 'Test Team with Dummies',
        matchDay: 1,
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.data.teamPlayers).toHaveLength(11);

    // Check that all players are dummy players
    const teamPlayers = response.body.data.teamPlayers;
    teamPlayers.forEach((tp: any) => {
      expect(tp.player.theme).toBe(DUMMY_PLAYER_SETTINGS.THEME);
      expect(tp.player.id).toMatch(/^dummy-/);
      expect(tp.player.color).toBe(DUMMY_PLAYER_SETTINGS.COLOR);
      expect(tp.player.points).toBe(DUMMY_PLAYER_SETTINGS.POINTS);
    });
  });

  test('should prevent using the same real player in multiple teams for same matchday', async () => {
    // First, create a real player and assign it to user
    const realPlayerId = 'real-player-unique-test';
    await prisma.player.create({
      data: {
        id: realPlayerId,
        name: 'Real Test Player',
        imageUrl: '/real-player.png',
        points: 85,
        position: 'ST',
        color: 'RED',
        marketPrice: 1500,
        theme: 'Premium',
        percentage: 0.06,
      },
    });

    await prisma.userPlayer.create({
      data: {
        userId: testUserId,
        playerId: realPlayerId,
      },
    });

    // Create first team with the real player
    const team1Response = await request(app)
      .post('/api/teams')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        lobbyId: testLobbyId,
        formationId: testFormationId,
        name: 'Team 1 with Real Player',
        matchDay: 2,
        players: [
          // Formation positions: GK, LB, CB, CB, RB, CDM, CM, CAM, LW, ST, RW
          { playerId: `dummy-gk`, points: 50, color: 'CYAN' },
          { playerId: `dummy-lb`, points: 50, color: 'CYAN' },
          { playerId: `dummy-cb`, points: 50, color: 'CYAN' },
          { playerId: `dummy-cb`, points: 50, color: 'CYAN' },
          { playerId: `dummy-rb`, points: 50, color: 'CYAN' },
          { playerId: `dummy-cdm`, points: 50, color: 'CYAN' },
          { playerId: `dummy-cm`, points: 50, color: 'CYAN' },
          { playerId: `dummy-cam`, points: 50, color: 'CYAN' },
          { playerId: `dummy-lw`, points: 50, color: 'CYAN' },
          { playerId: realPlayerId, points: 85, color: 'RED' }, // ST position
          { playerId: `dummy-rw`, points: 50, color: 'CYAN' },
        ],
      });

    if (team1Response.status !== 201) {
      console.log('DEBUG: team1Response.status:', team1Response.status);
      console.log('DEBUG: team1Response.body:', team1Response.body);
    }
    expect(team1Response.status).toBe(201);

    // Try to create second team with same real player - should fail
    const team2Response = await request(app)
      .post('/api/teams')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        lobbyId: testLobbyId,
        formationId: testFormationId,
        name: 'Team 2 with Same Real Player',
        matchDay: 2,
        players: [
          // Formation positions: GK, LB, CB, CB, RB, CDM, CM, CAM, LW, ST, RW
          { playerId: `dummy-gk`, points: 50, color: 'CYAN' },
          { playerId: `dummy-lb`, points: 50, color: 'CYAN' },
          { playerId: `dummy-cb`, points: 50, color: 'CYAN' },
          { playerId: `dummy-cb`, points: 50, color: 'CYAN' },
          { playerId: `dummy-rb`, points: 50, color: 'CYAN' },
          { playerId: `dummy-cdm`, points: 50, color: 'CYAN' },
          { playerId: `dummy-cm`, points: 50, color: 'CYAN' },
          { playerId: `dummy-cam`, points: 50, color: 'CYAN' },
          { playerId: `dummy-lw`, points: 50, color: 'CYAN' },
          { playerId: realPlayerId, points: 85, color: 'RED' }, // ST position
          { playerId: `dummy-rw`, points: 50, color: 'CYAN' },
        ],
      });

    expect(team2Response.status).toBe(409);
    expect(team2Response.body.error).toBe('Player uniqueness violation');
    expect(team2Response.body.details[0]).toContain('already used in team');

    // Cleanup
    await prisma.userPlayer.deleteMany({ where: { playerId: realPlayerId } });
    await prisma.player.deleteMany({ where: { id: realPlayerId } });
  });

  test('should allow using same dummy player in multiple teams', async () => {
    // Create two teams with the same dummy players - should succeed
    const team1Response = await request(app)
      .post('/api/teams')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        lobbyId: testLobbyId,
        formationId: testFormationId,
        name: 'Team 1 with Dummies',
        matchDay: 3,
      });

    expect(team1Response.status).toBe(201);

    const team2Response = await request(app)
      .post('/api/teams')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        lobbyId: testLobbyId,
        formationId: testFormationId,
        name: 'Team 2 with Dummies',
        matchDay: 4,
      });

    expect(team2Response.status).toBe(201);

    // Both should have dummy players
    expect(team1Response.body.data.teamPlayers).toHaveLength(11);
    expect(team2Response.body.data.teamPlayers).toHaveLength(11);
  });
});