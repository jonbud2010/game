import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { validateUniquePlayersInMatchday, checkPlayerUsageInMatchday } from './teamValidation';
import { isDummyPlayer, validateTeamPositions, canPlayerBePlacedAtPosition } from '@football-tcg/shared';

const prisma = new PrismaClient();

describe('Team Validation Utils', () => {
  const testLobbyId = 'test-lobby-validation';
  const testUserId = 'test-user-validation';
  const testMatchDay = 1;
  const testTeam1Id = 'test-team-1';
  const testTeam2Id = 'test-team-2';
  const testPlayerId1 = 'test-player-1';
  const testPlayerId2 = 'test-player-2';
  const dummyPlayerId = 'dummy-gk';

  beforeAll(async () => {
    // Create test data
    await prisma.user.upsert({
      where: { id: testUserId },
      update: {},
      create: {
        id: testUserId,
        username: `testuser-${Date.now()}`,
        email: `test-${Date.now()}@validation.com`,
        passwordHash: 'test',
      },
    });

    await prisma.lobby.upsert({
      where: { id: testLobbyId },
      update: {},
      create: {
        id: testLobbyId,
        name: 'Test Lobby',
        adminId: testUserId,
      },
    });

    await prisma.player.upsert({
      where: { id: testPlayerId1 },
      update: {},
      create: {
        id: testPlayerId1,
        name: 'Test Player 1',
        imageUrl: '/test1.png',
        points: 80,
        position: 'ST',
        color: 'RED',
        marketPrice: 1000,
        theme: 'Test',
        percentage: 0.05,
      },
    });

    await prisma.player.upsert({
      where: { id: testPlayerId2 },
      update: {},
      create: {
        id: testPlayerId2,
        name: 'Test Player 2',
        imageUrl: '/test2.png',
        points: 75,
        position: 'CM',
        color: 'BLUE',
        marketPrice: 800,
        theme: 'Test',
        percentage: 0.04,
      },
    });

    await prisma.formation.upsert({
      where: { id: 'test-formation' },
      update: {},
      create: {
        id: 'test-formation',
        name: 'Test 4-3-3',
        imageUrl: '/formation.png',
        positions: JSON.stringify(['GK', 'LB', 'CB', 'CB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'ST', 'RW']),
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.teamPlayer.deleteMany({});
    await prisma.team.deleteMany({});
    await prisma.player.deleteMany({ where: { theme: 'Test' } });
    await prisma.formation.deleteMany({ where: { id: 'test-formation' } });
    await prisma.lobby.deleteMany({ where: { id: testLobbyId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });
    await prisma.$disconnect();
  });

  test('isDummyPlayer correctly identifies dummy players', () => {
    expect(isDummyPlayer('dummy-gk')).toBe(true);
    expect(isDummyPlayer('dummy-st')).toBe(true);
    expect(isDummyPlayer('real-player-123')).toBe(false);
    expect(isDummyPlayer('')).toBe(false);
  });

  test('checkPlayerUsageInMatchday with no teams returns all unused', async () => {
    const result = await checkPlayerUsageInMatchday(
      testUserId,
      testLobbyId,
      testMatchDay,
      [testPlayerId1, testPlayerId2, dummyPlayerId]
    );

    expect(result).toHaveLength(3);
    expect(result.every(r => !r.isUsed)).toBe(true);
  });

  test('validateUniquePlayersInMatchday with no conflicts passes', async () => {
    const result = await validateUniquePlayersInMatchday(
      testUserId,
      testLobbyId,
      testMatchDay,
      [testPlayerId1, testPlayerId2]
    );

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.conflictingPlayers).toHaveLength(0);
  });

  test('validateUniquePlayersInMatchday allows dummy players in multiple teams', async () => {
    // Create team 1 with a dummy player
    const team1 = await prisma.team.create({
      data: {
        id: testTeam1Id,
        userId: testUserId,
        lobbyId: testLobbyId,
        formationId: 'test-formation',
        name: 'Team 1',
        matchDay: testMatchDay,
      },
    });

    await prisma.teamPlayer.create({
      data: {
        teamId: team1.id,
        playerId: dummyPlayerId,
        position: 0,
        points: 50,
        color: 'CYAN',
      },
    });

    // Try to use the same dummy player in validation - should pass
    const result = await validateUniquePlayersInMatchday(
      testUserId,
      testLobbyId,
      testMatchDay,
      [dummyPlayerId, testPlayerId1]
    );

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);

    // Cleanup
    await prisma.teamPlayer.deleteMany({ where: { teamId: team1.id } });
    await prisma.team.delete({ where: { id: team1.id } });
  });

  describe('Position Validation', () => {
    test('canPlayerBePlacedAtPosition validates exact position match', () => {
      expect(canPlayerBePlacedAtPosition('GK', 'GK')).toBe(true);
      expect(canPlayerBePlacedAtPosition('ST', 'ST')).toBe(true);
      expect(canPlayerBePlacedAtPosition('CB', 'CB')).toBe(true);
      
      // Position mismatches should fail
      expect(canPlayerBePlacedAtPosition('GK', 'ST')).toBe(false);
      expect(canPlayerBePlacedAtPosition('CB', 'LB')).toBe(false);
      expect(canPlayerBePlacedAtPosition('CM', 'CAM')).toBe(false);
    });

    test('validateTeamPositions returns valid for correct positions', () => {
      const players = [
        { position: 'GK', name: 'Keeper' },
        { position: 'CB', name: 'Defender' },
        { position: 'ST', name: 'Striker' }
      ];
      const formationPositions = ['GK', 'CB', 'ST'];
      
      const result = validateTeamPositions(players, formationPositions);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.invalidPlacements).toHaveLength(0);
    });

    test('validateTeamPositions returns invalid for wrong positions', () => {
      const players = [
        { position: 'ST', name: 'Striker' }, // Wrong: ST in GK position
        { position: 'GK', name: 'Keeper' },  // Wrong: GK in CB position
        { position: 'CB', name: 'Defender' }  // Correct: CB in ST position (wrong but for testing)
      ];
      const formationPositions = ['GK', 'CB', 'ST'];
      
      const result = validateTeamPositions(players, formationPositions);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.invalidPlacements.length).toBeGreaterThan(0);
      
      // Check specific error details
      expect(result.invalidPlacements[0]).toMatchObject({
        playerPosition: 'ST',
        formationPosition: 'GK',
        playerName: 'Striker',
        formationIndex: 0
      });
    });

    test('validateTeamPositions handles mixed valid and invalid positions', () => {
      const players = [
        { position: 'GK', name: 'Keeper' },   // Correct
        { position: 'ST', name: 'Striker' },  // Wrong: ST in CB position
        { position: 'CB', name: 'Defender' }  // Wrong: CB in ST position
      ];
      const formationPositions = ['GK', 'CB', 'ST'];
      
      const result = validateTeamPositions(players, formationPositions);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2); // Two position mismatches
      expect(result.invalidPlacements).toHaveLength(2);
    });
  });
});