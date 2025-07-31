import { Request, Response } from 'express';
import {
  getAllFormations,
  getFormationById,
  createFormation,
  updateFormation,
  deleteFormation,
  getFormationStats
} from './formationController.js';
import { prisma } from '../db/client.js';

// Mock Prisma
jest.mock('../db/client.js', () => ({
  prisma: {
    formation: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    }
  }
}));

const mockedPrisma = jest.mocked(prisma);

describe('Formation Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    
    mockRequest = {};
    mockResponse = {
      json: mockJson,
      status: mockStatus
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('getAllFormations', () => {
    it('should return all formations successfully', async () => {
      const mockFormations = [
        { id: '1', name: '4-4-2', positions: '[]', createdAt: new Date() },
        { id: '2', name: '4-3-3', positions: '[]', createdAt: new Date() }
      ];
      
      mockedPrisma.formation.findMany.mockResolvedValue(mockFormations);

      await getAllFormations(mockRequest as Request, mockResponse as Response);

      expect(mockedPrisma.formation.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' }
      });
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: mockFormations,
        count: 2
      });
    });

    it('should handle database errors', async () => {
      const error = new Error('Database connection failed');
      mockedPrisma.formation.findMany.mockRejectedValue(error);

      await getAllFormations(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Failed to fetch formations',
        details: 'Database connection failed'
      });
    });
  });

  describe('getFormationById', () => {
    beforeEach(() => {
      mockRequest.params = { id: '1' };
    });

    it('should return formation by id successfully', async () => {
      const mockFormation = {
        id: '1',
        name: '4-4-2',
        positions: '[{"position":"GK","x":50,"y":10}]',
        teams: []
      };
      
      mockedPrisma.formation.findUnique.mockResolvedValue(mockFormation);

      await getFormationById(mockRequest as Request, mockResponse as Response);

      expect(mockedPrisma.formation.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: {
          teams: {
            include: {
              user: { select: { id: true, username: true } },
              lobby: { select: { id: true, name: true } }
            }
          }
        }
      });
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: {
          ...mockFormation,
          positions: [{ position: 'GK', x: 50, y: 10 }]
        }
      });
    });

    it('should return 404 when formation not found', async () => {
      mockedPrisma.formation.findUnique.mockResolvedValue(null);

      await getFormationById(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Formation not found',
        message: 'No formation found with ID: 1'
      });
    });

    it('should handle invalid JSON in positions', async () => {
      const mockFormation = {
        id: '1',
        name: '4-4-2',
        positions: 'invalid json',
        teams: []
      };
      
      mockedPrisma.formation.findUnique.mockResolvedValue(mockFormation);

      await getFormationById(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: {
          ...mockFormation,
          positions: []
        }
      });
    });
  });

  describe('createFormation', () => {
    const validPositions = Array.from({ length: 11 }, (_, i) => ({
      position: 'GK',
      x: 50,
      y: 10 + i * 10
    }));

    beforeEach(() => {
      mockRequest.body = {
        name: '4-4-2',
        positions: validPositions
      };
    });

    it('should create formation successfully', async () => {
      const mockFormation = {
        id: '1',
        name: '4-4-2',
        imageUrl: '/images/formations/default.jpg',
        positions: JSON.stringify(validPositions)
      };
      
      mockedPrisma.formation.create.mockResolvedValue(mockFormation);

      await createFormation(mockRequest as Request, mockResponse as Response);

      expect(mockedPrisma.formation.create).toHaveBeenCalledWith({
        data: {
          name: '4-4-2',
          imageUrl: '/images/formations/default.jpg',
          positions: JSON.stringify(validPositions)
        }
      });
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Formation created successfully',
        data: {
          ...mockFormation,
          positions: validPositions
        }
      });
    });

    it('should validate positions array length', async () => {
      mockRequest.body.positions = Array.from({ length: 10 }, () => ({ position: 'GK', x: 50, y: 10 }));

      await createFormation(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Invalid positions',
        message: 'Formation must have exactly 11 positions'
      });
    });

    it('should validate position types', async () => {
      const invalidPositions = Array.from({ length: 11 }, () => ({
        position: 'INVALID',
        x: 50,
        y: 10
      }));
      mockRequest.body.positions = invalidPositions;

      await createFormation(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Invalid position',
        message: 'Position at index 0 has invalid position type: INVALID'
      });
    });

    it('should validate position coordinates', async () => {
      const invalidPositions = Array.from({ length: 11 }, () => ({
        position: 'GK',
        x: 'invalid',
        y: 10
      }));
      mockRequest.body.positions = invalidPositions;

      await createFormation(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Invalid coordinates',
        message: 'Position at index 0 must have numeric x and y coordinates'
      });
    });

    it('should handle unique constraint violations', async () => {
      const error = { code: 'P2002' };
      mockedPrisma.formation.create.mockRejectedValue(error);

      await createFormation(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Formation already exists',
        message: 'A formation with this name already exists'
      });
    });
  });

  describe('updateFormation', () => {
    const validPositions = Array.from({ length: 11 }, (_, i) => ({
      position: 'GK',
      x: 50,
      y: 10 + i * 10
    }));

    beforeEach(() => {
      mockRequest.params = { id: '1' };
      mockRequest.body = {
        name: 'Updated 4-4-2',
        positions: validPositions
      };
    });

    it('should update formation successfully', async () => {
      const existingFormation = { id: '1', name: '4-4-2' };
      const updatedFormation = {
        id: '1',
        name: 'Updated 4-4-2',
        positions: JSON.stringify(validPositions)
      };
      
      mockedPrisma.formation.findUnique.mockResolvedValue(existingFormation);
      mockedPrisma.formation.update.mockResolvedValue(updatedFormation);

      await updateFormation(mockRequest as Request, mockResponse as Response);

      expect(mockedPrisma.formation.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          name: 'Updated 4-4-2',
          positions: JSON.stringify(validPositions)
        }
      });
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Formation updated successfully',
        data: {
          ...updatedFormation,
          positions: validPositions
        }
      });
    });

    it('should return 404 when formation not found', async () => {
      mockedPrisma.formation.findUnique.mockResolvedValue(null);

      await updateFormation(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Formation not found',
        message: 'No formation found with ID: 1'
      });
    });

    it('should validate positions when updating', async () => {
      const existingFormation = { id: '1', name: '4-4-2' };
      mockRequest.body.positions = Array.from({ length: 10 }, () => ({ position: 'GK', x: 50, y: 10 }));
      
      mockedPrisma.formation.findUnique.mockResolvedValue(existingFormation);

      await updateFormation(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Invalid positions',
        message: 'Formation must have exactly 11 positions'
      });
    });
  });

  describe('deleteFormation', () => {
    beforeEach(() => {
      mockRequest.params = { id: '1' };
    });

    it('should delete formation successfully', async () => {
      const existingFormation = { id: '1', name: '4-4-2', teams: [] };
      
      mockedPrisma.formation.findUnique.mockResolvedValue(existingFormation);
      mockedPrisma.formation.delete.mockResolvedValue(existingFormation);

      await deleteFormation(mockRequest as Request, mockResponse as Response);

      expect(mockedPrisma.formation.delete).toHaveBeenCalledWith({
        where: { id: '1' }
      });
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Formation deleted successfully',
        data: { id: '1' }
      });
    });

    it('should return 404 when formation not found', async () => {
      mockedPrisma.formation.findUnique.mockResolvedValue(null);

      await deleteFormation(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Formation not found',
        message: 'No formation found with ID: 1'
      });
    });

    it('should prevent deletion when formation is in use', async () => {
      const existingFormation = { 
        id: '1', 
        name: '4-4-2', 
        teams: [{ id: 'team1' }, { id: 'team2' }] 
      };
      
      mockedPrisma.formation.findUnique.mockResolvedValue(existingFormation);

      await deleteFormation(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Cannot delete formation',
        message: 'Formation is currently in use by teams',
        details: { usedByTeams: 2 }
      });
    });
  });

  describe('getFormationStats', () => {
    it('should return formation statistics successfully', async () => {
      const mockFormations = [
        {
          id: '1',
          name: '4-4-2',
          imageUrl: '/images/formations/442.jpg',
          positions: '[{"position":"GK"},{"position":"CB"}]',
          teams: [
            { user: { username: 'player1' } },
            { user: { username: 'player2' } }
          ],
          createdAt: new Date('2024-01-01')
        }
      ];
      
      mockedPrisma.formation.findMany.mockResolvedValue(mockFormations);

      await getFormationStats(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: [
          {
            id: '1',
            name: '4-4-2',
            imageUrl: '/images/formations/442.jpg',
            positionCount: 2,
            teamsUsing: 2,
            users: ['player1', 'player2'],
            createdAt: new Date('2024-01-01')
          }
        ],
        totalFormations: 1
      });
    });

    it('should handle formations with invalid JSON positions', async () => {
      const mockFormations = [
        {
          id: '1',
          name: '4-4-2',
          imageUrl: '/images/formations/442.jpg',
          positions: 'invalid json',
          teams: [],
          createdAt: new Date('2024-01-01')
        }
      ];
      
      mockedPrisma.formation.findMany.mockResolvedValue(mockFormations);

      await getFormationStats(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: [
          {
            id: '1',
            name: '4-4-2',
            imageUrl: '/images/formations/442.jpg',
            positionCount: 0,
            teamsUsing: 0,
            users: [],
            createdAt: new Date('2024-01-01')
          }
        ],
        totalFormations: 1
      });
    });
  });
});