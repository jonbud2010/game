import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import {
  getLobbyMatches,
  getMatchById,
  getLeagueTable,
  getLeagueStatus
} from './matchController';
import { prisma } from '../db/client';

// Mock Prisma
vi.mock('../db/client', () => ({
  prisma: {
    match: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn()
    },
    lobby: {
      findUnique: vi.fn(),
      update: vi.fn()
    },
    team: {
      findMany: vi.fn()
    },
    leagueTable: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn()
    },
    user: {
      update: vi.fn()
    }
  }
}));

const mockedPrisma = vi.mocked(prisma);

describe('Match Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: ReturnType<typeof vi.fn>;
  let mockStatus: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockJson = vi.fn();
    mockStatus = vi.fn().mockReturnValue({ json: mockJson });
    
    mockRequest = {
      user: { id: 'user1', role: 'USER' }
    };
    mockResponse = {
      json: mockJson,
      status: mockStatus
    };

    // Reset all mocks
    vi.clearAllMocks();
  });

  describe('getLobbyMatches', () => {
    beforeEach(() => {
      mockRequest.params = { lobbyId: 'lobby1' };
    });

    it('should return lobby matches successfully', async () => {
      const mockMatches = [
        {
          id: 'match1',
          homeScore: 2,
          awayScore: 1,
          matchDay: 1,
          played: true,
          homeTeam: {
            name: 'Team A',
            user: { id: 'user1', username: 'player1' },
            formation: { id: 'f1', name: '4-4-2' },
            teamPlayers: []
          },
          awayTeam: {
            name: 'Team B',
            user: { id: 'user2', username: 'player2' },
            formation: { id: 'f2', name: '4-3-3' },
            teamPlayers: []
          },
          lobby: { id: 'lobby1', name: 'Test Lobby' }
        }
      ];

      mockedPrisma.match.findMany.mockResolvedValue(mockMatches);

      await getLobbyMatches(mockRequest as Request, mockResponse as Response);

      expect(mockedPrisma.match.findMany).toHaveBeenCalledWith({
        where: { lobbyId: 'lobby1' },
        include: expect.objectContaining({
          homeTeam: expect.any(Object),
          awayTeam: expect.any(Object),
          lobby: expect.any(Object)
        }),
        orderBy: [
          { matchDay: 'asc' },
          { createdAt: 'asc' }
        ]
      });

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: mockMatches,
        count: 1
      });
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');
      mockedPrisma.match.findMany.mockRejectedValue(error);

      await getLobbyMatches(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Failed to fetch matches',
        details: 'Database error'
      });
    });
  });

  describe('getMatchById', () => {
    beforeEach(() => {
      mockRequest.params = { id: 'match1' };
    });

    it('should return match by id successfully', async () => {
      const mockMatch = {
        id: 'match1',
        homeScore: 2,
        awayScore: 1,
        homeTeam: { name: 'Team A' },
        awayTeam: { name: 'Team B' },
        lobby: { id: 'lobby1', name: 'Test Lobby' }
      };

      mockedPrisma.match.findUnique.mockResolvedValue(mockMatch);

      await getMatchById(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: mockMatch
      });
    });

    it('should return 404 when match not found', async () => {
      mockedPrisma.match.findUnique.mockResolvedValue(null);

      await getMatchById(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Match not found' });
    });
  });

  describe('getLeagueTable', () => {
    beforeEach(() => {
      mockRequest.params = { lobbyId: 'lobby1' };
    });

    it('should return league table with calculated positions', async () => {
      const mockLeagueTable = [
        {
          id: 'lt1',
          userId: 'user1',
          points: 9,
          goalsFor: 8,
          goalsAgainst: 3,
          wins: 3,
          draws: 0,
          losses: 0,
          user: { id: 'user1', username: 'player1' }
        },
        {
          id: 'lt2',
          userId: 'user2',
          points: 6,
          goalsFor: 5,
          goalsAgainst: 4,
          wins: 2,
          draws: 0,
          losses: 1,
          user: { id: 'user2', username: 'player2' }
        }
      ];

      mockedPrisma.leagueTable.findMany.mockResolvedValue(mockLeagueTable);

      await getLeagueTable(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: [
          {
            ...mockLeagueTable[0],
            position: 1,
            goalDifference: 5,
            matches: 3
          },
          {
            ...mockLeagueTable[1],
            position: 2,
            goalDifference: 1,
            matches: 3
          }
        ]
      });
    });
  });

  describe('getLeagueStatus', () => {
    beforeEach(() => {
      mockRequest.params = { lobbyId: 'lobby1' };
    });

    it('should return comprehensive league status', async () => {
      const mockLeagueTable = [
        {
          id: 'lt1',
          userId: 'user1',
          points: 6,
          goalsFor: 4,
          goalsAgainst: 2,
          wins: 2,
          draws: 0,
          losses: 0,
          user: { id: 'user1', username: 'player1' }
        }
      ];
      const mockLobby = { status: 'IN_PROGRESS' };

      mockedPrisma.match.count
        .mockResolvedValueOnce(18) // Total matches
        .mockResolvedValueOnce(12) // Played matches
        .mockResolvedValueOnce(6) // Matchday 1 total
        .mockResolvedValueOnceImpl(() => Promise.resolve(6)) // Matchday 1 played
        .mockResolvedValueOnce(6) // Matchday 2 total
        .mockResolvedValueOnce(6) // Matchday 2 played
        .mockResolvedValueOnce(6) // Matchday 3 total
        .mockResolvedValueOnce(0); // Matchday 3 played

      mockedPrisma.leagueTable.findMany.mockResolvedValue(mockLeagueTable);
      mockedPrisma.lobby.findUnique.mockResolvedValue(mockLobby);

      await getLeagueStatus(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          totalMatches: 18,
          playedMatches: 12,
          remainingMatches: 6,
          leagueComplete: false,
          currentMatchDay: 3,
          matchdayProgress: expect.arrayContaining([
            expect.objectContaining({
              matchDay: 1,
              total: 6,
              played: 6,
              remaining: 0,
              completed: true
            }),
            expect.objectContaining({
              matchDay: 2,
              total: 6,
              played: 6,
              remaining: 0,
              completed: true
            }),
            expect.objectContaining({
              matchDay: 3,
              total: 6,
              played: 0,
              remaining: 6,
              completed: false
            })
          ]),
          leagueTable: expect.arrayContaining([
            expect.objectContaining({
              position: 1,
              goalDifference: 2,
              matches: 2
            })
          ]),
          lobbyStatus: 'IN_PROGRESS'
        })
      });
    });
  });
});