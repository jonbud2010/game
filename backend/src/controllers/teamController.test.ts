import { Request, Response } from 'express';
import {
  getUserTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
  validateTeam
} from './teamController.js';
import { prisma } from '../db/client.js';

// Mock Prisma
jest.mock('../db/client.js', () => ({
  prisma: {
    team: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    lobbyMember: {
      findFirst: jest.fn()
    },
    formation: {
      findUnique: jest.fn()
    },
    userPlayer: {
      findMany: jest.fn()
    },
    teamPlayer: {
      createMany: jest.fn(),
      deleteMany: jest.fn()
    }
  }
}));

// Mock shared functions inline
const mockCalculateTeamChemistry = jest.fn();
const mockValidateTeamChemistry = jest.fn();

const mockedPrisma = jest.mocked(prisma);

describe('Team Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    
    mockRequest = {
      user: { id: 'user1', role: 'USER' }
    };
    mockResponse = {
      json: mockJson,
      status: mockStatus
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('getUserTeams', () => {
    beforeEach(() => {
      mockRequest.params = { lobbyId: 'lobby1' };
    });

    it('should return user teams successfully', async () => {
      const mockTeams = [
        {
          id: 'team1',
          name: 'My Team 1',
          matchDay: 1,
          formation: { id: 'f1', name: '4-4-2' },
          teamPlayers: [
            { position: 0, player: { id: 'p1', name: 'Player 1' } },
            { position: 1, player: { id: 'p2', name: 'Player 2' } }
          ]
        }
      ];
      
      mockedPrisma.team.findMany.mockResolvedValue(mockTeams);

      await getUserTeams(mockRequest as Request, mockResponse as Response);

      expect(mockedPrisma.team.findMany).toHaveBeenCalledWith({
        where: { userId: 'user1', lobbyId: 'lobby1' },
        include: {
          formation: true,
          teamPlayers: {
            include: { player: true },
            orderBy: { position: 'asc' }
          }
        },
        orderBy: { matchDay: 'asc' }
      });

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: mockTeams,
        count: 1
      });
    });

    it('should return 401 when user not authenticated', async () => {
      mockRequest.user = undefined;

      await getUserTeams(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({ error: 'User not authenticated' });
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');
      mockedPrisma.team.findMany.mockRejectedValue(error);

      await getUserTeams(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Failed to fetch teams',
        details: 'Database error'
      });
    });
  });

  describe('getTeamById', () => {
    beforeEach(() => {
      mockRequest.params = { id: 'team1' };
    });

    it('should return team with calculated statistics', async () => {
      const mockTeam = {
        id: 'team1',
        name: 'My Team',
        formation: { id: 'f1', name: '4-4-2' },
        teamPlayers: [
          { player: { id: 'p1', points: 85, color: 'Rot' } },
          { player: { id: 'p2', points: 80, color: 'Blau' } }
        ],
        user: { id: 'user1', username: 'testuser' },
        lobby: { id: 'lobby1', name: 'Test Lobby' }
      };
      
      mockedPrisma.team.findFirst.mockResolvedValue(mockTeam);
      mockCalculateTeamChemistry.mockReturnValue(15);

      await getTeamById(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: {
          ...mockTeam,
          stats: {
            totalPoints: 165,
            chemistryPoints: 15,
            totalStrength: 180
          }
        }
      });
    });

    it('should handle chemistry calculation errors gracefully', async () => {
      const mockTeam = {
        id: 'team1',
        teamPlayers: [
          { player: { id: 'p1', points: 85, color: 'Rot' } }
        ]
      };
      
      mockedPrisma.team.findFirst.mockResolvedValue(mockTeam);
      mockCalculateTeamChemistry.mockImplementation(() => {
        throw new Error('Invalid chemistry');
      });

      await getTeamById(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: {
          ...mockTeam,
          stats: {
            totalPoints: 85,
            chemistryPoints: 0,
            totalStrength: 85
          }
        }
      });
    });

    it('should return 404 when team not found', async () => {
      mockedPrisma.team.findFirst.mockResolvedValue(null);

      await getTeamById(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Team not found' });
    });
  });

  describe('createTeam', () => {
    const validPlayers = Array.from({ length: 11 }, (_, i) => ({
      playerId: `p${i + 1}`,
      points: 80,
      color: 'Rot'
    }));

    beforeEach(() => {
      mockRequest.body = {
        lobbyId: 'lobby1',
        formationId: 'f1',
        name: 'My Team',
        matchDay: 1,
        players: validPlayers
      };
    });

    it('should create team successfully', async () => {
      const mockLobbyMember = { id: 'lm1', userId: 'user1', lobbyId: 'lobby1' };
      const mockFormation = { id: 'f1', name: '4-4-2' };
      const mockUserPlayers = validPlayers.map(p => ({ playerId: p.playerId, userId: 'user1' }));
      const mockCreatedTeam = {
        id: 'team1',
        name: 'My Team',
        matchDay: 1,
        formation: mockFormation
      };
      const mockCompleteTeam = {
        ...mockCreatedTeam,
        teamPlayers: validPlayers.map((p, i) => ({
          position: i,
          player: { id: p.playerId, points: p.points, color: p.color }
        }))
      };

      mockedPrisma.lobbyMember.findFirst.mockResolvedValue(mockLobbyMember);
      mockedPrisma.team.findFirst.mockResolvedValue(null); // No existing team
      mockedPrisma.formation.findUnique.mockResolvedValue(mockFormation);
      mockedPrisma.userPlayer.findMany.mockResolvedValue(mockUserPlayers);
      mockedPrisma.team.create.mockResolvedValue(mockCreatedTeam);
      mockedPrisma.teamPlayer.createMany.mockResolvedValue({ count: 11 });
      mockedPrisma.team.findUnique.mockResolvedValue(mockCompleteTeam);

      await createTeam(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: mockCompleteTeam
      });
    });

    it('should validate required fields', async () => {
      mockRequest.body = { lobbyId: 'lobby1' }; // Missing required fields

      await createTeam(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Missing required fields' });
    });

    it('should validate user is lobby member', async () => {
      mockedPrisma.lobbyMember.findFirst.mockResolvedValue(null);

      await createTeam(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({ error: 'User is not a member of this lobby' });
    });

    it('should prevent duplicate teams for same matchday', async () => {
      const mockLobbyMember = { id: 'lm1' };
      const existingTeam = { id: 'existing', matchDay: 1 };

      mockedPrisma.lobbyMember.findFirst.mockResolvedValue(mockLobbyMember);
      mockedPrisma.team.findFirst.mockResolvedValue(existingTeam);

      await createTeam(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(409);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Team for this matchday already exists' });
    });

    it('should validate formation exists', async () => {
      const mockLobbyMember = { id: 'lm1' };

      mockedPrisma.lobbyMember.findFirst.mockResolvedValue(mockLobbyMember);
      mockedPrisma.team.findFirst.mockResolvedValue(null);
      mockedPrisma.formation.findUnique.mockResolvedValue(null);

      await createTeam(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Formation not found' });
    });

    it('should validate player count', async () => {
      const mockLobbyMember = { id: 'lm1' };
      const mockFormation = { id: 'f1' };
      
      mockRequest.body.players = [{ playerId: 'p1' }]; // Only 1 player instead of 11

      mockedPrisma.lobbyMember.findFirst.mockResolvedValue(mockLobbyMember);
      mockedPrisma.team.findFirst.mockResolvedValue(null);
      mockedPrisma.formation.findUnique.mockResolvedValue(mockFormation);

      await createTeam(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ 
        error: 'Team must have exactly 11 players' 
      });
    });

    it('should validate player ownership', async () => {
      const mockLobbyMember = { id: 'lm1' };
      const mockFormation = { id: 'f1' };

      mockedPrisma.lobbyMember.findFirst.mockResolvedValue(mockLobbyMember);
      mockedPrisma.team.findFirst.mockResolvedValue(null);
      mockedPrisma.formation.findUnique.mockResolvedValue(mockFormation);
      mockedPrisma.userPlayer.findMany.mockResolvedValue([]); // User doesn't own any players

      await createTeam(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Some players do not belong to user' });
    });
  });

  describe('updateTeam', () => {
    const validPlayers = Array.from({ length: 11 }, (_, i) => ({
      playerId: `p${i + 1}`,
      points: 80,
      color: 'Rot'
    }));

    beforeEach(() => {
      mockRequest.params = { id: 'team1' };
      mockRequest.body = {
        name: 'Updated Team',
        players: validPlayers
      };
    });

    it('should update team successfully', async () => {
      const existingTeam = { id: 'team1', name: 'Old Team', formation: { id: 'f1' } };
      const mockUserPlayers = validPlayers.map(p => ({ playerId: p.playerId, userId: 'user1' }));
      const updatedTeam = {
        id: 'team1',
        name: 'Updated Team',
        formation: { id: 'f1' },
        teamPlayers: []
      };

      mockedPrisma.team.findFirst.mockResolvedValue(existingTeam);
      mockedPrisma.userPlayer.findMany.mockResolvedValue(mockUserPlayers);
      mockedPrisma.team.update.mockResolvedValue({});
      mockedPrisma.teamPlayer.deleteMany.mockResolvedValue({ count: 11 });
      mockedPrisma.teamPlayer.createMany.mockResolvedValue({ count: 11 });
      mockedPrisma.team.findUnique.mockResolvedValue(updatedTeam);

      await updateTeam(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: updatedTeam
      });
    });

    it('should return 404 when team not found', async () => {
      mockedPrisma.team.findFirst.mockResolvedValue(null);

      await updateTeam(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Team not found' });
    });

    it('should validate player count when updating players', async () => {
      const existingTeam = { id: 'team1', formation: { id: 'f1' } };
      mockRequest.body.players = [{ playerId: 'p1' }]; // Only 1 player

      mockedPrisma.team.findFirst.mockResolvedValue(existingTeam);

      await updateTeam(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ 
        error: 'Team must have exactly 11 players' 
      });
    });

    it('should update only name when no players provided', async () => {
      const existingTeam = { id: 'team1', formation: { id: 'f1' } };
      const updatedTeam = { id: 'team1', name: 'Updated Team' };
      
      mockRequest.body = { name: 'Updated Team' }; // No players

      mockedPrisma.team.findFirst.mockResolvedValue(existingTeam);
      mockedPrisma.team.update.mockResolvedValue({});
      mockedPrisma.team.findUnique.mockResolvedValue(updatedTeam);

      await updateTeam(mockRequest as Request, mockResponse as Response);

      expect(mockedPrisma.team.update).toHaveBeenCalledWith({
        where: { id: 'team1' },
        data: { name: 'Updated Team' }
      });
      expect(mockedPrisma.teamPlayer.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('deleteTeam', () => {
    beforeEach(() => {
      mockRequest.params = { id: 'team1' };
    });

    it('should delete team successfully', async () => {
      const existingTeam = { id: 'team1', name: 'Test Team' };

      mockedPrisma.team.findFirst.mockResolvedValue(existingTeam);
      mockedPrisma.team.delete.mockResolvedValue(existingTeam);

      await deleteTeam(mockRequest as Request, mockResponse as Response);

      expect(mockedPrisma.team.delete).toHaveBeenCalledWith({
        where: { id: 'team1' }
      });
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Team deleted successfully'
      });
    });

    it('should return 404 when team not found', async () => {
      mockedPrisma.team.findFirst.mockResolvedValue(null);

      await deleteTeam(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Team not found' });
    });
  });

  describe('validateTeam', () => {
    beforeEach(() => {
      mockRequest.params = { id: 'team1' };
    });

    it('should validate team successfully', async () => {
      const mockTeam = {
        id: 'team1',
        formation: { id: 'f1' },
        teamPlayers: Array.from({ length: 11 }, (_, i) => ({
          player: { id: `p${i + 1}`, color: 'Rot' }
        }))
      };

      mockedPrisma.team.findFirst.mockResolvedValue(mockTeam);
      mockValidateTeamChemistry.mockReturnValue({ isValid: true, errors: [] });

      await validateTeam(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: {
          isValid: true,
          errors: [],
          playerCount: 11,
          requiredPlayers: 11
        }
      });
    });

    it('should detect invalid player count', async () => {
      const mockTeam = {
        id: 'team1',
        formation: { id: 'f1' },
        teamPlayers: [
          { player: { id: 'p1', color: 'Rot' } }
        ] // Only 1 player
      };

      mockedPrisma.team.findFirst.mockResolvedValue(mockTeam);
      mockValidateTeamChemistry.mockReturnValue({ isValid: true, errors: [] });

      await validateTeam(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: {
          isValid: false,
          errors: ['Team must have exactly 11 players'],
          playerCount: 1,
          requiredPlayers: 11
        }
      });
    });

    it('should detect chemistry errors', async () => {
      const mockTeam = {
        id: 'team1',
        formation: { id: 'f1' },
        teamPlayers: Array.from({ length: 11 }, (_, i) => ({
          player: { id: `p${i + 1}`, color: 'Rot' }
        }))
      };

      mockedPrisma.team.findFirst.mockResolvedValue(mockTeam);
      mockValidateTeamChemistry.mockReturnValue({ 
        isValid: false, 
        errors: ['Invalid color distribution'] 
      });

      await validateTeam(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: {
          isValid: false,
          errors: ['Invalid color distribution'],
          playerCount: 11,
          requiredPlayers: 11
        }
      });
    });

    it('should detect duplicate players', async () => {
      const mockTeam = {
        id: 'team1',
        formation: { id: 'f1' },
        teamPlayers: [
          { player: { id: 'p1', color: 'Rot' } },
          { player: { id: 'p1', color: 'Blau' } }, // Duplicate player
          ...Array.from({ length: 9 }, (_, i) => ({
            player: { id: `p${i + 2}`, color: 'Rot' }
          }))
        ]
      };

      mockedPrisma.team.findFirst.mockResolvedValue(mockTeam);
      mockValidateTeamChemistry.mockReturnValue({ isValid: true, errors: [] });

      await validateTeam(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: {
          isValid: false,
          errors: ['Team cannot have duplicate players'],
          playerCount: 11,
          requiredPlayers: 11
        }
      });
    });

    it('should handle chemistry validation errors', async () => {
      const mockTeam = {
        id: 'team1',
        formation: { id: 'f1' },
        teamPlayers: Array.from({ length: 11 }, (_, i) => ({
          player: { id: `p${i + 1}`, color: 'Rot' }
        }))
      };

      mockedPrisma.team.findFirst.mockResolvedValue(mockTeam);
      mockedValidateTeamChemistry.mockImplementation(() => {
        throw new Error('Chemistry validation failed');
      });

      await validateTeam(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: {
          isValid: false,
          errors: ['Invalid team chemistry'],
          playerCount: 11,
          requiredPlayers: 11
        }
      });
    });
  });
});