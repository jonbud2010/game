import { Player as PrismaPlayer } from '@prisma/client';
import { Player, PlayerColor, PlayerPosition } from '@football-tcg/shared';

/**
 * Maps a Prisma Player to the shared Player type
 * Handles enum conversions for color and position
 */
export function mapPrismaPlayerToSharedPlayer(prismaPlayer: PrismaPlayer): Player {
  return {
    id: prismaPlayer.id,
    name: prismaPlayer.name,
    imageUrl: prismaPlayer.imageUrl,
    points: prismaPlayer.points,
    position: prismaPlayer.position as PlayerPosition,
    color: prismaPlayer.color as PlayerColor,
    marketPrice: prismaPlayer.marketPrice,
    theme: prismaPlayer.theme as any, // Theme enum mapping
    percentage: prismaPlayer.percentage
  };
}

/**
 * Maps an array of Prisma Players to shared Player types
 */
export function mapPrismaPlayersToSharedPlayers(prismaPlayers: PrismaPlayer[]): Player[] {
  return prismaPlayers.map(mapPrismaPlayerToSharedPlayer);
}

/**
 * Maps Prisma team with players to TeamWithPlayers format
 */
export function mapPrismaTeamToTeamWithPlayers(team: any): any {
  return {
    id: team.id,
    name: team.name,
    userId: team.userId,
    formationId: team.formationId,
    players: team.teamPlayers.map((tp: any) => mapPrismaPlayerToSharedPlayer(tp.player)),
    totalPoints: 0,
    chemistryPoints: 0
  };
}