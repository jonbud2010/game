import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { getAllLobbies, createLobby, joinLobby, leaveLobby } from './lobbyController';
import { prisma } from '../db/connection';
import { authenticateToken } from '../middleware/auth';

// Mock Prisma
vi.mock('../db/connection', () => ({
  prisma: {
    lobby: {
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn()
    },
    lobbyMember: {
      findFirst: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn()
    }
  }
}));

// Mock auth middleware
vi.mock('../middleware/auth', () => ({
  authenticateToken: vi.fn((req, res, next) => {
    // Mock authenticated user
    req.user = { userId: 'user-1', role: 'USER' };
    next();
  })
}));

const mockedPrisma = vi.mocked(prisma);

describe('Lobby Controller', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Routes
    app.get('/lobbies', getAllLobbies);
    app.post('/lobbies', authenticateToken, createLobby);
    app.post('/lobbies/:id/join', authenticateToken, joinLobby);
    app.delete('/lobbies/:id/leave', authenticateToken, leaveLobby);

    // Reset all mocks
    vi.clearAllMocks();
  });

  describe('GET /lobbies', () => {
    it('should return all waiting lobbies', async () => {
      const mockLobbies = [
        {
          id: 'lobby-1',
          name: 'Test Lobby 1',
          maxPlayers: 4,
          status: 'WAITING',
          createdAt: new Date(),
          members: [
            {
              userId: 'user-1',
              joinedAt: new Date(),
              user: {
                id: 'user-1',
                username: 'testuser1'
              }
            }
          ]
        },
        {
          id: 'lobby-2',
          name: 'Test Lobby 2',
          maxPlayers: 4,
          status: 'WAITING',
          createdAt: new Date(),
          members: [
            {
              userId: 'user-2',
              joinedAt: new Date(),
              user: {
                id: 'user-2',
                username: 'testuser2'
              }
            },
            {
              userId: 'user-3',
              joinedAt: new Date(),
              user: {
                id: 'user-3',
                username: 'testuser3'
              }
            }
          ]
        }
      ];

      mockedPrisma.lobby.findMany.mockResolvedValue(mockLobbies);

      const response = await request(app).get('/lobbies');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: [
          {
            id: 'lobby-1',
            name: 'Test Lobby 1',
            maxPlayers: 4,
            currentPlayers: 1,
            status: 'WAITING',
            members: [
              {
                userId: 'user-1',
                username: 'testuser1'
              }
            ]
          },
          {
            id: 'lobby-2',
            name: 'Test Lobby 2',
            maxPlayers: 4,
            currentPlayers: 2,
            status: 'WAITING',
            members: [
              {
                userId: 'user-2',
                username: 'testuser2'
              },
              {
                userId: 'user-3',
                username: 'testuser3'
              }
            ]
          }
        ]
      });

      expect(mockedPrisma.lobby.findMany).toHaveBeenCalledWith({
        where: { status: 'WAITING' },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    });

    it('should handle database errors', async () => {
      mockedPrisma.lobby.findMany.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/lobbies');

      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        success: false,
        error: 'Failed to fetch lobbies'
      });
    });
  });

  describe('POST /lobbies', () => {
    const validLobbyData = {
      name: 'New Test Lobby'
    };

    it('should create a new lobby successfully', async () => {
      const mockCreatedLobby = {
        id: 'lobby-new',
        name: 'New Test Lobby',
        maxPlayers: 4,
        status: 'WAITING',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockedPrisma.lobby.create.mockResolvedValue(mockCreatedLobby);

      const response = await request(app)
        .post('/lobbies')
        .send(validLobbyData);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: 'lobby-new',
          name: 'New Test Lobby',
          maxPlayers: 4,
          status: 'WAITING'
        }
      });

      expect(mockedPrisma.lobby.create).toHaveBeenCalledWith({
        data: {
          name: 'New Test Lobby',
          maxPlayers: 4,
          status: 'WAITING'
        }
      });
    });

    it('should return validation error for empty name', async () => {
      const invalidData = {
        name: ''
      };

      const response = await request(app)
        .post('/lobbies')
        .send(invalidData);

      expect(response.status).toBe(400);
    });

    it('should handle database errors', async () => {
      mockedPrisma.lobby.create.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/lobbies')
        .send(validLobbyData);

      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        success: false,
        error: 'Failed to create lobby'
      });
    });
  });

  describe('POST /lobbies/:id/join', () => {
    it('should join lobby successfully', async () => {
      const mockLobby = {
        id: 'lobby-1',
        name: 'Test Lobby',
        maxPlayers: 4,
        status: 'WAITING',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Mock: lobby exists
      mockedPrisma.lobby.findUnique.mockResolvedValue(mockLobby);
      
      // Mock: user not already in lobby
      mockedPrisma.lobbyMember.findFirst.mockResolvedValue(null);
      
      // Mock: current member count
      mockedPrisma.lobbyMember.count.mockResolvedValue(2);
      
      // Mock: member creation
      const mockMember = {
        lobbyId: 'lobby-1',
        userId: 'user-1',
        joinedAt: new Date()
      };
      mockedPrisma.lobbyMember.create.mockResolvedValue(mockMember);

      const response = await request(app)
        .post('/lobbies/lobby-1/join');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        message: 'Successfully joined lobby'
      });

      expect(mockedPrisma.lobbyMember.create).toHaveBeenCalledWith({
        data: {
          lobbyId: 'lobby-1',
          userId: 'user-1'
        }
      });
    });

    it('should return error for non-existent lobby', async () => {
      mockedPrisma.lobby.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/lobbies/nonexistent/join');

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        success: false,
        error: 'Lobby not found'
      });
    });

    it('should return error for full lobby', async () => {
      const mockLobby = {
        id: 'lobby-1',
        name: 'Test Lobby',
        maxPlayers: 4,
        status: 'WAITING',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockedPrisma.lobby.findUnique.mockResolvedValue(mockLobby);
      mockedPrisma.lobbyMember.findFirst.mockResolvedValue(null);
      mockedPrisma.lobbyMember.count.mockResolvedValue(4); // Full lobby

      const response = await request(app)
        .post('/lobbies/lobby-1/join');

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: 'Lobby is full'
      });
    });

    it('should return error for already joined user', async () => {
      const mockLobby = {
        id: 'lobby-1',
        name: 'Test Lobby',
        maxPlayers: 4,
        status: 'WAITING',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockExistingMember = {
        lobbyId: 'lobby-1',
        userId: 'user-1',
        joinedAt: new Date()
      };

      mockedPrisma.lobby.findUnique.mockResolvedValue(mockLobby);
      mockedPrisma.lobbyMember.findFirst.mockResolvedValue(mockExistingMember);

      const response = await request(app)
        .post('/lobbies/lobby-1/join');

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: 'User already in lobby'
      });
    });
  });

  describe('DELETE /lobbies/:id/leave', () => {
    it('should leave lobby successfully', async () => {
      const mockLobby = {
        id: 'lobby-1',
        name: 'Test Lobby',
        maxPlayers: 4,
        status: 'WAITING',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockExistingMember = {
        lobbyId: 'lobby-1',
        userId: 'user-1',
        joinedAt: new Date()
      };

      mockedPrisma.lobby.findUnique.mockResolvedValue(mockLobby);
      mockedPrisma.lobbyMember.findFirst.mockResolvedValue(mockExistingMember);
      mockedPrisma.lobbyMember.deleteMany.mockResolvedValue({ count: 1 });

      const response = await request(app)
        .delete('/lobbies/lobby-1/leave');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        message: 'Successfully left lobby'
      });

      expect(mockedPrisma.lobbyMember.deleteMany).toHaveBeenCalledWith({
        where: {
          lobbyId: 'lobby-1',
          userId: 'user-1'
        }
      });
    });

    it('should return error for non-existent lobby', async () => {
      mockedPrisma.lobby.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .delete('/lobbies/nonexistent/leave');

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        success: false,
        error: 'Lobby not found'
      });
    });

    it('should return error for user not in lobby', async () => {
      const mockLobby = {
        id: 'lobby-1',
        name: 'Test Lobby',
        maxPlayers: 4,
        status: 'WAITING',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockedPrisma.lobby.findUnique.mockResolvedValue(mockLobby);
      mockedPrisma.lobbyMember.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .delete('/lobbies/lobby-1/leave');

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: 'User not in lobby'
      });
    });
  });
});