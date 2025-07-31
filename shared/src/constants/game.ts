import type { PlayerColor, PlayerPosition } from '../types/game.js';

export const PLAYER_POSITIONS: Record<PlayerPosition, string> = {
  GK: 'Torwart',
  CB: 'Innenverteidiger',
  LB: 'Linksverteidiger',
  RB: 'Rechtsverteidiger',
  CDM: 'Defensives Mittelfeld',
  CM: 'Zentrales Mittelfeld',
  CAM: 'Offensives Mittelfeld',
  LM: 'Linkes Mittelfeld',
  RM: 'Rechtes Mittelfeld',
  LW: 'Linker Flügel',
  RW: 'Rechter Flügel',
  ST: 'Stürmer',
  CF: 'Hängende Spitze',
  LF: 'Linker Angreifer',
  RF: 'Rechter Angreifer'
};

export const PLAYER_COLORS: Record<PlayerColor, string> = {
  dunkelgruen: '#166534',
  hellgruen: '#16A34A',
  dunkelblau: '#1E40AF',
  hellblau: '#3B82F6',
  rot: '#DC2626',
  gelb: '#FACC15',
  lila: '#7C3AED',
  orange: '#EA580C'
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