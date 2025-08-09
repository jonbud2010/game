/**
 * Authentication Controller Integration Tests
 * Tests mit echter SQLite Database - Full API Flow Testing
 */

import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { testDb, createTestUsers } from '../../vitest.integration.setup';
import authRoutes from '../routes/authRoutes';
import { setTestDatabase, clearTestDatabase } from '../middleware/auth';

// Express App für Integration Tests
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Authentication Integration Tests', () => {
  beforeAll(async () => {
    setTestDatabase(testDb);
  });

  afterAll(async () => {
    clearTestDatabase();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user with valid data', async () => {
      const userData = {
        username: 'newuser',
        email: 'newuser@test.com',
        password: 'Password123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);
      expect(response.body).toMatchObject({
        message: 'User registered successfully',
        user: {
          username: 'newuser',
          email: 'newuser@test.com',
          role: 'PLAYER',
          coins: 1000
        }
      });

      expect(response.body.token).toBeDefined();
      expect(typeof response.body.token).toBe('string');

      // Verify user was created in database
      const createdUser = await testDb.user.findUnique({
        where: { email: 'newuser@test.com' }
      });

      expect(createdUser).toBeTruthy();
      expect(createdUser?.username).toBe('newuser');
      expect(createdUser?.role).toBe('PLAYER');
      expect(createdUser?.coins).toBe(1000);

      // Verify password was hashed
      expect(createdUser?.passwordHash).not.toBe('Password123');
      const isValidPassword = await bcrypt.compare('Password123', createdUser?.passwordHash || '');
      expect(isValidPassword).toBe(true);
    });

    it('should reject registration with duplicate email', async () => {
      // Create first user
      const userData = {
        username: 'user1',
        email: 'duplicate@test.com',
        password: 'Password123'
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Try to create second user with same email
      const duplicateUserData = {
        username: 'user2',
        email: 'duplicate@test.com',
        password: 'Password456'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(duplicateUserData)
        .expect(400);

      expect(response.body.error).toBe('Email already registered');
    });

    it('should reject registration with invalid data', async () => {
      const invalidData = {
        username: '', // Empty username
        email: 'invalid-email', // Invalid email format
        password: '123' // Too short password and missing pattern requirements
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toBe('Validation error');
      expect(response.body.details).toBeDefined();
    });
  });

  describe('POST /api/auth/login', () => {
    let testUser: any;

    beforeEach(async () => {
      // Create test user for login tests
      const { playerUser } = await createTestUsers();
      testUser = playerUser;
    });

    it('should login with valid credentials', async () => {
      const loginData = {
        email: 'player@test.com',
        password: 'Password123' // This matches the test hash setup
      };

      // Note: The test setup uses a fixed hash, so we need to update the user with a real hash
      const hashedPassword = await bcrypt.hash('Password123', 10);
      await testDb.user.update({
        where: { id: testUser.id },
        data: { passwordHash: hashedPassword }
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Login successful',
        user: {
          username: 'testplayer',
          email: 'player@test.com',
          role: 'PLAYER',
          coins: 500
        }
      });

      expect(response.body.token).toBeDefined();
      expect(typeof response.body.token).toBe('string');
    });

    it('should reject login with invalid email', async () => {
      const loginData = {
        email: 'nonexistent@test.com',
        password: 'Password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should reject login with invalid password', async () => {
      const hashedPassword = await bcrypt.hash('correctpassword', 10);
      await testDb.user.update({
        where: { id: testUser.id },
        data: { passwordHash: hashedPassword }
      });

      const loginData = {
        email: 'player@test.com',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should reject login with missing data', async () => {
      const loginData = {
        email: 'player@test.com'
        // Missing password
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(400);

      expect(response.body.error).toBe('Validation error');
    });
  });

  describe('GET /api/auth/me', () => {
    let testUser: any;
    let authToken: string;

    beforeEach(async () => {
      // Create user and get auth token
      const userData = {
        username: 'authuser',
        email: 'authuser@test.com',
        password: 'Password123'
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData);

      testUser = registerResponse.body.user;
      authToken = registerResponse.body.token;
    });

    it('should return current user with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.user).toMatchObject({
        username: 'authuser',
        email: 'authuser@test.com',
        role: 'PLAYER',
        coins: 1000
      });
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.error).toBe('Access token required');
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.error).toBe('Invalid token');
    });

    it('should reject request with malformed authorization header', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'InvalidFormat')
        .expect(401);

      expect(response.body.error).toBe('Access token required');
    });
  });
});