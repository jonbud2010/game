import type { PlayerColor, PlayerPosition } from '../types/game.js';

// Position definitions are now handled by frontend i18n system
// This constant is kept for reference only and should not be used for display
export const PLAYER_POSITIONS_ENUM: PlayerPosition[] = [
  'GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 
  'LM', 'RM', 'LW', 'RW', 'ST', 'CF', 'LF', 'RF'
];

export const PLAYER_COLORS: Record<PlayerColor, string> = {
  RED: '#DC2626',
  BLUE: '#1E40AF',
  GREEN: '#16A34A',
  YELLOW: '#FACC15',
  PURPLE: '#7C3AED',
  ORANGE: '#EA580C',
  PINK: '#EC4899',
  CYAN: '#06B6D4'
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
  MATCHES_PER_MATCHDAY: 2
} as const;

export const DUMMY_PLAYER_SETTINGS = {
  THEME: 'FOOTBALL' as const,
  POINTS: 50,
  MARKET_PRICE: 0,
  PERCENTAGE: 0,
  COLOR: 'CYAN' as PlayerColor,
  IMAGE_URL: '/images/players/dummy.png'
} as const;

export const PLAYER_THEMES = [
  'TEN_D',
  'EIGHT_E', 
  'ROWING',
  'HP',
  'FOOTBALL',
  'MARVEL'
] as const;

export const THEME_REWARD_SETTINGS = {
  EXECUTION_TIME: '20:00', // 8 PM Berlin time
  EXECUTION_DAY: 0, // Sunday (0 = Sunday, 1 = Monday, etc.)
  REWARDS: {
    1: 100, // 1st place
    2: 50,  // 2nd place
    3: 30,  // 3rd place
    4: 0    // 4th place
  },
  MAX_WEEKLY_EARNINGS: 600 // 6 themes * 100 coins
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