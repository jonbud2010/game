import { DUMMY_PLAYER_SETTINGS } from '../constants/game.js';

/**
 * Check if a player is a dummy player
 */
export function isDummyPlayer(playerId: string): boolean {
  return playerId.startsWith('dummy-');
}

/**
 * Generate dummy player ID for a position
 */
export function getDummyPlayerId(position: string): string {
  return `dummy-${position.toLowerCase()}`;
}

/**
 * Check if a player ID represents a dummy player by theme
 */
export function isDummyPlayerByTheme(theme: string): boolean {
  return theme === DUMMY_PLAYER_SETTINGS.THEME;
}

/**
 * Filter out dummy players from a list of player IDs
 */
export function filterOutDummyPlayers(playerIds: string[]): string[] {
  return playerIds.filter(id => !isDummyPlayer(id));
}

/**
 * Get position from dummy player ID
 */
export function getPositionFromDummyId(dummyPlayerId: string): string | null {
  if (!isDummyPlayer(dummyPlayerId)) {
    return null;
  }
  
  return dummyPlayerId.replace('dummy-', '').toUpperCase();
}