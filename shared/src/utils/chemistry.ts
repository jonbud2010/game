import type { Team, PlayerColor, ChemistryBonus } from '../types/game';
import { CHEMISTRY_POINTS, MATCH_SETTINGS } from '../constants/game';

export function calculateTeamChemistry(team: Team, players: { color: PlayerColor }[]): number {
  const colorCounts = new Map<PlayerColor, number>();
  
  // Count players per color
  for (const player of players) {
    const currentCount = colorCounts.get(player.color) || 0;
    colorCounts.set(player.color, currentCount + 1);
  }
  
  // Validate chemistry rules
  if (colorCounts.size !== MATCH_SETTINGS.EXACT_CHEMISTRY_COLORS) {
    throw new Error(`Team must have exactly ${MATCH_SETTINGS.EXACT_CHEMISTRY_COLORS} different colors`);
  }
  
  for (const [color, count] of colorCounts) {
    if (count < MATCH_SETTINGS.MIN_PLAYERS_PER_COLOR) {
      throw new Error(`Color ${color} must have at least ${MATCH_SETTINGS.MIN_PLAYERS_PER_COLOR} players`);
    }
  }
  
  // Calculate chemistry points
  let totalChemistry = 0;
  for (const [, count] of colorCounts) {
    if (count >= 2 && count <= 7) {
      totalChemistry += CHEMISTRY_POINTS[count as keyof typeof CHEMISTRY_POINTS];
    }
  }
  
  return totalChemistry;
}

export function getChemistryBreakdown(players: { color: PlayerColor }[]): ChemistryBonus[] {
  const colorCounts = new Map<PlayerColor, number>();
  
  for (const player of players) {
    const currentCount = colorCounts.get(player.color) || 0;
    colorCounts.set(player.color, currentCount + 1);
  }
  
  const breakdown: ChemistryBonus[] = [];
  for (const [color, count] of colorCounts) {
    if (count >= 2 && count <= 7) {
      breakdown.push({
        color,
        playerCount: count,
        bonus: CHEMISTRY_POINTS[count as keyof typeof CHEMISTRY_POINTS]
      });
    }
  }
  
  return breakdown.sort((a, b) => b.bonus - a.bonus);
}

export function validateTeamChemistry(players: { color: PlayerColor }[]): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const colorCounts = new Map<PlayerColor, number>();
  
  for (const player of players) {
    const currentCount = colorCounts.get(player.color) || 0;
    colorCounts.set(player.color, currentCount + 1);
  }
  
  if (colorCounts.size !== MATCH_SETTINGS.EXACT_CHEMISTRY_COLORS) {
    errors.push(`Team must have exactly ${MATCH_SETTINGS.EXACT_CHEMISTRY_COLORS} different colors`);
  }
  
  for (const [color, count] of colorCounts) {
    if (count < MATCH_SETTINGS.MIN_PLAYERS_PER_COLOR) {
      errors.push(`Color ${color} must have at least ${MATCH_SETTINGS.MIN_PLAYERS_PER_COLOR} players`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}