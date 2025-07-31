import request from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { register, login } from './authController.js';
import { prisma } from '../db/connection.js';

// Mock Prisma
jest.mock('../db/connection.js', () => ({
  prisma: {
    user: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn()
    }
  }
}));

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn()
}));

// Mock jwt
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn()
}));

const mockedPrisma = jest.mocked(prisma);
const mockedBcrypt = jest.mocked(bcrypt);
const mockedJwt = jest.mocked(jwt);

describe('Auth Controller', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.post('/auth/register', register);
    app.post('/auth/login', login);

    // Reset all mocks
    jest.clearAllMocks();
    
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
      password: 'password123'
    };

    it('should register a new user successfully', async () => {
      // Mock: no existing user
      mockedPrisma.user.findFirst.mockResolvedValue(null);
      
      // Mock: password hashing
      mockedBcrypt.hash.mockResolvedValue('hashed-password');
      
      // Mock: user creation
      const mockUser = {
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        coins: 1000,
        role: 'USER' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockedPrisma.user.create.mockResolvedValue(mockUser);
      
      // Mock: JWT token generation
      mockedJwt.sign.mockReturnValue('mock-jwt-token');

      const response = await request(app)
        .post('/auth/register')
        .send(validRegisterData);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        success: true,
        data: {
          user: {
            id: 'user-1',
            username: 'testuser',
            email: 'test@example.com',
            coins: 1000,
            role: 'USER'
          },
          token: 'mock-jwt-token'
        }
      });

      // Verify bcrypt.hash was called with correct parameters
      expect(mockedBcrypt.hash).toHaveBeenCalledWith('password123', 12);
      
      // Verify user creation
      expect(mockedPrisma.user.create).toHaveBeenCalledWith({
        data: {
          username: 'testuser',
          email: 'test@example.com',
          passwordHash: 'hashed-password',
          coins: 1000,
          role: 'USER'
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
        role: 'USER' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockedPrisma.user.findFirst.mockResolvedValue(existingUser);

      const response = await request(app)
        .post('/auth/register')
        .send(validRegisterData);

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        error: 'User with this email or username already exists'
      });

      // Verify no user creation attempt
      expect(mockedPrisma.user.create).not.toHaveBeenCalled();
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
      mockedPrisma.user.findFirst.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/auth/register')
        .send(validRegisterData);

      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        success: false,
        error: 'Failed to register user'
      });
    });
  });

  describe('POST /auth/login', () => {
    const validLoginData = {
      email: 'test@example.com',
      password: 'password123'
    };

    it('should login user successfully', async () => {
      // Mock: user found
      const mockUser = {
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        coins: 1000,
        role: 'USER' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockedPrisma.user.findUnique.mockResolvedValue(mockUser);
      
      // Mock: password comparison success
      mockedBcrypt.compare.mockResolvedValue(true);
      
      // Mock: JWT token generation
      mockedJwt.sign.mockReturnValue('mock-jwt-token');

      const response = await request(app)
        .post('/auth/login')
        .send(validLoginData);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: {
          user: {
            id: 'user-1',
            username: 'testuser',
            email: 'test@example.com',
            coins: 1000,
            role: 'USER'
          },
          token: 'mock-jwt-token'
        }
      });

      // Verify password comparison
      expect(mockedBcrypt.compare).toHaveBeenCalledWith('password123', 'hashed-password');
    });

    it('should return error for invalid credentials - user not found', async () => {
      // Mock: no user found
      mockedPrisma.user.findUnique.mockResolvedValue(null);

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
        role: 'USER' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockedPrisma.user.findUnique.mockResolvedValue(mockUser);
      
      // Mock: password comparison failure
      mockedBcrypt.compare.mockResolvedValue(false);

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
      mockedPrisma.user.findUnique.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/auth/login')
        .send(validLoginData);

      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        success: false,
        error: 'Failed to login'
      });
    });
  });
});