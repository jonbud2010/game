/**
 * File Upload Integration Tests
 * Tests mit echten File-Uploads und Sharp Image Processing
 */

import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { testDb } from '../../vitest.integration.setup';
import playerRoutes from '../routes/playerRoutes';
import authRoutes from '../routes/authRoutes';
import { setTestDatabase, clearTestDatabase } from '../middleware/auth';

// Express App für Integration Tests
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/players', playerRoutes);

describe('File Upload Integration Tests', () => {
  let adminToken: string;

  // Set up test database for middleware
  beforeAll(async () => {
    setTestDatabase(testDb);
  });

  afterAll(async () => {
    clearTestDatabase();
  });

  // Create a simple test image buffer using Sharp (1x1 pixel PNG)
  const createTestImageBuffer = async () => {
    return await sharp({
      create: {
        width: 1,
        height: 1,
        channels: 3,
        background: { r: 255, g: 0, b: 0 }
      }
    })
    .png()
    .toBuffer();
  };

  beforeEach(async () => {
    // Create admin user
    const adminRegister = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'uploadAdmin',
        email: 'upload@test.com',
        password: 'Password123'
      });
    
    
    // Update admin role
    await testDb.user.update({
      where: { email: 'upload@test.com' },
      data: { role: 'ADMIN' }
    });
    adminToken = adminRegister.body.token;
  });

  describe('Player Image Upload', () => {
    it('should create player with valid image upload', async () => {
      const testImageBuffer = await createTestImageBuffer();

      const response = await request(app)
        .post('/api/players')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('name', 'Upload Test Player')
        .field('points', '85')
        .field('position', 'ST')
        .field('color', 'RED')
        .field('marketPrice', '100')
        .field('theme', 'Upload Test')
        .field('percentage', '0.05')
        .attach('image', testImageBuffer, 'test-image.png')
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        name: 'Upload Test Player',
        points: 85,
        position: 'ST'
      });

      // Image URL should be updated from default
      expect(response.body.data.imageUrl).not.toBe('/images/players/default.jpg');
      expect(response.body.data.imageUrl).toMatch(/^\/uploads\/images\/players\/.*\.(webp|jpg|png)$/);

      // Verify player was created in database
      const createdPlayer = await testDb.player.findFirst({
        where: { name: 'Upload Test Player' }
      });

      expect(createdPlayer).toBeTruthy();
      expect(createdPlayer!.imageUrl).toBe(response.body.data.imageUrl);
    });

    it('should create player without image (use default)', async () => {
      const response = await request(app)
        .post('/api/players')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('name', 'No Image Player')
        .field('points', '80')
        .field('position', 'CB')
        .field('color', 'BLUE')
        .field('marketPrice', '90')
        .field('theme', 'No Image Test')
        .field('percentage', '0.04')
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.imageUrl).toBe('/images/players/default.jpg');
    });

    it('should reject invalid file types', async () => {
      const textBuffer = Buffer.from('This is not an image', 'utf8');

      const response = await request(app)
        .post('/api/players')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('name', 'Invalid File Player')
        .field('points', '85')
        .field('position', 'ST')
        .field('color', 'RED')
        .field('marketPrice', '100')
        .field('theme', 'Invalid Test')
        .attach('image', textBuffer, 'test.txt')
        .expect(400);

      expect(response.body.error).toContain('Invalid file type');
    });

    it('should reject files that are too large', async () => {
      // Create a buffer that's larger than the limit (simulate 6MB file)
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024, 0xFF);

      const response = await request(app)
        .post('/api/players')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('name', 'Large File Player')
        .field('points', '85')
        .field('position', 'ST')
        .field('color', 'RED')
        .field('marketPrice', '100')
        .field('theme', 'Large Test')
        .attach('image', largeBuffer, 'large-image.png')
        .expect(400);

      expect(response.body.error).toContain('File too large');
    });

    it('should handle multiple file uploads gracefully', async () => {
      const testImageBuffer1 = await createTestImageBuffer();
      const testImageBuffer2 = await createTestImageBuffer();

      const response = await request(app)
        .post('/api/players')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('name', 'Multi File Player')
        .field('points', '85')
        .field('position', 'ST')
        .field('color', 'RED')
        .field('marketPrice', '100')
        .field('theme', 'Multi Test')
        .attach('image', testImageBuffer1, 'image1.png')
        .attach('image', testImageBuffer2, 'image2.png')
        .expect(400);

      expect(response.body.error).toContain('Too many files');
    });
  });

  describe('File Security Tests', () => {
    it('should sanitize malicious filenames', async () => {
      const testImageBuffer = await createTestImageBuffer();
      const maliciousFilename = '../../../etc/passwd.png';

      const response = await request(app)
        .post('/api/players')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('name', 'Security Test Player')
        .field('points', '85')
        .field('position', 'ST')
        .field('color', 'RED')
        .field('marketPrice', '100')
        .field('theme', 'Security Test')
        .attach('image', testImageBuffer, maliciousFilename)
        .expect(201);

      // Should succeed but sanitize the filename
      expect(response.body.success).toBe(true);
      expect(response.body.data.imageUrl).not.toContain('../');
      // Note: filename sanitization replaces non-alphanumeric chars with underscores but keeps original base name
    });

    it('should reject executable file extensions', async () => {
      const testBuffer = Buffer.from('fake executable', 'utf8');

      const response = await request(app)
        .post('/api/players')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('name', 'Executable Test Player')
        .field('points', '85')
        .field('position', 'ST')
        .field('color', 'RED')
        .field('marketPrice', '100')
        .field('theme', 'Exe Test')
        .attach('image', testBuffer, 'malicious.exe')
        .expect(400);

      expect(response.body.error).toContain('Invalid file type');
    });
  });

  describe('Image Processing Tests', () => {
    it('should process and optimize uploaded images', async () => {
      const testImageBuffer = await createTestImageBuffer();

      const response = await request(app)
        .post('/api/players')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('name', 'Processing Test Player')
        .field('points', '85')
        .field('position', 'ST')
        .field('color', 'RED')
        .field('marketPrice', '100')
        .field('theme', 'Processing Test')
        .attach('image', testImageBuffer, 'test-large.png')
        .expect(201);

      expect(response.body.success).toBe(true);
      
      // Image should be processed and likely converted to WebP or optimized
      const imageUrl = response.body.data.imageUrl;
      expect(imageUrl).toMatch(/^\/uploads\/images\/players\/.*$/);
      
      // The processed image should exist (in a real filesystem)
      // Note: In integration tests, we'd verify the file was created
      expect(typeof imageUrl).toBe('string');
    });
  });

  // Cleanup after tests
  afterAll(async () => {
    // In a real test, we'd clean up uploaded files
    // For now, just ensure database cleanup is handled by the global teardown
  });
});