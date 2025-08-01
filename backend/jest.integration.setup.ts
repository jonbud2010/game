/**
 * Jest Integration Test Setup
 * Konfiguration für Integration Tests mit echter SQLite Database
 */

import { PrismaClient } from '@prisma/client';

// Test Database Client
export const testDb = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./test.db'
    }
  }
});

// Setup vor jedem Test
beforeEach(async () => {
  // Clean database vor jedem Test
  await cleanDatabase();
});

// Cleanup nach allen Tests
afterAll(async () => {
  await testDb.$disconnect();
});

/**
 * Löscht alle Daten aus der Test-Database
 * Respektiert Foreign Key Constraints durch korrekte Reihenfolge
 */
async function cleanDatabase() {
  const tablenames = await testDb.$queryRaw<
    Array<{ name: string }>
  >`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_migrations';`;

  const tables = tablenames
    .map(({ name }) => name)
    .filter(name => name !== '_prisma_migrations');

  try {
    // Disable foreign key constraints temporarily
    await testDb.$executeRawUnsafe(`PRAGMA foreign_keys = OFF`);
    
    // Delete in reverse order to respect dependencies
    const deleteOrder = [
      'team_players',
      'teams', 
      'user_players',
      'pack_players',
      'matches',
      'league_table',
      'lobby_members',
      'lobbies',
      'packs',
      'players',
      'formations',
      'users'
    ];

    for (const table of deleteOrder) {
      if (tables.includes(table)) {
        await testDb.$executeRawUnsafe(`DELETE FROM "${table}"`);
      }
    }
    
    // Re-enable foreign key constraints
    await testDb.$executeRawUnsafe(`PRAGMA foreign_keys = ON`);
  } catch (error) {
    console.error('Database cleanup failed:', error);
    throw error;
  }
}

/**
 * Erstellt Test-User mit verschiedenen Rollen
 */
export async function createTestUsers() {
  const adminUser = await testDb.user.create({
    data: {
      username: 'testadmin',
      email: 'admin@test.com', 
      passwordHash: '$2a$10$test.hash.for.integration.tests',
      role: 'ADMIN',
      coins: 1000
    }
  });

  const playerUser = await testDb.user.create({
    data: {
      username: 'testplayer',
      email: 'player@test.com',
      passwordHash: '$2a$10$test.hash.for.integration.tests', 
      role: 'PLAYER',
      coins: 500
    }
  });

  return { adminUser, playerUser };
}

/**
 * Erstellt Test-Spieler mit verschiedenen Attributen
 */
export async function createTestPlayers() {
  const players = [];
  
  // Goalkeeper
  const gk = await testDb.player.create({
    data: {
      name: 'Test Goalkeeper',
      imageUrl: '/test/gk.jpg',
      points: 85,
      position: 'GK',
      color: 'DUNKELGRÜN',
      marketPrice: 100,
      theme: 'Test Theme',
      percentage: 0.05
    }
  });
  players.push(gk);

  // Defender  
  const def = await testDb.player.create({
    data: {
      name: 'Test Defender',
      imageUrl: '/test/def.jpg', 
      points: 80,
      position: 'CB',
      color: 'HELLBLAU',
      marketPrice: 80,
      theme: 'Test Theme',
      percentage: 0.1
    }
  });
  players.push(def);

  // Midfielder
  const mid = await testDb.player.create({
    data: {
      name: 'Test Midfielder',
      imageUrl: '/test/mid.jpg',
      points: 90,
      position: 'CM', 
      color: 'ROT',
      marketPrice: 150,
      theme: 'Test Theme',
      percentage: 0.03
    }
  });
  players.push(mid);

  return players;
}

/**
 * Erstellt Test-Formation
 */
export async function createTestFormation() {
  return await testDb.formation.create({
    data: {
      name: 'Test 4-4-2',
      imageUrl: '/test/formation.jpg',
      positions: JSON.stringify([
        { id: 0, x: 50, y: 10, position: 'GK' },
        { id: 1, x: 20, y: 25, position: 'LB' },
        { id: 2, x: 35, y: 25, position: 'CB' }, 
        { id: 3, x: 65, y: 25, position: 'CB' },
        { id: 4, x: 80, y: 25, position: 'RB' },
        { id: 5, x: 20, y: 50, position: 'LM' },
        { id: 6, x: 40, y: 50, position: 'CM' },
        { id: 7, x: 60, y: 50, position: 'CM' },
        { id: 8, x: 80, y: 50, position: 'RM' },
        { id: 9, x: 35, y: 75, position: 'ST' },
        { id: 10, x: 65, y: 75, position: 'ST' }
      ])
    }
  });
}

/**
 * Erstellt Test-Lobby mit Mitgliedern
 */
export async function createTestLobby(users: any[]) {
  const lobby = await testDb.lobby.create({
    data: {
      name: 'Test Lobby',
      maxPlayers: 4,
      status: 'WAITING'
    }
  });

  // Füge Users zur Lobby hinzu
  for (const user of users) {
    await testDb.lobbyMember.create({
      data: {
        lobbyId: lobby.id,
        userId: user.id
      }
    });
  }

  return lobby;
}

/**
 * Erstellt Test-Pack mit Spielern
 */
export async function createTestPack(players: any[]) {
  const pack = await testDb.pack.create({
    data: {
      name: 'Test Pack',
      imageUrl: '/test/pack.jpg',
      price: 100,
      status: 'ACTIVE'
    }
  });

  // Füge Spieler zum Pack hinzu
  for (const player of players) {
    await testDb.packPlayer.create({
      data: {
        packId: pack.id,
        playerId: player.id
      }
    });
  }

  return pack;
}