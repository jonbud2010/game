import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../index';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

describe('Team Controller Integration - Liga Phase Rules', () => {
  const testUserId = 'team-integration-user';
  const testLobbyId = 'team-integration-lobby';
  const testFormationId = 'team-integration-formation';
  let authToken = '';

  beforeAll(async () => {
    // Create test user
    const passwordHash = await bcrypt.hash('testpass123', 12);
    await prisma.user.upsert({
      where: { id: testUserId },
      update: {},
      create: {
        id: testUserId,
        username: `teamuser-${Date.now()}`,
        email: `teamuser-${Date.now()}@test.com`,
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
        email: `teamuser-${Date.now()}@test.com`,
        password: 'testpass123',
      });

    // Since we can't predict the exact email due to timestamp, let's get the token differently
    // Let's create a JWT manually for testing
    const jwt = require('jsonwebtoken');
    authToken = jwt.sign(
      { userId: testUserId },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    // Cleanup
    await prisma.teamPlayer.deleteMany({});
    await prisma.team.deleteMany({});
    await prisma.lobbyMember.deleteMany({ where: { lobbyId: testLobbyId } });
    await prisma.formation.deleteMany({ where: { id: testFormationId } });
    await prisma.lobby.deleteMany({ where: { id: testLobbyId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });
    await prisma.$disconnect();
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
      expect(tp.player.theme).toBe('DUMMY');
      expect(tp.player.id).toMatch(/^dummy-/);
      expect(tp.player.color).toBe('CYAN');
      expect(tp.player.points).toBe(50);
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
          { playerId: realPlayerId, points: 85, color: 'RED' },
          ...Array(10).fill(null).map((_, i) => ({ 
            playerId: `dummy-${['gk', 'cb', 'lb', 'rb', 'cdm', 'cm', 'cam', 'lw', 'rw', 'st'][i]}`, 
            points: 50, 
            color: 'CYAN' 
          }))
        ],
      });

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
          { playerId: realPlayerId, points: 85, color: 'RED' },
          ...Array(10).fill(null).map((_, i) => ({ 
            playerId: `dummy-${['gk', 'cb', 'lb', 'rb', 'cdm', 'cm', 'cam', 'lw', 'rw', 'cf'][i]}`, 
            points: 50, 
            color: 'CYAN' 
          }))
        ],
      });

    expect(team2Response.status).toBe(409);
    expect(team2Response.body.error).toBe('Player uniqueness violation');
    expect(team2Response.body.details).toContain('already used in team');

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
        matchDay: 3,
      });

    expect(team2Response.status).toBe(201);

    // Both should have dummy players
    expect(team1Response.body.data.teamPlayers).toHaveLength(11);
    expect(team2Response.body.data.teamPlayers).toHaveLength(11);
  });
});