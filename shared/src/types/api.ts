export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    username: string;
    email: string;
    coins: number;
    role: 'user' | 'admin';
  };
  token: string;
}

export interface CreatePlayerRequest {
  name: string;
  points: number;
  position: string;
  color: string;
  marketPrice: number;
  theme: string;
  percentage: number;
}

export interface CreateFormationRequest {
  name: string;
  positions: {
    x: number;
    y: number;
    position: string;
  }[];
}

export interface CreatePackRequest {
  name: string;
  price: number;
  playerPool: {
    playerId: string;
    percentage: number;
  }[];
}

export interface CreateTeamRequest {
  name: string;
  formationId: string;
  players: {
    positionId: string;
    playerId: string | null;
  }[];
}

export interface OpenPackRequest {
  packId: string;
}

export interface OpenPackResponse {
  player: {
    id: string;
    name: string;
    imageUrl: string;
    points: number;
    position: string;
    color: string;
    theme: string;
  };
  newCoins: number;
}

export interface JoinLobbyRequest {
  lobbyId: string;
}

export interface CreateLobbyRequest {
  name: string;
}

export interface MatchSimulationResponse {
  match: {
    id: string;
    team1: {
      name: string;
      totalPoints: number;
    };
    team2: {
      name: string;
      totalPoints: number;
    };
    score1: number;
    score2: number;
    events: {
      minute: number;
      type: 'goal' | 'chance';
      team: 1 | 2;
      playerId?: string;
    }[];
  };
  updatedStandings: {
    userId: string;
    points: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDifference: number;
    position: number;
  }[];
}

// Admin API Types
export interface CreateLobbyPlayerRequest {
  name: string;
  imageUrl?: string;
  points?: number;
  position: string;
  color: string;
  marketPrice?: number;
  theme?: string;
  percentage?: number;
}

export interface CreateLobbyPackRequest {
  name: string;
  imageUrl?: string;
  price: number;
  playerIds?: string[];
}

export interface CreateLobbyFormationRequest {
  name: string;
  imageUrl?: string;
  positions: {
    x: number;
    y: number;
    position: string;
  }[];
}

export interface ScheduleMatchDayRequest {
  scheduledAt: string; // ISO date string
}

export interface ScheduleMatchDayResponse {
  matchDay: number;
  scheduledAt: Date;
  scheduledMatchDayId: string;
}

export interface LobbyAdminResponse {
  isAdmin: boolean;
  permissions: {
    canCreatePlayers: boolean;
    canCreatePacks: boolean;
    canCreateFormations: boolean;
    canScheduleMatchDays: boolean;
    canManageMembers: boolean;
  };
}