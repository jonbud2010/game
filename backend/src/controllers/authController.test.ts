import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { register, login } from './authController';
import { prisma } from '../db/client';

// Mock Prisma
vi.mock('../db/client', () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn()
    }
  }
}));

// Mock bcrypt
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn()
  },
  hash: vi.fn(),
  compare: vi.fn()
}));

// Mock jwt
vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn()
  },
  sign: vi.fn()
}));

const mockedPrisma = vi.mocked(prisma);
const mockedBcrypt = vi.mocked(bcrypt);
const mockedJwt = vi.mocked(jwt);

// Properly type the mocked Prisma methods
const mockedUserFindFirst = vi.mocked(prisma.user.findFirst);
const mockedUserCreate = vi.mocked(prisma.user.create);
const mockedUserFindUnique = vi.mocked(prisma.user.findUnique);

describe('Auth Controller', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.post('/auth/register', register);
    app.post('/auth/login', login);

    // Reset all mocks
    vi.clearAllMocks();
    
    // Set default JWT_SECRET for tests
    process.env.JWT_SECRET = 'test-jwt-secret';
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  describe('POST /auth/register', () => {
    const validRegisterData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'Password123'
    };

    it('should register a new user successfully', async () => {
      // Mock: no existing user
      mockedUserFindFirst.mockResolvedValue(null);
      
      // Mock: password hashing
      mockedBcrypt.hash.mockResolvedValue('hashed-password' as never);
      
      // Mock: user creation
      const mockUser = {
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        coins: 1000,
        role: 'PLAYER' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockedUserCreate.mockResolvedValue(mockUser);
      
      // Mock: JWT token generation
      mockedJwt.sign.mockReturnValue('mock-jwt-token' as never);

      const response = await request(app)
        .post('/auth/register')
        .send(validRegisterData);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        message: 'User registered successfully',
        user: {
          id: expect.any(String),
          username: 'testuser',
          email: 'test@example.com',
          coins: 1000,
          role: 'PLAYER'
        },
        token: 'mock-jwt-token'
      });

      // Verify bcrypt.hash was called with correct parameters
      expect(mockedBcrypt.hash).toHaveBeenCalledWith('Password123', 12);
      
      // Verify user creation
      expect(mockedUserCreate).toHaveBeenCalledWith({
        data: {
          username: 'testuser',
          email: 'test@example.com',
          passwordHash: 'hashed-password',
          coins: 1000,
          role: 'PLAYER'
        },
        select: {
          id: true,
          username: true,
          email: true,
          coins: true,
          role: true,
          createdAt: true
        }
      });
    });

    it('should return error for existing user', async () => {
      // Mock: existing user found
      const existingUser = {
        id: 'existing-user',
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hash',
        coins: 1000,
        role: 'PLAYER' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockedUserFindFirst.mockResolvedValue(existingUser);

      const response = await request(app)
        .post('/auth/register')
        .send(validRegisterData);

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        error: 'Email already registered'
      });

      // Verify no user creation attempt
      expect(mockedUserCreate).not.toHaveBeenCalled();
    });

    it('should return validation error for missing fields', async () => {
      const invalidData = {
        username: 'testuser',
        // Missing email and password
      };

      const response = await request(app)
        .post('/auth/register')
        .send(invalidData);

      expect(response.status).toBe(400);
    });

    it('should handle database errors', async () => {
      mockedUserFindFirst.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/auth/register')
        .send(validRegisterData);

      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        error: 'Internal server error'
      });
    });
  });

  describe('POST /auth/login', () => {
    const validLoginData = {
      email: 'test@example.com',
      password: 'Password123'
    };

    it('should login user successfully', async () => {
      // Mock: user found
      const mockUser = {
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        coins: 1000,
        role: 'PLAYER' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockedUserFindUnique.mockResolvedValue(mockUser);
      
      // Mock: password comparison success
      mockedBcrypt.compare.mockResolvedValue(true as never);
      
      // Mock: JWT token generation
      mockedJwt.sign.mockReturnValue('mock-jwt-token' as never);

      const response = await request(app)
        .post('/auth/login')
        .send(validLoginData);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        message: 'Login successful',
        user: {
          id: expect.any(String),
          username: 'testuser',
          email: 'test@example.com',
          coins: 1000,
          role: 'PLAYER'
        },
        token: 'mock-jwt-token'
      });

      // Verify password comparison
      expect(mockedBcrypt.compare).toHaveBeenCalledWith('Password123', 'hashed-password');
    });

    it('should return error for invalid credentials - user not found', async () => {
      // Mock: no user found
      mockedUserFindUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/auth/login')
        .send(validLoginData);

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        error: 'Invalid credentials'
      });
    });

    it('should return error for invalid credentials - wrong password', async () => {
      // Mock: user found
      const mockUser = {
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        coins: 1000,
        role: 'PLAYER' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockedUserFindUnique.mockResolvedValue(mockUser);
      
      // Mock: password comparison failure
      mockedBcrypt.compare.mockResolvedValue(false as never);

      const response = await request(app)
        .post('/auth/login')
        .send(validLoginData);

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        error: 'Invalid credentials'
      });
    });

    it('should return validation error for missing fields', async () => {
      const invalidData = {
        email: 'test@example.com'
        // Missing password
      };

      const response = await request(app)
        .post('/auth/login')
        .send(invalidData);

      expect(response.status).toBe(400);
    });

    it('should handle database errors', async () => {
      mockedUserFindUnique.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/auth/login')
        .send(validLoginData);

      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        error: 'Internal server error'
      });
    });
  });
});