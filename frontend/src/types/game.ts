// Re-export types from shared package
export * from '@football-tcg/shared';

// Router and Navigation Types
export type AppRoute = 
  | '/'
  | '/login'
  | '/register'
  | '/lobby'
  | '/collection'
  | '/packs'
  | '/profile'
  | '/team-builder'
  | '/match'
  | '/league';

// Authentication Types
export interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  coins: number;
  role: 'PLAYER' | 'ADMIN';
}

// App State Types
export interface AppState {
  auth: AuthState;
  currentLobby: string | null;
  theme: 'light' | 'dark';
}

// Legacy compatibility - will be removed
export interface LocalGameState {
  player: Player | null;
  isGameActive: boolean;
  currentScreen: 'menu' | 'game' | 'settings' | 'gameOver';
}

export interface Player {
  id: string;
  name: string;
  score: number;
  level: number;
}