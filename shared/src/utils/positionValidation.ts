import { PlayerPosition } from '../types/game';

/**
 * Position Validation Utilities
 * Validates that players are placed in their designated positions
 */

export interface PositionValidationResult {
  isValid: boolean;
  errors: string[];
  invalidPlacements: Array<{
    playerPosition: PlayerPosition;
    formationPosition: PlayerPosition;
    playerName?: string;
    formationIndex: number;
  }>;
}

/**
 * Validates that a player's position matches the formation position
 */
export function validatePlayerPosition(
  playerPosition: PlayerPosition,
  formationPosition: PlayerPosition
): boolean {
  return playerPosition === formationPosition;
}

/**
 * Validates that all players in a team are placed in correct positions
 */
export function validateTeamPositions(
  players: Array<{
    position?: PlayerPosition;
    name?: string;
  }>,
  formationPositions: PlayerPosition[]
): PositionValidationResult {
  const errors: string[] = [];
  const invalidPlacements: Array<{
    playerPosition: PlayerPosition;
    formationPosition: PlayerPosition;
    playerName?: string;
    formationIndex: number;
  }> = [];

  // Filter and validate players with defined positions
  const playersWithPositions = players
    .map((player, index) => ({ ...player, index }))
    .filter((player): player is { position: PlayerPosition; name?: string; index: number } => 
      !!player.position
    );

  // Validate each player position
  for (const playerData of playersWithPositions) {
    const { position: playerPosition, name, index } = playerData;
    const formationPosition = formationPositions[index];
    
    if (!formationPosition) continue; // Skip if formation position doesn't exist
    
    if (!validatePlayerPosition(playerPosition, formationPosition)) {
      const playerName = name || `Player ${index + 1}`;
      const error = `${playerName} (${playerPosition}) cannot be placed in ${formationPosition} position`;
      
      errors.push(error);
      invalidPlacements.push({
        playerPosition,
        formationPosition,
        playerName: name,
        formationIndex: index
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    invalidPlacements
  };
}

/**
 * Checks if a specific player can be placed at a specific formation position
 */
export function canPlayerBePlacedAtPosition(
  playerPosition: PlayerPosition,
  formationPosition: PlayerPosition
): boolean {
  return validatePlayerPosition(playerPosition, formationPosition);
}

/**
 * Gets all valid formation positions for a player
 */
export function getValidPositionsForPlayer(
  playerPosition?: PlayerPosition,
  formationPositions?: PlayerPosition[]
): number[] {
  if (!playerPosition || !formationPositions) return [];
  
  const validIndices: number[] = [];
  
  for (let i = 0; i < formationPositions.length; i++) {
    const formationPosition = formationPositions[i];
    if (formationPosition && validatePlayerPosition(playerPosition, formationPosition)) {
      validIndices.push(i);
    }
  }
  
  return validIndices;
}

/**
 * Position compatibility constants for future enhancement
 * Currently implements strict position matching only
 */
export const POSITION_COMPATIBILITY: Record<PlayerPosition, PlayerPosition[]> = {
  // Strict matching - each position can only play in its exact position
  'GK': ['GK'],
  'CB': ['CB'],
  'LB': ['LB'],
  'RB': ['RB'],
  'CDM': ['CDM'],
  'CM': ['CM'],
  'CAM': ['CAM'],
  'LM': ['LM'],
  'RM': ['RM'],
  'LW': ['LW'],
  'RW': ['RW'],
  'ST': ['ST'],
  'CF': ['CF'],
  'LF': ['LF'],
  'RF': ['RF']
};

/**
 * Enhanced position validation with compatibility rules
 * Currently uses strict matching, but can be extended for flexible positioning
 */
export function validatePlayerPositionWithCompatibility(
  playerPosition?: PlayerPosition,
  formationPosition?: PlayerPosition
): boolean {
  if (!playerPosition || !formationPosition) return false;
  const compatiblePositions = POSITION_COMPATIBILITY[playerPosition] || [];
  return compatiblePositions.includes(formationPosition);
}