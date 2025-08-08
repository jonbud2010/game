import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Load test environment
config({ path: '.env.test' });

export class TestDatabase {
  private prisma: PrismaClient;
  private testDbPath: string;
  private isInitialized: boolean = false;

  constructor(testName?: string) {
    // Create unique database for each test file/instance to avoid locks
    const uniqueId = testName || crypto.randomBytes(8).toString('hex');
    const timestamp = Date.now();
    this.testDbPath = path.join(process.cwd(), `test-${uniqueId}-${timestamp}.db`);
    
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: `file:${this.testDbPath}`
        }
      },
      // Reduce connection timeouts for faster tests
      __internal: {
        engine: {
          requestTimeout: 5000,
        },
      },
    });
  }

  public getPrisma(): PrismaClient {
    return this.prisma;
  }

  /**
   * Initialize test database with migrations
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return; // Already initialized
    }

    try {
      // Remove existing test database
      if (fs.existsSync(this.testDbPath)) {
        fs.unlinkSync(this.testDbPath);
      }

      // Remove journal file if it exists
      const journalPath = `${this.testDbPath}-journal`;
      if (fs.existsSync(journalPath)) {
        fs.unlinkSync(journalPath);
      }

      // Generate Prisma client (only once globally)
      try {
        execSync('yarn prisma generate', { stdio: 'pipe', timeout: 30000 });
      } catch (error) {
        // Ignore if already generated
        console.warn('Prisma generate warning (likely already generated):', error.message);
      }

      // Push schema to database (better for testing than migrations)
      execSync('yarn prisma db push --force-reset --skip-generate', { 
        stdio: 'pipe',
        timeout: 15000,
        env: { ...process.env, DATABASE_URL: `file:${this.testDbPath}` }
      });

      this.isInitialized = true;
      console.log(`Test database initialized: ${path.basename(this.testDbPath)}`);
    } catch (error) {
      console.error('Failed to initialize test database:', error);
      throw error;
    }
  }

  /**
   * Clean all data from the database but keep schema
   */
  public async clean(): Promise<void> {
    try {
      // Delete in correct order to respect foreign key constraints
      await this.prisma.userPlayer.deleteMany();
      await this.prisma.packPlayer.deleteMany();
      await this.prisma.teamPlayer.deleteMany();
      await this.prisma.match.deleteMany();
      await this.prisma.leagueTable.deleteMany();
      await this.prisma.team.deleteMany();
      await this.prisma.lobbyMember.deleteMany();
      await this.prisma.lobby.deleteMany();
      await this.prisma.pack.deleteMany();
      await this.prisma.player.deleteMany();
      await this.prisma.formation.deleteMany();
      await this.prisma.user.deleteMany();
    } catch (error) {
      console.error('Failed to clean test database:', error);
      throw error;
    }
  }

  /**
   * Reset database by cleaning and reseeding with minimal data
   */
  public async reset(): Promise<void> {
    await this.clean();
    await this.seed();
  }

  /**
   * Seed database with basic test data
   */
  public async seed(): Promise<void> {
    try {
      // Create test formations
      await this.prisma.formation.createMany({
        data: [
          {
            name: '4-3-3',
            imageUrl: 'https://example.com/433.png',
            positions: JSON.stringify([
              'GK', 'CB', 'CB', 'LB', 'RB',  // Defense (5)
              'CM', 'CM', 'CAM',              // Midfield (3)
              'LW', 'RW', 'ST'               // Attack (3)
            ])
          },
          {
            name: '4-4-2',
            imageUrl: 'https://example.com/442.png',
            positions: JSON.stringify([
              'GK', 'CB', 'CB', 'LB', 'RB',  // Defense (5)
              'LM', 'CM', 'CM', 'RM',        // Midfield (4)
              'ST', 'ST'                     // Attack (2)
            ])
          },
          {
            name: '3-5-2',
            imageUrl: 'https://example.com/352.png',
            positions: JSON.stringify([
              'GK', 'CB', 'CB', 'CB',        // Defense (4)
              'LM', 'CDM', 'CM', 'CAM', 'RM', // Midfield (5)
              'ST', 'ST'                     // Attack (2)
            ])
          }
        ]
      });

      console.log('Test database seeded successfully');
    } catch (error) {
      console.error('Failed to seed test database:', error);
      throw error;
    }
  }

  /**
   * Close database connection and cleanup test files
   */
  public async disconnect(): Promise<void> {
    try {
      await this.prisma.$disconnect();
    } catch (error) {
      console.warn('Error disconnecting Prisma:', error);
    }
    
    // Clean up test database file
    try {
      // Wait a bit to ensure connection is fully closed
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (fs.existsSync(this.testDbPath)) {
        fs.unlinkSync(this.testDbPath);
      }
      // Also clean up journal and WAL files if they exist
      const journalPath = `${this.testDbPath}-journal`;
      const walPath = `${this.testDbPath}-wal`;
      const shmPath = `${this.testDbPath}-shm`;
      
      [journalPath, walPath, shmPath].forEach(filePath => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    } catch (error) {
      console.warn('Failed to cleanup test database files:', error);
    }
  }

  /**
   * Execute within a transaction that will be rolled back
   */
  public async withTransaction<T>(
    callback: (prisma: PrismaClient) => Promise<T>
  ): Promise<T> {
    return await this.prisma.$transaction(async (tx) => {
      const result = await callback(tx as PrismaClient);
      // Transaction will be rolled back after this block
      throw new Error('Transaction rollback'); // This forces rollback
    }).catch((error) => {
      if (error.message === 'Transaction rollback') {
        // This is expected - we use this to rollback the transaction
        return undefined as T;
      }
      throw error;
    });
  }

  /**
   * Start a manual transaction for tests
   */
  public async startTransaction(): Promise<PrismaClient> {
    // Note: Manual transaction management for tests
    // Each test should clean up after itself
    return this.prisma;
  }
}

// Helper functions for creating isolated test databases
export const createTestDatabase = (testName?: string): TestDatabase => {
  return new TestDatabase(testName);
};

export const setupTestDatabase = async (testName?: string): Promise<{ db: TestDatabase; prisma: PrismaClient }> => {
  const db = createTestDatabase(testName);
  await db.initialize();
  return { db, prisma: db.getPrisma() };
};

// Legacy singleton for existing tests (will be phased out)
export const testDb = createTestDatabase('legacy');