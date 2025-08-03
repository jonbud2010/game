import { PrismaClient } from '@prisma/client';
import { DUMMY_PLAYER_SETTINGS, PLAYER_POSITIONS_ENUM, isDummyPlayer } from '@football-tcg/shared';

const prisma = new PrismaClient();

/**
 * Get dummy player IDs for the default 4-3-3 formation
 * Returns dummy players in the correct order for team positions
 */
export function getDefaultDummyPlayers(): string[] {
  // Default 4-3-3 formation order: GK, LB, CB, CB, RB, CDM, CM, CAM, LW, ST, RW
  const formationPositions = ['GK', 'LB', 'CB', 'CB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'ST', 'RW'];
  
  return formationPositions.map(position => `dummy-${position.toLowerCase()}`);
}

/**
 * Get all dummy player records from database
 */
export async function getAllDummyPlayers() {
  return await prisma.player.findMany({
    where: {
      theme: DUMMY_PLAYER_SETTINGS.THEME
    },
    orderBy: {
      position: 'asc'
    }
  });
}

/**
 * Get dummy player by position
 */
export async function getDummyPlayerByPosition(position: string) {
  return await prisma.player.findUnique({
    where: {
      id: `dummy-${position.toLowerCase()}`
    }
  });
}

/**
 * Create team players with dummy players for a given formation
 */
export function createDummyTeamPlayers(teamId: string, formationPositions: string[]): Array<{
  teamId: string;
  playerId: string;
  position: number;
  points: number;
  color: string;
}> {
  return formationPositions.map((position, index) => ({
    teamId,
    playerId: `dummy-${position.toLowerCase()}`,
    position: index,
    points: DUMMY_PLAYER_SETTINGS.POINTS,
    color: DUMMY_PLAYER_SETTINGS.COLOR
  }));
}