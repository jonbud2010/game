import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Load test environment
config({ path: '.env.test' });

export class TestDatabase {
  private static instance: TestDatabase;
  private prisma: PrismaClient;
  private testDbPath: string;

  private constructor() {
    this.testDbPath = path.join(process.cwd(), 'test.db');
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: `file:${this.testDbPath}`
        }
      }
    });
  }

  public static getInstance(): TestDatabase {
    if (!TestDatabase.instance) {
      TestDatabase.instance = new TestDatabase();
    }
    return TestDatabase.instance;
  }

  public getPrisma(): PrismaClient {
    return this.prisma;
  }

  /**
   * Initialize test database with migrations
   */
  public async initialize(): Promise<void> {
    try {
      // Remove existing test database
      if (fs.existsSync(this.testDbPath)) {
        fs.unlinkSync(this.testDbPath);
      }

      // Generate Prisma client
      execSync('npx prisma generate', { stdio: 'pipe' });

      // Run migrations
      execSync('npx prisma migrate deploy', { 
        stdio: 'pipe',
        env: { ...process.env, DATABASE_URL: `file:${this.testDbPath}` }
      });

      console.log('Test database initialized successfully');
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
      await this.prisma.league.deleteMany();
      await this.prisma.team.deleteMany();
      await this.prisma.lobbyMembership.deleteMany();
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
            positions: [
              'GK', 'CB', 'CB', 'LB', 'RB',  // Defense (5)
              'CM', 'CM', 'CAM',              // Midfield (3)
              'LW', 'RW', 'ST'               // Attack (3)
            ]
          },
          {
            name: '4-4-2',
            positions: [
              'GK', 'CB', 'CB', 'LB', 'RB',  // Defense (5)
              'LM', 'CM', 'CM', 'RM',        // Midfield (4)
              'ST', 'ST'                     // Attack (2)
            ]
          },
          {
            name: '3-5-2',
            positions: [
              'GK', 'CB', 'CB', 'CB',        // Defense (4)
              'LM', 'CDM', 'CM', 'CAM', 'RM', // Midfield (5)
              'ST', 'ST'                     // Attack (2)
            ]
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
   * Close database connection
   */
  public async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }

  /**
   * Execute within a transaction that will be rolled back
   */
  public async withTransaction<T>(
    callback: (prisma: PrismaClient) => Promise<T>
  ): Promise<T> {
    return await this.prisma.$transaction(async (tx) => {
      const result = await callback(tx);
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

// Export singleton instance
export const testDb = TestDatabase.getInstance();

// Helper function for tests
export const setupTestDatabase = async (): Promise<PrismaClient> => {
  await testDb.initialize();
  return testDb.getPrisma();
};

export const cleanTestDatabase = async (): Promise<void> => {
  await testDb.clean();
};

export const resetTestDatabase = async (): Promise<void> => {
  await testDb.reset();
};