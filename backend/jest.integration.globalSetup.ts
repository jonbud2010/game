/**
 * Jest Integration Test Global Setup
 * Erstellt und konfiguriert Test-Database vor allen Tests
 */

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export default async function globalSetup() {
  console.log('🔧 Setting up integration test database...');

  // Entferne alte Test-Database falls vorhanden
  const testDbPath = path.join(process.cwd(), 'test.db');
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
    console.log('🗑️  Removed old test database');
  }

  // Erstelle neue Test-Database Schema
  try {
    // Copy main database URL to test database
    process.env.DATABASE_URL = 'file:./test.db';
    
    // Run Prisma migrations on test database (Windows compatible)
    execSync('npx prisma migrate dev --name init', { 
      stdio: 'pipe',
      env: { ...process.env, DATABASE_URL: 'file:./test.db' },
      shell: process.platform === 'win32' ? 'cmd.exe' : true
    });
    
    console.log('✅ Test database schema created');
  } catch (error) {
    console.error('❌ Failed to create test database schema:', error);
    // Fallback: Try direct Prisma commands without migration
    try {
      execSync('npx prisma db push', { 
        stdio: 'pipe',
        env: { ...process.env, DATABASE_URL: 'file:./test.db' },
        shell: process.platform === 'win32' ? 'cmd.exe' : true
      });
      console.log('✅ Test database schema created via db push');
    } catch (fallbackError) {
      console.error('❌ Fallback also failed:', fallbackError);
      throw error;
    }
  }

  // Teste Database Connection
  const testDb = new PrismaClient({
    datasources: {
      db: {
        url: 'file:./test.db'
      }
    }
  });

  try {
    await testDb.$connect();
    console.log('✅ Test database connection successful');
    await testDb.$disconnect();
  } catch (error) {
    console.error('❌ Test database connection failed:', error);
    throw error;
  }
}