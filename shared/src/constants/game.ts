import type { PlayerColor, PlayerPosition } from '../types/game.js';

// Position definitions are now handled by frontend i18n system
// This constant is kept for reference only and should not be used for display
export const PLAYER_POSITIONS_ENUM: PlayerPosition[] = [
  'GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 
  'LM', 'RM', 'LW', 'RW', 'ST', 'CF', 'LF', 'RF'
];

export const PLAYER_COLORS: Record<PlayerColor, string> = {
  DARK_GREEN: '#166534',
  LIGHT_GREEN: '#16A34A',
  DARK_BLUE: '#1E40AF',
  LIGHT_BLUE: '#3B82F6',
  RED: '#DC2626',
  YELLOW: '#FACC15',
  PURPLE: '#7C3AED',
  ORANGE: '#EA580C'
};

export const CHEMISTRY_POINTS = {
  2: 4,
  3: 9,
  4: 16,
  5: 25,
  6: 36,
  7: 49
} as const;

export const LEAGUE_POINTS = {
  WIN: 3,
  DRAW: 1,
  LOSS: 0
} as const;

export const LEAGUE_REWARDS = {
  1: 250,
  2: 200,
  3: 150,
  4: 100
} as const;

export const MATCH_SETTINGS = {
  BASE_CHANCE_PERCENTAGE: 1,
  MODIFIER_ABOVE_AVERAGE: 0.05,
  MODIFIER_BELOW_AVERAGE: 0.01,
  TOTAL_CHANCES_PER_TEAM: 100,
  EXACT_CHEMISTRY_COLORS: 3,
  MIN_PLAYERS_PER_COLOR: 2,
  PLAYERS_PER_TEAM: 11,
  TEAMS_PER_MATCHDAY: 3,
  TOTAL_PLAYERS_PER_MATCHDAY: 33
} as const;

export const LOBBY_SETTINGS = {
  MAX_PLAYERS: 4,
  MATCHES_PER_MATCHDAY: 6
} as const;

export const VALIDATION_RULES = {
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 20
  },
  PASSWORD: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 128
  },
  EMAIL: {
    MAX_LENGTH: 255
  },
  TEAM_NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 30
  },
  LOBBY_NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 50
  },
  PLAYER_NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 50
  },
  FORMATION_NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 30
  },
  PACK_NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 30
  }
} as const;