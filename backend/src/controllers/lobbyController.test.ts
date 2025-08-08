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
      update: vi.fn(),
      delete: vi.fn()
    },
    lobbyMember: {
      findFirst: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
      delete: vi.fn(),
      count: vi.fn()
    },
    $transaction: vi.fn()
  }
}));

// Mock auth middleware
vi.mock('../middleware/auth', () => ({
  authenticateToken: vi.fn((req, res, next) => {
    // Mock authenticated user
    req.user = { id: 'user-1', userId: 'user-1', role: 'USER' };
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
          adminId: 'user-1',
          isActive: true,
          currentMatchDay: 1,
          createdAt: new Date(),
          admin: {
            id: 'user-1',
            username: 'testuser1'
          },
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
          adminId: 'user-2',
          isActive: true,
          currentMatchDay: 1,
          createdAt: new Date(),
          admin: {
            id: 'user-2',
            username: 'testuser2'
          },
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
            adminId: 'user-1',
            admin: {
              id: 'user-1',
              username: 'testuser1'
            },
            isActive: true,
            currentMatchDay: 1,
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
            adminId: 'user-2',
            admin: {
              id: 'user-2',
              username: 'testuser2'
            },
            isActive: true,
            currentMatchDay: 1,
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
        where: {
          status: 'WAITING',
          isActive: true
        },
        include: {
          admin: {
            select: {
              id: true,
              username: true
            }
          },
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
        orderBy: {
          createdAt: 'desc'
        }
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
        adminId: 'user-1',
        isActive: true,
        currentMatchDay: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockCompleteCreatedLobby = {
        ...mockCreatedLobby,
        admin: {
          id: 'user-1',
          username: 'testuser'
        },
        members: [
          {
            userId: 'user-1',
            joinedAt: new Date(),
            user: {
              id: 'user-1',
              username: 'testuser'
            }
          }
        ]
      };

      // Mock the transaction to return the created lobby
      mockedPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback({
          lobby: {
            create: vi.fn().mockResolvedValue(mockCreatedLobby)
          },
          lobbyMember: {
            create: vi.fn().mockResolvedValue({})
          }
        });
      });

      // Mock finding the lobby with members after creation
      mockedPrisma.lobby.findUnique.mockResolvedValue(mockCompleteCreatedLobby);
      
      // Mock the findFirst for user existing membership check
      mockedPrisma.lobbyMember.findFirst.mockResolvedValue(null);

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
          currentPlayers: 1,
          status: 'WAITING',
          adminId: 'user-1',
          admin: {
            id: 'user-1',
            username: 'testuser'
          },
          isActive: true,
          currentMatchDay: 1,
          members: [
            {
              userId: 'user-1',
              username: 'testuser'
            }
          ]
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
      // Mock findFirst to pass the existing membership check
      mockedPrisma.lobbyMember.findFirst.mockResolvedValue(null);
      // Mock transaction to fail
      mockedPrisma.$transaction.mockRejectedValue(new Error('Database error'));

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
        updatedAt: new Date(),
        members: [
          { userId: 'user-2' },
          { userId: 'user-3' }
        ]
      };

      const mockUpdatedLobby = {
        ...mockLobby,
        adminId: 'user-2',
        isActive: true,
        currentMatchDay: 1,
        admin: {
          id: 'user-2',
          username: 'user2'
        },
        members: [
          {
            userId: 'user-2',
            joinedAt: new Date(),
            user: { id: 'user-2', username: 'user2' }
          },
          {
            userId: 'user-3',
            joinedAt: new Date(),
            user: { id: 'user-3', username: 'user3' }
          },
          {
            userId: 'user-1',
            joinedAt: new Date(),
            user: { id: 'user-1', username: 'testuser' }
          }
        ]
      };

      // Mock: user not already in lobby (first call)
      mockedPrisma.lobbyMember.findFirst.mockResolvedValue(null);
      
      // Mock: lobby exists with members (first call to get lobby for join)
      mockedPrisma.lobby.findUnique.mockResolvedValueOnce(mockLobby);
      
      // Mock: updated lobby after join (second call to get complete data)
      mockedPrisma.lobby.findUnique.mockResolvedValueOnce(mockUpdatedLobby);

      // Mock the transaction
      mockedPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback({
          lobby: {
            findUnique: vi.fn().mockResolvedValue(mockLobby),
            update: vi.fn().mockResolvedValue({})
          },
          lobbyMember: {
            create: vi.fn().mockResolvedValue({})
          }
        });
      });

      const response = await request(app)
        .post('/lobbies/lobby-1/join');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: 'lobby-1',
          name: 'Test Lobby',
          maxPlayers: 4,
          currentPlayers: 3,
          status: 'WAITING',
          adminId: 'user-2',
          admin: {
            id: 'user-2',
            username: 'user2'
          },
          isActive: true,
          currentMatchDay: 1,
          members: expect.arrayContaining([
            expect.objectContaining({ userId: 'user-1', username: 'testuser' })
          ])
        },
        message: 'Joined lobby successfully'
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
      const mockFullLobby = {
        id: 'lobby-1',
        name: 'Test Lobby',
        maxPlayers: 4,
        status: 'WAITING',
        createdAt: new Date(),
        updatedAt: new Date(),
        members: [
          { userId: 'user-2' },
          { userId: 'user-3' },
          { userId: 'user-4' },
          { userId: 'user-5' }
        ]
      };

      mockedPrisma.lobby.findUnique.mockResolvedValue(mockFullLobby);
      mockedPrisma.lobbyMember.findFirst.mockResolvedValue(null);

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
        error: 'You are already in an active lobby'
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
        updatedAt: new Date(),
        members: [
          { userId: 'user-1' },
          { userId: 'user-2' }
        ]
      };

      const mockMembership = {
        id: 'membership-1',
        lobbyId: 'lobby-1',
        userId: 'user-1',
        joinedAt: new Date(),
        lobby: mockLobby
      };

      mockedPrisma.lobbyMember.findFirst.mockResolvedValue(mockMembership);
      
      // Mock the transaction
      mockedPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback({
          lobbyMember: {
            findFirst: vi.fn().mockResolvedValue(mockMembership),
            delete: vi.fn().mockResolvedValue({})
          },
          lobby: {
            update: vi.fn().mockResolvedValue({})
          }
        });
      });

      const response = await request(app)
        .delete('/lobbies/lobby-1/leave');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        message: 'Left lobby successfully'
      });
    });

    it('should return error for non-existent lobby', async () => {
      mockedPrisma.lobbyMember.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .delete('/lobbies/nonexistent/leave');

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: 'You are not a member of this lobby'
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
        error: 'You are not a member of this lobby'
      });
    });
  });
});