const API_BASE_URL = 'http://localhost:3001/api';

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
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
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
}

export const apiService = new ApiService();