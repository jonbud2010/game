import { PrismaClient } from '@prisma/client';
import { isDummyPlayer } from '@football-tcg/shared';

const prisma = new PrismaClient();

export interface PlayerUsageCheck {
  playerId: string;
  isUsed: boolean;
  usedInTeamId?: string;
  usedInTeamName?: string;
}

/**
 * Check if players are already used in other teams for the same matchday
 * Returns array with usage information for each player
 */
export async function checkPlayerUsageInMatchday(
  userId: string,
  lobbyId: string,
  matchDay: number,
  playerIds: string[],
  excludeTeamId?: string
): Promise<PlayerUsageCheck[]> {
  // Filter out dummy players as they can be used multiple times
  const realPlayerIds = playerIds.filter(id => id && !isDummyPlayer(id));
  
  if (realPlayerIds.length === 0) {
    return playerIds.map(id => ({ playerId: id, isUsed: false }));
  }

  // Find all teams for this user, lobby, and matchday
  const userTeamsInMatchday = await prisma.team.findMany({
    where: {
      userId,
      lobbyId,
      matchDay,
      ...(excludeTeamId && { id: { not: excludeTeamId } })
    },
    include: {
      teamPlayers: {
        where: {
          playerId: { in: realPlayerIds }
        },
        include: {
          player: true
        }
      }
    }
  });

  // Create usage map
  const usageMap = new Map<string, { teamId: string; teamName: string }>();
  
  userTeamsInMatchday.forEach(team => {
    team.teamPlayers.forEach(tp => {
      if (realPlayerIds.includes(tp.playerId)) {
        usageMap.set(tp.playerId, {
          teamId: team.id,
          teamName: team.name
        });
      }
    });
  });

  // Return usage information for all requested players
  return playerIds.map(playerId => {
    if (!playerId || isDummyPlayer(playerId)) {
      return { playerId, isUsed: false };
    }
    
    const usage = usageMap.get(playerId);
    return {
      playerId,
      isUsed: !!usage,
      usedInTeamId: usage?.teamId,
      usedInTeamName: usage?.teamName
    };
  });
}

/**
 * Validate that no real players are duplicated across teams for the same matchday
 * Returns validation result with detailed errors
 */
export async function validateUniquePlayersInMatchday(
  userId: string,
  lobbyId: string,
  matchDay: number,
  playerIds: string[],
  excludeTeamId?: string
): Promise<{
  isValid: boolean;
  errors: string[];
  conflictingPlayers: PlayerUsageCheck[];
}> {
  const usageChecks = await checkPlayerUsageInMatchday(
    userId,
    lobbyId,
    matchDay,
    playerIds,
    excludeTeamId
  );

  const conflictingPlayers = usageChecks.filter(check => check.isUsed);
  const errors: string[] = [];

  conflictingPlayers.forEach(conflict => {
    errors.push(
      `Player is already used in team "${conflict.usedInTeamName}" for matchday ${matchDay}`
    );
  });

  return {
    isValid: conflictingPlayers.length === 0,
    errors,
    conflictingPlayers
  };
}

/**
 * Get all player IDs used by a user in a specific matchday (excluding dummy players)
 */
export async function getUsedPlayersInMatchday(
  userId: string,
  lobbyId: string,
  matchDay: number,
  excludeTeamId?: string
): Promise<string[]> {
  const teams = await prisma.team.findMany({
    where: {
      userId,
      lobbyId,
      matchDay,
      ...(excludeTeamId && { id: { not: excludeTeamId } })
    },
    include: {
      teamPlayers: {
        select: {
          playerId: true
        }
      }
    }
  });

  const usedPlayerIds = new Set<string>();
  
  teams.forEach(team => {
    team.teamPlayers.forEach(tp => {
      if (tp.playerId && !isDummyPlayer(tp.playerId)) {
        usedPlayerIds.add(tp.playerId);
      }
    });
  });

  return Array.from(usedPlayerIds);
}