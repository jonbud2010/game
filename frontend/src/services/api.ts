const API_BASE_URL = '/api';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  coins: number;
  role: 'PLAYER' | 'ADMIN';
  createdAt: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
}

export interface LobbyMember {
  userId: string;
  username: string;
  joinedAt: string;
}

export interface Lobby {
  id: string;
  name: string;
  maxPlayers: number;
  currentPlayers: number;
  status: 'WAITING' | 'IN_PROGRESS' | 'FINISHED';
  createdAt: string;
  members: LobbyMember[];
}

export interface CreateLobbyRequest {
  name: string;
}

export interface Player {
  id: string;
  name: string;
  imageUrl: string;
  points: number;
  position: string;
  color: string;
  marketPrice: number;
  theme: string;
  percentage: number;
}

export interface UserPlayer {
  id: string;
  playerId: string;
  acquiredAt: string;
  player: Player;
}

export interface Formation {
  id: string;
  name: string;
  imageUrl: string;
  positions: string;
}

export interface Pack {
  id: string;
  name: string;
  imageUrl: string;
  price: number;
  playerCount: number;
  status: 'ACTIVE' | 'INACTIVE' | 'EMPTY';
}

export interface TeamPlayer {
  positionId: string;
  playerId: string | null;
  position: number;
  points: number;
  color: string;
  player?: Player;
}

export interface Team {
  id: string;
  name: string;
  userId: string;
  lobbyId: string;
  formationId: string;
  matchDay: number;
  teamPlayers: TeamPlayer[];
  formation?: Formation;
  stats?: {
    totalPoints: number;
    chemistryPoints: number;
    totalStrength: number;
  };
}

export interface CreateTeamRequest {
  lobbyId: string;
  formationId: string;
  name: string;
  matchDay: number;
  players: Array<{
    playerId: string;
    points: number;
    color: string;
  }>;
}

export interface UpdateTeamRequest {
  name?: string;
  players?: Array<{
    playerId: string;
    points: number;
    color: string;
  }>;
}

export interface Match {
  id: string;
  lobbyId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  matchDay: number;
  played: boolean;
  playedAt?: string;
  homeTeam?: Team;
  awayTeam?: Team;
}

export interface LeagueTableEntry {
  id: string;
  lobbyId: string;
  userId: string;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  wins: number;
  draws: number;
  losses: number;
  matches: number;
  position: number;
  user: {
    id: string;
    username: string;
  };
}

export interface MatchdayProgress {
  matchDay: number;
  total: number;
  played: number;
  remaining: number;
  completed: boolean;
}

export interface LeagueStatus {
  totalMatches: number;
  playedMatches: number;
  remainingMatches: number;
  leagueComplete: boolean;
  currentMatchDay: number;
  matchdayProgress: MatchdayProgress[];
  leagueTable: LeagueTableEntry[];
  lobbyStatus: 'WAITING' | 'IN_PROGRESS' | 'FINISHED';
}

export interface LeagueResult {
  matchId: string;
  matchDay: number;
  homeTeam: string;
  awayTeam: string;
  score: string;
}

export interface PackOpenResult {
  drawnPlayer: Player;
  coinsSpent: number;
  remainingCoins: number;
  remainingPlayersInPack: number;
  packNowEmpty: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class ApiService {
  private getAuthHeader(): HeadersInit {
    const token = localStorage.getItem('auth_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`;
      throw new Error(errorMessage);
    }

    return response.json();
  }

  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await this.makeRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    // Store token in localStorage
    localStorage.setItem('auth_token', response.token);
    return response;
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await this.makeRequest<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });

    // Store token in localStorage
    localStorage.setItem('auth_token', response.token);
    return response;
  }

  async getCurrentUser(): Promise<{ user: User }> {
    return this.makeRequest<{ user: User }>('/auth/me');
  }

  logout(): void {
    localStorage.removeItem('auth_token');
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('auth_token');
  }

  // Lobby methods
  async getLobbies(): Promise<ApiResponse<Lobby[]>> {
    return this.makeRequest<ApiResponse<Lobby[]>>('/lobbies');
  }

  async getLobby(id: string): Promise<ApiResponse<Lobby>> {
    return this.makeRequest<ApiResponse<Lobby>>(`/lobbies/${id}`);
  }

  async createLobby(lobbyData: CreateLobbyRequest): Promise<ApiResponse<Lobby>> {
    return this.makeRequest<ApiResponse<Lobby>>('/lobbies', {
      method: 'POST',
      body: JSON.stringify(lobbyData),
    });
  }

  async joinLobby(id: string): Promise<ApiResponse<Lobby>> {
    return this.makeRequest<ApiResponse<Lobby>>(`/lobbies/${id}/join`, {
      method: 'POST',
    });
  }

  async leaveLobby(id: string): Promise<ApiResponse<void>> {
    return this.makeRequest<ApiResponse<void>>(`/lobbies/${id}/leave`, {
      method: 'POST',
    });
  }

  // Formation methods
  async getFormations(): Promise<ApiResponse<Formation[]>> {
    return this.makeRequest<ApiResponse<Formation[]>>('/formations');
  }

  async getFormation(id: string): Promise<ApiResponse<Formation>> {
    return this.makeRequest<ApiResponse<Formation>>(`/formations/${id}`);
  }

  // Player methods
  async getPlayers(): Promise<ApiResponse<Player[]>> {
    return this.makeRequest<ApiResponse<Player[]>>('/players');
  }

  async getPlayer(id: string): Promise<ApiResponse<Player>> {
    return this.makeRequest<ApiResponse<Player>>(`/players/${id}`);
  }

  // Admin Player methods
  async createPlayer(formData: FormData): Promise<ApiResponse<Player>> {
    const token = localStorage.getItem('auth_token');
    
    console.log('=== FRONTEND UPLOAD DEBUG ===');
    console.log('API_BASE_URL:', API_BASE_URL);
    console.log('Token exists:', !!token);
    console.log('FormData entries:');
    for (const [key, value] of formData.entries()) {
      console.log(`  ${key}:`, value instanceof File ? `File(${value.name}, ${value.size} bytes)` : value);
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/players`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.log('Error response data:', errorData);
        const errorMessage = errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('Success response:', result);
      return result;
    } catch (networkError) {
      console.error('Network/fetch error:', networkError);
      throw networkError;
    }
  }

  async updatePlayer(id: string, formData: FormData): Promise<ApiResponse<Player>> {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE_URL}/players/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`;
      throw new Error(errorMessage);
    }

    return response.json();
  }

  async deletePlayer(id: string): Promise<ApiResponse<void>> {
    return this.makeRequest<ApiResponse<void>>(`/players/${id}`, {
      method: 'DELETE',
    });
  }

  // Pack methods
  async getAvailablePacks(): Promise<ApiResponse<Pack[]>> {
    return this.makeRequest<ApiResponse<Pack[]>>('/packs/available');
  }

  async openPack(packId: string): Promise<ApiResponse<PackOpenResult>> {
    return this.makeRequest<ApiResponse<PackOpenResult>>(`/packs/${packId}/open`, {
      method: 'POST',
    });
  }

  // Team methods
  async getUserTeams(lobbyId: string): Promise<ApiResponse<Team[]>> {
    return this.makeRequest<ApiResponse<Team[]>>(`/teams/lobby/${lobbyId}`);
  }

  async getTeam(id: string): Promise<ApiResponse<Team>> {
    return this.makeRequest<ApiResponse<Team>>(`/teams/${id}`);
  }

  async createTeam(teamData: CreateTeamRequest): Promise<ApiResponse<Team>> {
    return this.makeRequest<ApiResponse<Team>>('/teams', {
      method: 'POST',
      body: JSON.stringify(teamData),
    });
  }

  async updateTeam(id: string, teamData: UpdateTeamRequest): Promise<ApiResponse<Team>> {
    return this.makeRequest<ApiResponse<Team>>(`/teams/${id}`, {
      method: 'PUT',
      body: JSON.stringify(teamData),
    });
  }

  async deleteTeam(id: string): Promise<ApiResponse<void>> {
    return this.makeRequest<ApiResponse<void>>(`/teams/${id}`, {
      method: 'DELETE',
    });
  }

  async validateTeam(id: string): Promise<ApiResponse<{
    isValid: boolean;
    errors: string[];
    playerCount: number;
    requiredPlayers: number;
  }>> {
    return this.makeRequest<ApiResponse<{
      isValid: boolean;
      errors: string[];
      playerCount: number;
      requiredPlayers: number;
    }>>(`/teams/${id}/validate`);
  }

  // Match methods
  async getLobbyMatches(lobbyId: string): Promise<ApiResponse<Match[]>> {
    return this.makeRequest<ApiResponse<Match[]>>(`/matches/lobby/${lobbyId}`);
  }

  async getMatch(id: string): Promise<ApiResponse<Match>> {
    return this.makeRequest<ApiResponse<Match>>(`/matches/${id}`);
  }

  async generateMatchdayMatches(lobbyId: string, matchDay: number): Promise<ApiResponse<Match[]>> {
    return this.makeRequest<ApiResponse<Match[]>>(`/matches/lobby/${lobbyId}/generate`, {
      method: 'POST',
      body: JSON.stringify({ matchDay }),
    });
  }

  async simulateMatch(matchId: string): Promise<ApiResponse<any>> {
    return this.makeRequest<ApiResponse<any>>(`/matches/${matchId}/simulate`, {
      method: 'POST',
    });
  }

  async simulateMatchday(lobbyId: string, matchDay: number): Promise<ApiResponse<any>> {
    return this.makeRequest<ApiResponse<any>>(`/matches/lobby/${lobbyId}/simulate-matchday`, {
      method: 'POST',
      body: JSON.stringify({ matchDay }),
    });
  }

  async getLeagueTable(lobbyId: string): Promise<ApiResponse<LeagueTableEntry[]>> {
    return this.makeRequest<ApiResponse<LeagueTableEntry[]>>(`/matches/lobby/${lobbyId}/table`);
  }

  // League management methods
  async createLeague(lobbyId: string): Promise<ApiResponse<{
    totalMatches: number;
    matchdayBreakdown: {
      matchday1: number;
      matchday2: number;
      matchday3: number;
    };
  }>> {
    return this.makeRequest<ApiResponse<{
      totalMatches: number;
      matchdayBreakdown: {
        matchday1: number;
        matchday2: number;
        matchday3: number;
      };
    }>>(`/matches/lobby/${lobbyId}/create-league`, {
      method: 'POST',
    });
  }

  async simulateEntireLeague(lobbyId: string): Promise<ApiResponse<{
    results: LeagueResult[];
    leagueComplete: boolean;
  }>> {
    return this.makeRequest<ApiResponse<{
      results: LeagueResult[];
      leagueComplete: boolean;
    }>>(`/matches/lobby/${lobbyId}/simulate-league`, {
      method: 'POST',
    });
  }

  async getLeagueStatus(lobbyId: string): Promise<ApiResponse<LeagueStatus>> {
    return this.makeRequest<ApiResponse<LeagueStatus>>(`/matches/lobby/${lobbyId}/status`);
  }

  // User collection methods
  async getUserCollection(): Promise<ApiResponse<UserPlayer[]>> {
    return this.makeRequest<ApiResponse<UserPlayer[]>>('/players/collection/my');
  }
}

export const apiService = new ApiService();