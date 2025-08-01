import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import {
  getAllPacks,
  getPackById,
  createPack,
  updatePack,
  deletePack,
  addPlayersTopack,
  removePlayersFromPack,
  getAvailablePacks,
  openPack,
  recalculatePackPercentages
} from './packController';
import { prisma } from '../db/client';

// Mock Prisma
vi.mock('../db/client', () => ({
  prisma: {
    pack: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    player: {
      findMany: vi.fn(),
      update: vi.fn()
    },
    packPlayer: {
      findMany: vi.fn(),
      createMany: vi.fn(),
      deleteMany: vi.fn(),
      delete: vi.fn(),
      count: vi.fn()
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn()
    },
    userPlayer: {
      create: vi.fn()
    },
    $transaction: vi.fn()
  }
}));

const mockedPrisma = vi.mocked(prisma);

describe('Pack Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: ReturnType<typeof vi.fn>;
  let mockStatus: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockJson = vi.fn();
    mockStatus = vi.fn().mockReturnValue({ json: mockJson });
    
    mockRequest = {
      user: { id: 'user1', role: 'ADMIN' }
    };
    mockResponse = {
      json: mockJson,
      status: mockStatus
    };

    // Reset all mocks
    vi.clearAllMocks();
  });

  describe('getAllPacks', () => {
    it('should return all packs with statistics', async () => {
      const mockPacks = [
        {
          id: '1',
          name: 'Premium Pack',
          price: 100,
          packPlayers: [
            { player: { id: 'p1', name: 'Player 1', points: 85, position: 'ST', color: 'Rot', percentage: 0.3 } },
            { player: { id: 'p2', name: 'Player 2', points: 80, position: 'CB', color: 'Blau', percentage: 0.7 } }
          ],
          createdAt: new Date()
        }
      ];
      
      mockedPrisma.pack.findMany.mockResolvedValue(mockPacks);

      await getAllPacks(mockRequest as Request, mockResponse as Response);

      expect(mockedPrisma.pack.findMany).toHaveBeenCalledWith({
        include: {
          packPlayers: {
            include: {
              player: {
                select: {
                  id: true,
                  name: true,
                  points: true,
                  position: true,
                  color: true,
                  percentage: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: [
          expect.objectContaining({
            id: '1',
            name: 'Premium Pack',
            playerCount: 2,
            totalPercentage: 100, // (0.3 + 0.7) * 10000 / 100
            players: [
              { id: 'p1', name: 'Player 1', points: 85, position: 'ST', color: 'Rot', percentage: 0.3 },
              { id: 'p2', name: 'Player 2', points: 80, position: 'CB', color: 'Blau', percentage: 0.7 }
            ]
          })
        ],
        count: 1
      });
    });

    it('should handle database errors', async () => {
      const error = new Error('Database connection failed');
      mockedPrisma.pack.findMany.mockRejectedValue(error);

      await getAllPacks(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Failed to fetch packs',
        details: 'Database connection failed'
      });
    });
  });

  describe('getPackById', () => {
    beforeEach(() => {
      mockRequest.params = { id: '1' };
    });

    it('should return pack by id with statistics', async () => {
      const mockPack = {
        id: '1',
        name: 'Premium Pack',
        price: 100,
        packPlayers: [
          { player: { id: 'p1', name: 'Player 1', percentage: 0.4 } },
          { player: { id: 'p2', name: 'Player 2', percentage: 0.6 } }
        ]
      };
      
      mockedPrisma.pack.findUnique.mockResolvedValue(mockPack);

      await getPackById(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          id: '1',
          name: 'Premium Pack',
          playerCount: 2,
          totalPercentage: 100,
          players: [
            { id: 'p1', name: 'Player 1', percentage: 0.4 },
            { id: 'p2', name: 'Player 2', percentage: 0.6 }
          ]
        })
      });
    });

    it('should return 404 when pack not found', async () => {
      mockedPrisma.pack.findUnique.mockResolvedValue(null);

      await getPackById(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Pack not found',
        message: 'No pack found with ID: 1'
      });
    });
  });

  describe('createPack', () => {
    beforeEach(() => {
      mockRequest.body = {
        name: 'New Pack',
        price: 150,
        playerIds: ['p1', 'p2']
      };
    });

    it('should create pack successfully with players', async () => {
      const mockPlayers = [
        { id: 'p1', name: 'Player 1' },
        { id: 'p2', name: 'Player 2' }
      ];
      const mockPack = {
        id: '1',
        name: 'New Pack',
        price: 150,
        packPlayers: [
          { player: mockPlayers[0] },
          { player: mockPlayers[1] }
        ]
      };

      mockedPrisma.player.findMany.mockResolvedValue(mockPlayers);
      mockedPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback({
          pack: {
            create: vi.fn().mockResolvedValue({ id: '1', name: 'New Pack', price: 150 }),
            findUnique: vi.fn().mockResolvedValue(mockPack)
          },
          packPlayer: {
            createMany: vi.fn().mockResolvedValue({ count: 2 })
          }
        });
      });

      await createPack(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Pack created successfully',
        data: mockPack
      });
    });

    it('should validate player existence', async () => {
      mockedPrisma.player.findMany.mockResolvedValue([{ id: 'p1' }]); // Only 1 of 2 players found

      await createPack(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Invalid players',
        message: 'Some player IDs do not exist'
      });
    });

    it('should handle unique constraint violations', async () => {
      const error = { code: 'P2002' };
      // Mock that all players exist (2 players found for 2 player IDs)
      mockedPrisma.player.findMany.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);
      mockedPrisma.$transaction.mockRejectedValue(error);

      await createPack(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Pack already exists',
        message: 'A pack with this name already exists'
      });
    });
  });

  describe('updatePack', () => {
    beforeEach(() => {
      mockRequest.params = { id: '1' };
      mockRequest.body = {
        name: 'Updated Pack',
        price: 200,
        status: 'INACTIVE'
      };
    });

    it('should update pack successfully', async () => {
      const existingPack = { id: '1', name: 'Old Pack' };
      const updatedPack = { id: '1', name: 'Updated Pack', price: 200, status: 'INACTIVE' };
      
      mockedPrisma.pack.findUnique.mockResolvedValue(existingPack);
      mockedPrisma.pack.update.mockResolvedValue(updatedPack);

      await updatePack(mockRequest as Request, mockResponse as Response);

      expect(mockedPrisma.pack.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { name: 'Updated Pack', price: 200, status: 'INACTIVE' },
        include: {
          packPlayers: {
            include: { player: true }
          }
        }
      });
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Pack updated successfully',
        data: updatedPack
      });
    });

    it('should validate status values', async () => {
      const existingPack = { id: '1', name: 'Old Pack' };
      mockRequest.body.status = 'INVALID_STATUS';
      
      mockedPrisma.pack.findUnique.mockResolvedValue(existingPack);

      await updatePack(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Invalid status',
        message: 'Status must be ACTIVE, INACTIVE, or EMPTY'
      });
    });

    it('should return 404 when pack not found', async () => {
      mockedPrisma.pack.findUnique.mockResolvedValue(null);

      await updatePack(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Pack not found',
        message: 'No pack found with ID: 1'
      });
    });
  });

  describe('openPack', () => {
    beforeEach(() => {
      mockRequest.params = { id: '1' };
      mockRequest.user = { id: 'user1' };
    });

    it('should open pack successfully and draw a player', async () => {
      const mockPack = {
        id: '1',
        name: 'Test Pack',
        price: 100,
        status: 'ACTIVE',
        packPlayers: [
          { player: { id: 'p1', name: 'Player 1', percentage: 0.3 } },
          { player: { id: 'p2', name: 'Player 2', percentage: 0.7 } }
        ]
      };
      const mockUser = { id: 'user1', coins: 200 };
      const mockDrawnPlayer = { id: 'p1', name: 'Player 1', percentage: 0.3 };

      mockedPrisma.pack.findUnique.mockResolvedValue(mockPack);
      mockedPrisma.user.findUnique
        .mockResolvedValueOnce(mockUser) // First call for coin check
        .mockResolvedValueOnce({ coins: 100 }); // Second call for updated coins

      // Mock Math.random to always return 0.2 (should select first player with 0.3 percentage)
      vi.spyOn(Math, 'random').mockReturnValue(0.2);

      mockedPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback({
          user: { update: vi.fn() },
          userPlayer: { create: vi.fn().mockResolvedValue({ id: 'up1' }) },
          packPlayer: { delete: vi.fn(), count: vi.fn().mockResolvedValue(1) },
          pack: { update: vi.fn() }
        });
      });

      mockedPrisma.$transaction.mockResolvedValue({
        drawnPlayer: mockDrawnPlayer,
        remainingPlayers: 1,
        packNowEmpty: false
      });

      await openPack(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Pack opened successfully!',
        data: {
          drawnPlayer: mockDrawnPlayer,
          coinsSpent: 100,
          remainingCoins: 100,
          remainingPlayersInPack: 1,
          packNowEmpty: false
        }
      });

      // Restore Math.random
      vi.restoreAllMocks();
    });

    it('should return 401 when user not authenticated', async () => {
      mockRequest.user = undefined;

      await openPack(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({ error: 'User not authenticated' });
    });

    it('should return 404 when pack not found', async () => {
      mockedPrisma.pack.findUnique.mockResolvedValue(null);

      await openPack(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Pack not found' });
    });

    it('should return 400 when pack is not active', async () => {
      const mockPack = { id: '1', status: 'INACTIVE', packPlayers: [] };
      
      mockedPrisma.pack.findUnique.mockResolvedValue(mockPack);

      await openPack(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Pack not available',
        message: 'This pack is no longer available for purchase'
      });
    });

    it('should return 400 when user has insufficient coins', async () => {
      const mockPack = { 
        id: '1', 
        status: 'ACTIVE', 
        price: 100,
        packPlayers: [{ player: { id: 'p1', percentage: 1.0 } }] 
      };
      const mockUser = { id: 'user1', coins: 50 };
      
      mockedPrisma.pack.findUnique.mockResolvedValue(mockPack);
      mockedPrisma.user.findUnique.mockResolvedValue(mockUser);

      await openPack(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Insufficient coins',
        message: 'You need 100 coins to open this pack'
      });
    });
  });

  describe('addPlayersTopack', () => {
    beforeEach(() => {
      mockRequest.params = { id: '1' };
      mockRequest.body = { playerIds: ['p1', 'p2'] };
    });

    it('should add players to pack successfully', async () => {
      const mockPack = { id: '1', name: 'Test Pack' };
      const mockPlayers = [{ id: 'p1' }, { id: 'p2' }];
      const mockUpdatedPack = { id: '1', packPlayers: [{ player: { id: 'p1' } }, { player: { id: 'p2' } }] };

      mockedPrisma.pack.findUnique.mockResolvedValue(mockPack);
      mockedPrisma.player.findMany.mockResolvedValue(mockPlayers);
      mockedPrisma.packPlayer.findMany.mockResolvedValue([]); // No existing players
      mockedPrisma.packPlayer.createMany.mockResolvedValue({ count: 2 });
      mockedPrisma.pack.findUnique.mockResolvedValue(mockUpdatedPack);

      await addPlayersTopack(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Added 2 players to pack',
        data: mockUpdatedPack,
        addedPlayers: 2,
        skippedPlayers: 0
      });
    });

    it('should validate playerIds array', async () => {
      mockRequest.body.playerIds = [];

      await addPlayersTopack(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Invalid player IDs',
        message: 'playerIds must be a non-empty array'
      });
    });

    it('should skip players already in pack', async () => {
      const mockPack = { id: '1', name: 'Test Pack' };
      const mockPlayers = [{ id: 'p1' }, { id: 'p2' }];
      const existingPackPlayers = [{ playerId: 'p1' }]; // p1 already in pack

      mockedPrisma.pack.findUnique.mockResolvedValue(mockPack);
      mockedPrisma.player.findMany.mockResolvedValue(mockPlayers);
      mockedPrisma.packPlayer.findMany.mockResolvedValue(existingPackPlayers);
      mockedPrisma.packPlayer.createMany.mockResolvedValue({ count: 1 });

      await addPlayersTopack(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Added 1 players to pack',
          addedPlayers: 1,
          skippedPlayers: 1
        })
      );
    });
  });

  describe('removePlayersFromPack', () => {
    beforeEach(() => {
      mockRequest.params = { id: '1' };
      mockRequest.body = { playerIds: ['p1', 'p2'] };
    });

    it('should remove players from pack successfully', async () => {
      const mockPack = { id: '1', name: 'Test Pack' };
      const mockUpdatedPack = { id: '1', packPlayers: [] };

      mockedPrisma.pack.findUnique.mockResolvedValue(mockPack);
      mockedPrisma.packPlayer.deleteMany.mockResolvedValue({ count: 2 });
      mockedPrisma.pack.findUnique.mockResolvedValue(mockUpdatedPack);

      await removePlayersFromPack(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Removed 2 players from pack',
        data: mockUpdatedPack,
        removedPlayers: 2
      });
    });

    it('should validate playerIds array', async () => {
      mockRequest.body.playerIds = 'invalid';

      await removePlayersFromPack(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Invalid player IDs',
        message: 'playerIds must be a non-empty array'
      });
    });
  });

  describe('getAvailablePacks', () => {
    it('should return only active packs with public info', async () => {
      const mockPacks = [
        {
          id: '1',
          name: 'Premium Pack',
          imageUrl: '/images/pack1.jpg',
          price: 100,
          status: 'ACTIVE',
          packPlayers: [{ player: { id: 'p1' } }, { player: { id: 'p2' } }]
        }
      ];

      mockedPrisma.pack.findMany.mockResolvedValue(mockPacks);

      await getAvailablePacks(mockRequest as Request, mockResponse as Response);

      expect(mockedPrisma.pack.findMany).toHaveBeenCalledWith({
        where: { status: 'ACTIVE' },
        include: expect.any(Object),
        orderBy: { price: 'asc' }
      });

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: [
          {
            id: '1',
            name: 'Premium Pack',
            imageUrl: '/images/pack1.jpg',
            price: 100,
            playerCount: 2,
            status: 'ACTIVE'
          }
        ],
        count: 1
      });
    });
  });

  describe('recalculatePackPercentages', () => {
    beforeEach(() => {
      mockRequest.params = { id: '1' };
    });

    it('should recalculate percentages successfully', async () => {
      const mockPack = {
        id: '1',
        packPlayers: [
          { player: { id: 'p1', percentage: 0.3 } },
          { player: { id: 'p2', percentage: 0.9 } } // Total = 1.2, needs scaling
        ]
      };
      const mockUpdatedPack = {
        id: '1',
        packPlayers: [
          { player: { id: 'p1', percentage: 0.25 } }, // 0.3 * (1.0/1.2)
          { player: { id: 'p2', percentage: 0.75 } }  // 0.9 * (1.0/1.2)
        ]
      };

      mockedPrisma.pack.findUnique
        .mockResolvedValueOnce(mockPack)
        .mockResolvedValueOnce(mockUpdatedPack);
      
      mockedPrisma.player.update.mockResolvedValue({});

      await recalculatePackPercentages(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Pack percentages recalculated',
        data: {
          pack: mockUpdatedPack,
          recalculation: {
            oldTotal: 1.2,
            newTotal: 1.0,
            scaleFactor: 1.0 / 1.2,
            updates: [
              { playerId: 'p1', oldPercentage: 0.3, newPercentage: 0.25 },
              { playerId: 'p2', oldPercentage: 0.9, newPercentage: 0.75 }
            ]
          }
        }
      });
    });

    it('should return 400 when pack has no valid percentages', async () => {
      const mockPack = {
        id: '1',
        packPlayers: [
          { player: { id: 'p1', percentage: 0.0 } },
          { player: { id: 'p2', percentage: 0.0 } }
        ]
      };

      mockedPrisma.pack.findUnique.mockResolvedValue(mockPack);

      await recalculatePackPercentages(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Cannot recalculate',
        message: 'Pack has no players with valid percentages'
      });
    });
  });
});