import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  validateRegistration,
  validateLogin,
  validateCreatePlayer,
  validateCreateLobby,
  validateCreateFormation,
  validateCreatePack,
  validatePackPlayerManagement,
  validateId
} from './validation';

describe('Validation Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockJson: ReturnType<typeof vi.fn>;
  let mockStatus: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockJson = vi.fn();
    mockStatus = vi.fn().mockReturnValue({ json: mockJson });
    mockNext = vi.fn();
    
    mockRequest = {
      body: {},
      params: {}
    };
    mockResponse = {
      json: mockJson,
      status: mockStatus
    };

    // Reset all mocks
    vi.clearAllMocks();
  });

  describe('validateRegistration', () => {
    it('should pass with valid registration data', () => {
      mockRequest.body = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'TestPass123'
      };

      validateRegistration(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('should reject invalid username', () => {
      mockRequest.body = {
        username: 'ab', // Too short
        email: 'test@example.com',
        password: 'TestPass123'
      };

      validateRegistration(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Validation error',
        details: 'Username must be at least 3 characters long'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject non-alphanumeric username', () => {
      mockRequest.body = {
        username: 'test@user',
        email: 'test@example.com',
        password: 'TestPass123'
      };

      validateRegistration(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Validation error',
        details: 'Username must contain only alphanumeric characters'
      });
    });

    it('should reject invalid email', () => {
      mockRequest.body = {
        username: 'testuser',
        email: 'invalid-email',
        password: 'TestPass123'
      };

      validateRegistration(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Validation error',
        details: 'Please provide a valid email address'
      });
    });

    it('should reject weak password', () => {
      mockRequest.body = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'weakpass' // No uppercase or number
      };

      validateRegistration(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Validation error',
        details: 'Password must contain at least one lowercase letter, one uppercase letter, and one number'
      });
    });

    it('should reject missing required fields', () => {
      mockRequest.body = {
        username: 'testuser'
        // Missing email and password
      };

      validateRegistration(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Validation error',
        details: expect.stringContaining('Email is required')
      });
    });
  });

  describe('validateLogin', () => {
    it('should pass with valid login data', () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'anypassword'
      };

      validateLogin(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('should reject invalid email', () => {
      mockRequest.body = {
        email: 'invalid-email',
        password: 'password'
      };

      validateLogin(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Validation error',
        details: 'Please provide a valid email address'
      });
    });

    it('should reject missing password', () => {
      mockRequest.body = {
        email: 'test@example.com'
        // Missing password
      };

      validateLogin(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Validation error',
        details: 'Password is required'
      });
    });
  });

  describe('validateCreatePlayer', () => {
    it('should pass with valid player data', () => {
      mockRequest.body = {
        name: 'Test Player',
        points: '85',
        position: 'ST',
        color: 'RED',
        marketPrice: '1000',
        theme: 'Premium',
        percentage: '0.05'
      };

      validateCreatePlayer(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.body).toEqual({
        name: 'Test Player',
        points: 85,
        position: 'ST',
        color: 'RED',
        marketPrice: 1000,
        theme: 'Premium',
        percentage: 0.05
      });
    });

    it('should handle German decimal format for percentage', () => {
      mockRequest.body = {
        name: 'Test Player',
        points: '85',
        position: 'ST',
        color: 'RED',
        marketPrice: '1000',
        theme: 'Premium',
        percentage: '0,05' // German format with comma
      };

      validateCreatePlayer(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.body.percentage).toBe(0.05);
    });

    it('should reject invalid points', () => {
      mockRequest.body = {
        name: 'Test Player',
        points: 'invalid',
        position: 'ST',
        color: 'RED',
        marketPrice: '1000',
        theme: 'Premium',
        percentage: '0.05'
      };

      validateCreatePlayer(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Validation error',
        details: 'Points must be a valid number'
      });
    });

    it('should reject invalid position', () => {
      mockRequest.body = {
        name: 'Test Player',
        points: '85',
        position: 'INVALID',
        color: 'RED',
        marketPrice: '1000',
        theme: 'Premium',
        percentage: '0.05'
      };

      validateCreatePlayer(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Validation error',
        details: expect.stringContaining('Position must be one of')
      });
    });

    it('should reject invalid color', () => {
      mockRequest.body = {
        name: 'Test Player',
        points: '85',
        position: 'ST',
        color: 'INVALID_COLOR',
        marketPrice: '1000',
        theme: 'Premium',
        percentage: '0.05'
      };

      validateCreatePlayer(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Validation error',
        details: expect.stringContaining('Color must be one of')
      });
    });

    it('should reject invalid percentage', () => {
      mockRequest.body = {
        name: 'Test Player',
        points: '85',
        position: 'ST',
        color: 'RED',
        marketPrice: '1000',
        theme: 'Premium',
        percentage: 'not-a-number'
      };

      validateCreatePlayer(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Validation error',
        details: 'Percentage must be a valid number (use comma or dot as decimal separator)'
      });
    });

    it('should reject percentage out of range', () => {
      mockRequest.body = {
        name: 'Test Player',
        points: '85',
        position: 'ST',
        color: 'RED',
        marketPrice: '1000',
        theme: 'Premium',
        percentage: '1.5' // > 1 (100%)
      };

      validateCreatePlayer(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Validation error',
        details: expect.stringContaining('Percentage must not exceed 1')
      });
    });
  });

  describe('validateCreateLobby', () => {
    it('should pass with valid lobby data', () => {
      mockRequest.body = {
        name: 'Test Lobby'
      };

      validateCreateLobby(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('should reject empty lobby name', () => {
      mockRequest.body = {
        name: ''
      };

      validateCreateLobby(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Validation error',
        details: 'Lobby name cannot be empty'
      });
    });

    it('should reject lobby name too long', () => {
      mockRequest.body = {
        name: 'a'.repeat(51) // 51 characters, exceeds limit
      };

      validateCreateLobby(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Validation error',
        details: 'Lobby name must not exceed 50 characters'
      });
    });
  });

  describe('validateCreateFormation', () => {
    const validPositions = Array.from({ length: 11 }, (_, i) => ({
      position: 'GK',
      x: 50,
      y: 10 + i * 8
    }));

    it('should pass with valid formation data', () => {
      mockRequest.body = {
        name: '4-4-2',
        positions: validPositions
      };

      validateCreateFormation(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('should reject formation with wrong number of positions', () => {
      mockRequest.body = {
        name: '4-4-2',
        positions: validPositions.slice(0, 10) // Only 10 positions
      };

      validateCreateFormation(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Validation error',
        details: 'Formation must have exactly 11 positions'
      });
    });

    it('should reject invalid position coordinates', () => {
      const invalidPositions = [...validPositions];
      invalidPositions[0] = { position: 'GK', x: -10, y: 50 }; // Invalid x coordinate

      mockRequest.body = {
        name: '4-4-2',
        positions: invalidPositions
      };

      validateCreateFormation(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Validation error',
        details: expect.stringContaining('X coordinate must be at least 0')
      });
    });

    it('should reject invalid position type', () => {
      const invalidPositions = [...validPositions];
      invalidPositions[0] = { position: 'INVALID', x: 50, y: 50 };

      mockRequest.body = {
        name: '4-4-2',
        positions: invalidPositions
      };

      validateCreateFormation(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Validation error',
        details: expect.stringContaining('Position type must be valid')
      });
    });
  });

  describe('validateCreatePack', () => {
    it('should pass with valid pack data', () => {
      mockRequest.body = {
        name: 'Premium Pack',
        price: '100',
        playerIds: '["player1", "player2"]'
      };

      validateCreatePack(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.body).toEqual({
        name: 'Premium Pack',
        price: 100,
        playerIds: ['player1', 'player2']
      });
    });

    it('should handle pack without playerIds', () => {
      mockRequest.body = {
        name: 'Basic Pack',
        price: '50'
      };

      validateCreatePack(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.body).toEqual({
        name: 'Basic Pack',
        price: 50
      });
    });

    it('should reject invalid JSON in playerIds', () => {
      mockRequest.body = {
        name: 'Premium Pack',
        price: '100',
        playerIds: 'invalid json'
      };

      validateCreatePack(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Validation error',
        details: 'playerIds must be a valid JSON array'
      });
    });

    it('should reject invalid price', () => {
      mockRequest.body = {
        name: 'Premium Pack',
        price: 'not-a-number'
      };

      validateCreatePack(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Validation error',
        details: 'Price must be a valid number'
      });
    });

    it('should reject empty pack name', () => {
      mockRequest.body = {
        name: '',
        price: '100'
      };

      validateCreatePack(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Validation error',
        details: 'Pack name cannot be empty'
      });
    });
  });

  describe('validatePackPlayerManagement', () => {
    it('should pass with valid player IDs array', () => {
      mockRequest.body = {
        playerIds: ['player1', 'player2', 'player3']
      };

      validatePackPlayerManagement(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('should reject empty player IDs array', () => {
      mockRequest.body = {
        playerIds: []
      };

      validatePackPlayerManagement(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Validation error',
        details: 'At least one player ID is required'
      });
    });

    it('should reject missing player IDs', () => {
      mockRequest.body = {};

      validatePackPlayerManagement(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Validation error',
        details: 'Player IDs are required'
      });
    });

    it('should reject non-array player IDs', () => {
      mockRequest.body = {
        playerIds: 'not-an-array'
      };

      validatePackPlayerManagement(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Validation error',
        details: 'Player IDs must be an array'
      });
    });
  });

  describe('validateId', () => {
    it('should pass with valid ID', () => {
      mockRequest.params = { id: 'valid-id-123' };

      validateId(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('should reject empty ID', () => {
      mockRequest.params = { id: '' };

      validateId(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Valid ID is required'
      });
    });

    it('should reject whitespace-only ID', () => {
      mockRequest.params = { id: '   ' };

      validateId(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Valid ID is required'
      });
    });

    it('should reject missing ID', () => {
      mockRequest.params = {};

      validateId(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Valid ID is required'
      });
    });
  });

  describe('FormData validation error handling', () => {
    it('should handle generic form data errors', () => {
      // Mock a situation where JSON.parse throws an unexpected error
      mockRequest.body = {
        name: 'Test Player',
        points: '85',
        position: 'ST',
        color: 'RED',
        marketPrice: '1000',
        theme: 'Premium',
        percentage: '0.05'
      };

      // Simulate an error in the validation process
      const originalConsoleError = console.error;
      console.error = vi.fn();

      // Override JSON.parse to throw a different kind of error
      const originalJSONParse = JSON.parse;
      JSON.parse = vi.fn().mockImplementation(() => {
        throw new TypeError('Unexpected error');
      });

      try {
        validateCreatePlayer(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith({
          error: 'Validation error',
          details: 'Invalid form data'
        });
      } finally {
        // Restore original functions
        JSON.parse = originalJSONParse;
        console.error = originalConsoleError;
      }
    });
  });
});