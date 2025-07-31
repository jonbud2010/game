import { PrismaClient, Role, LobbyStatus, MatchStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

/**
 * Test data factories for creating consistent test data
 */
export class TestFactories {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a test user
   */
  async createUser(overrides: Partial<{
    username: string;
    email: string;
    password: string;
    role: Role;
    coins: number;
  }> = {}) {
    const defaultData = {
      username: `testuser_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@example.com`,
      password: 'TestPassword123!',
      role: Role.USER,
      coins: 1000
    };

    const data = { ...defaultData, ...overrides };
    const hashedPassword = await bcrypt.hash(data.password, 10);

    return await this.prisma.user.create({
      data: {
        username: data.username,
        email: data.email,
        password: hashedPassword,
        role: data.role,
        coins: data.coins
      }
    });
  }

  /**
   * Create a test admin user
   */
  async createAdmin(overrides: Partial<{
    username: string;
    email: string;
    password: string;
    coins: number;
  }> = {}) {
    return await this.createUser({
      ...overrides,
      role: Role.ADMIN
    });
  }

  /**
   * Create multiple test users
   */
  async createUsers(count: number, overrides: Partial<{
    role: Role;
    coins: number;
  }> = {}) {
    const users = [];
    for (let i = 0; i < count; i++) {
      users.push(await this.createUser(overrides));
    }
    return users;
  }

  /**
   * Create a test player
   */
  async createPlayer(overrides: Partial<{
    name: string;
    points: number;
    position: string;
    color: string;
    marketPrice: number;
    theme: string;
    percentage: number;
    imageUrl?: string;
  }> = {}) {
    const defaultData = {
      name: `Player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      points: Math.floor(Math.random() * 40) + 60, // 60-99
      position: ['GK', 'CB', 'LB', 'RB', 'CM', 'CAM', 'LW', 'RW', 'ST'][Math.floor(Math.random() * 9)],
      color: ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan'][Math.floor(Math.random() * 8)],
      marketPrice: Math.floor(Math.random() * 400) + 100, // 100-499
      theme: 'Standard',
      percentage: Math.random() * 0.1 + 0.01 // 0.01-0.11
    };

    const data = { ...defaultData, ...overrides };

    return await this.prisma.player.create({
      data: {
        name: data.name,
        points: data.points,
        position: data.position,
        color: data.color,
        marketPrice: data.marketPrice,
        theme: data.theme,
        percentage: data.percentage,
        imageUrl: data.imageUrl || null
      }
    });
  }

  /**
   * Create multiple players with specific colors for chemistry testing
   */
  async createPlayersWithColors(colors: { color: string; count: number }[]) {
    const players = [];
    for (const { color, count } of colors) {
      for (let i = 0; i < count; i++) {
        players.push(await this.createPlayer({ color }));
      }
    }
    return players;
  }

  /**
   * Create a test lobby
   */
  async createLobby(overrides: Partial<{
    name: string;
    maxPlayers: number;
    status: LobbyStatus;
    createdById: string;
  }> = {}) {
    const defaultData = {
      name: `Test Lobby ${Date.now()}`,
      maxPlayers: 4,
      status: LobbyStatus.WAITING
    };

    const data = { ...defaultData, ...overrides };

    // Create a user if createdById not provided
    let createdById = data.createdById;
    if (!createdById) {
      const creator = await this.createUser();
      createdById = creator.id;
    }

    return await this.prisma.lobby.create({
      data: {
        name: data.name,
        maxPlayers: data.maxPlayers,
        status: data.status,
        createdById: createdById
      }
    });
  }

  /**
   * Create a lobby with members
   */
  async createLobbyWithMembers(memberCount: number = 4, overrides: Partial<{
    name: string;
    status: LobbyStatus;
  }> = {}) {
    const lobby = await this.createLobby(overrides);
    const members = [];

    // First member is the creator
    const creator = await this.prisma.user.findUnique({ 
      where: { id: lobby.createdById } 
    });
    if (creator) {
      await this.prisma.lobbyMembership.create({
        data: {
          lobbyId: lobby.id,
          userId: creator.id
        }
      });
      members.push(creator);
    }

    // Add additional members
    for (let i = 1; i < memberCount; i++) {
      const user = await this.createUser();
      await this.prisma.lobbyMembership.create({
        data: {
          lobbyId: lobby.id,
          userId: user.id
        }
      });
      members.push(user);
    }

    return { lobby, members };
  }

  /**
   * Create a test pack
   */
  async createPack(overrides: Partial<{
    name: string;
    price: number;
    status: string;
    imageUrl?: string;
  }> = {}) {
    const defaultData = {
      name: `Test Pack ${Date.now()}`,
      price: Math.floor(Math.random() * 200) + 50, // 50-249
      status: 'ACTIVE'
    };

    const data = { ...defaultData, ...overrides };

    return await this.prisma.pack.create({
      data: {
        name: data.name,
        price: data.price,
        status: data.status,
        imageUrl: data.imageUrl || null
      }
    });
  }

  /**
   * Create a pack with players
   */
  async createPackWithPlayers(playerCount: number = 5, overrides: Partial<{
    name: string;
    price: number;
  }> = {}) {
    const pack = await this.createPack(overrides);
    const players = [];

    for (let i = 0; i < playerCount; i++) {
      const player = await this.createPlayer();
      await this.prisma.packPlayer.create({
        data: {
          packId: pack.id,
          playerId: player.id
        }
      });
      players.push(player);
    }

    return { pack, players };
  }

  /**
   * Create a test team
   */
  async createTeam(overrides: Partial<{
    name: string;
    matchday: number;
    userId: string;
    lobbyId: string;
    formationId: string;
  }> = {}) {
    const defaultData = {
      name: `Test Team ${Date.now()}`,
      matchday: 1
    };

    const data = { ...defaultData, ...overrides };

    // Create required entities if not provided
    let userId = data.userId;
    if (!userId) {
      const user = await this.createUser();
      userId = user.id;
    }

    let lobbyId = data.lobbyId;
    if (!lobbyId) {
      const lobby = await this.createLobby();
      lobbyId = lobby.id;
    }

    let formationId = data.formationId;
    if (!formationId) {
      const formation = await this.prisma.formation.findFirst();
      if (!formation) {
        throw new Error('No formations found. Please run database seeding first.');
      }
      formationId = formation.id;
    }

    return await this.prisma.team.create({
      data: {
        name: data.name,
        matchday: data.matchday,
        userId: userId,
        lobbyId: lobbyId,
        formationId: formationId
      }
    });
  }

  /**
   * Create a team with full player lineup
   */
  async createTeamWithPlayers(colors: { color: string; count: number }[] = [
    { color: 'red', count: 4 },
    { color: 'blue', count: 4 },
    { color: 'green', count: 3 }
  ]) {
    const team = await this.createTeam();
    const formation = await this.prisma.formation.findUnique({
      where: { id: team.formationId }
    });

    if (!formation) {
      throw new Error('Formation not found');
    }

    const players = await this.createPlayersWithColors(colors);
    
    // Assign players to positions
    for (let i = 0; i < Math.min(players.length, formation.positions.length); i++) {
      await this.prisma.teamPlayer.create({
        data: {
          teamId: team.id,
          playerId: players[i].id,
          position: i
        }
      });
    }

    return { team, players, formation };
  }

  /**
   * Generate a JWT token for a user
   */
  generateJwtToken(userId: string, role: Role = Role.USER): string {
    return jwt.sign(
      { userId, role },
      process.env.JWT_SECRET || 'test-jwt-secret',
      { expiresIn: '24h' }
    );
  }

  /**
   * Create authorization header for requests
   */
  createAuthHeader(token: string): { Authorization: string } {
    return { Authorization: `Bearer ${token}` };
  }

  /**
   * Clean up created test data (use with caution)
   */
  async cleanup(): Promise<void> {
    // This will be handled by the test database utilities
    // Individual tests should clean up their own data
  }
}

// Export factory instance creator
export const createTestFactories = (prisma: PrismaClient): TestFactories => {
  return new TestFactories(prisma);
};