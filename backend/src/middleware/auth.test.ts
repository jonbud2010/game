import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticateToken, requireAdmin, optionalAuth } from './auth.js';
import { prisma } from '../db/client.js';

// Mock dependencies
jest.mock('jsonwebtoken');
jest.mock('../db/client.js', () => ({
  prisma: {
    user: {
      findUnique: jest.fn()
    }
  }
}));

const mockedJwt = jest.mocked(jwt);
const mockedPrisma = jest.mocked(prisma);

describe('Auth Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockNext = jest.fn();
    
    mockRequest = {
      headers: {}
    };
    mockResponse = {
      json: mockJson,
      status: mockStatus
    };

    // Reset all mocks
    jest.clearAllMocks();
    
    // Set default JWT_SECRET for tests
    process.env.JWT_SECRET = 'test-jwt-secret';
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  describe('authenticateToken', () => {
    it('should authenticate valid token successfully', async () => {
      const mockUser = {
        id: 'user1',
        username: 'testuser',
        email: 'test@example.com',
        role: 'USER'
      };
      const mockDecoded = { userId: 'user1', iat: 123, exp: 456 };

      mockRequest.headers = {
        authorization: 'Bearer valid-token'
      };

      mockedJwt.verify.mockReturnValue(mockDecoded);
      mockedPrisma.user.findUnique.mockResolvedValue(mockUser);

      await authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

      expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test-jwt-secret');
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user1' },
        select: {
          id: true,
          username: true,
          email: true,
          role: true
        }
      });
      expect(mockRequest.userId).toBe('user1');
      expect(mockRequest.user).toEqual({
        ...mockUser,
        userId: 'user1'
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 401 when no token provided', async () => {
      mockRequest.headers = {}; // No authorization header

      await authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Access token required' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when authorization header is malformed', async () => {
      mockRequest.headers = {
        authorization: 'InvalidFormat'
      };

      await authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Access token required' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 500 when JWT_SECRET is not set', async () => {
      delete process.env.JWT_SECRET;
      mockRequest.headers = {
        authorization: 'Bearer valid-token'
      };

      await authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Internal server error' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when token is invalid', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token'
      };

      mockedJwt.verify.mockImplementation(() => {
        throw new jwt.JsonWebTokenError('Invalid token');
      });

      await authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Invalid token' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when token is expired', async () => {
      mockRequest.headers = {
        authorization: 'Bearer expired-token'
      };

      mockedJwt.verify.mockImplementation(() => {
        throw new jwt.TokenExpiredError('Token expired', new Date());
      });

      await authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Token expired' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when user not found in database', async () => {
      const mockDecoded = { userId: 'nonexistent', iat: 123, exp: 456 };

      mockRequest.headers = {
        authorization: 'Bearer valid-token'
      };

      mockedJwt.verify.mockReturnValue(mockDecoded);
      mockedPrisma.user.findUnique.mockResolvedValue(null);

      await authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Invalid token' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      const mockDecoded = { userId: 'user1', iat: 123, exp: 456 };

      mockRequest.headers = {
        authorization: 'Bearer valid-token'
      };

      mockedJwt.verify.mockReturnValue(mockDecoded);
      mockedPrisma.user.findUnique.mockRejectedValue(new Error('Database error'));

      await authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Internal server error' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle unexpected JWT errors', async () => {
      mockRequest.headers = {
        authorization: 'Bearer problematic-token'
      };

      mockedJwt.verify.mockImplementation(() => {
        throw new Error('Unexpected JWT error');
      });

      await authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Internal server error' });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireAdmin', () => {
    it('should allow access for admin users', () => {
      mockRequest.user = {
        id: 'admin1',
        username: 'admin',
        email: 'admin@example.com',
        role: 'ADMIN'
      };

      requireAdmin(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('should return 401 when user is not authenticated', () => {
      mockRequest.user = undefined;

      requireAdmin(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Authentication required' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 when user is not admin', () => {
      mockRequest.user = {
        id: 'user1',
        username: 'user',
        email: 'user@example.com',
        role: 'USER'
      };

      requireAdmin(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Admin access required' });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuth', () => {
    it('should authenticate user when valid token provided', async () => {
      const mockUser = {
        id: 'user1',
        username: 'testuser',
        email: 'test@example.com',
        role: 'USER'
      };
      const mockDecoded = { userId: 'user1', iat: 123, exp: 456 };

      mockRequest.headers = {
        authorization: 'Bearer valid-token'
      };

      mockedJwt.verify.mockReturnValue(mockDecoded);
      mockedPrisma.user.findUnique.mockResolvedValue(mockUser);

      await optionalAuth(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.userId).toBe('user1');
      expect(mockRequest.user).toEqual({
        ...mockUser,
        userId: 'user1'
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue without authentication when no token provided', async () => {
      mockRequest.headers = {}; // No authorization header

      await optionalAuth(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.userId).toBeUndefined();
      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(jwt.verify).not.toHaveBeenCalled();
    });

    it('should continue without authentication when JWT_SECRET is missing', async () => {
      delete process.env.JWT_SECRET;
      mockRequest.headers = {
        authorization: 'Bearer some-token'
      };

      await optionalAuth(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.userId).toBeUndefined();
      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(jwt.verify).not.toHaveBeenCalled();
    });

    it('should continue without authentication when token is invalid', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token'
      };

      mockedJwt.verify.mockImplementation(() => {
        throw new jwt.JsonWebTokenError('Invalid token');
      });

      await optionalAuth(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.userId).toBeUndefined();
      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue without authentication when user not found', async () => {
      const mockDecoded = { userId: 'nonexistent', iat: 123, exp: 456 };

      mockRequest.headers = {
        authorization: 'Bearer valid-token'
      };

      mockedJwt.verify.mockReturnValue(mockDecoded);
      mockedPrisma.user.findUnique.mockResolvedValue(null);

      await optionalAuth(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.userId).toBeUndefined();
      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      const mockDecoded = { userId: 'user1', iat: 123, exp: 456 };

      mockRequest.headers = {
        authorization: 'Bearer valid-token'
      };

      mockedJwt.verify.mockReturnValue(mockDecoded);
      mockedPrisma.user.findUnique.mockRejectedValue(new Error('Database error'));

      await optionalAuth(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.userId).toBeUndefined();
      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should set user when token is valid and user exists', async () => {
      const mockUser = {
        id: 'user1',
        username: 'testuser',
        email: 'test@example.com',
        role: 'USER'
      };
      const mockDecoded = { userId: 'user1', iat: 123, exp: 456 };

      mockRequest.headers = {
        authorization: 'Bearer valid-token'
      };

      mockedJwt.verify.mockReturnValue(mockDecoded);
      mockedPrisma.user.findUnique.mockResolvedValue(mockUser);

      await optionalAuth(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.userId).toBe('user1');
      expect(mockRequest.user).toEqual({
        ...mockUser,
        userId: 'user1'
      });
      expect(mockNext).toHaveBeenCalled();
    });
  });
});