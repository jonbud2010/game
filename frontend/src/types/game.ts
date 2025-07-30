// Re-export types from shared package
export * from '@football-tcg/shared';

// Frontend-specific types
export interface LocalGameState {
  player: Player | null;
  isGameActive: boolean;
  currentScreen: 'menu' | 'game' | 'settings' | 'gameOver';
}

// Legacy compatibility - will be removed
export interface Player {
  id: string;
  name: string;
  score: number;
  level: number;
}