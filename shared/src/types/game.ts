export interface Player {
  id: string;
  name: string;
  imageUrl: string;
  points: number;
  position: PlayerPosition;
  color: PlayerColor;
  marketPrice: number;
  theme: string;
  percentage: number;
}

export interface Formation {
  id: string;
  name: string;
  imageUrl: string;
  positions: FormationPosition[];
}

export interface FormationPosition {
  id: string;
  x: number;
  y: number;
  position: PlayerPosition;
}

export interface Pack {
  id: string;
  name: string;
  imageUrl: string;
  price: number;
  playerPool: PackPlayer[];
  status: 'active' | 'empty' | 'disabled';
}

export interface PackPlayer {
  playerId: string;
  percentage: number;
}

export interface Team {
  id: string;
  name: string;
  userId: string;
  formationId: string;
  players: TeamPlayer[];
  totalPoints: number;
  chemistryPoints: number;
}

export interface TeamPlayer {
  positionId: string;
  playerId: string | null;
}

export interface Match {
  id: string;
  lobbyId: string;
  team1Id: string;
  team2Id: string;
  score1: number;
  score2: number;
  matchDay: number;
  status: 'pending' | 'in_progress' | 'completed';
  simulation?: MatchSimulation;
}

export interface MatchSimulation {
  events: MatchEvent[];
  team1Chances: number;
  team2Chances: number;
  team1Percentage: number;
  team2Percentage: number;
}

export interface MatchEvent {
  minute: number;
  type: 'goal' | 'chance';
  team: 1 | 2;
  playerId?: string;
}

export interface League {
  id: string;
  lobbyId: string;
  matchDay: number;
  standings: LeagueStanding[];
  status: 'active' | 'completed';
}

export interface LeagueStanding {
  userId: string;
  matchDay: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  position: number;
}

export interface User {
  id: string;
  username: string;
  email: string;
  coins: number;
  role: 'user' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}

export interface Lobby {
  id: string;
  name: string;
  maxPlayers: number;
  currentPlayers: number;
  status: 'waiting' | 'active' | 'completed';
  adminId: string;
  admin: {
    id: string;
    username: string;
  };
  isActive: boolean;
  currentMatchDay: number;
  nextMatchDay?: Date;
  createdAt: Date;
  members: LobbyMember[];
}

export interface LobbyMember {
  userId: string;
  username: string;
  joinedAt: Date;
  isReady: boolean;
}

export interface UserPlayer {
  id: string;
  userId: string;
  playerId: string;
  acquiredAt: Date;
}

export interface GameState {
  currentScreen: 'menu' | 'lobby' | 'team-builder' | 'pack-store' | 'league' | 'match' | 'admin';
  user: User | null;
  currentLobby: Lobby | null;
  isLoading: boolean;
  error: string | null;
}

export interface ScheduledMatchDay {
  id: string;
  lobbyId: string;
  matchDay: number;
  scheduledAt: Date;
  executed: boolean;
  executedAt?: Date;
  createdAt: Date;
}

export interface LobbyAdminPermissions {
  canCreatePlayers: boolean;
  canCreatePacks: boolean;
  canCreateFormations: boolean;
  canScheduleMatchDays: boolean;
  canManageMembers: boolean;
}

export interface MenuItem {
  id: string;
  label: string;
  action: () => void;
  disabled?: boolean;
}

export type PlayerPosition = 
  | 'GK'  // Goalkeeper
  | 'CB'  // Center Back
  | 'LB'  // Left Back
  | 'RB'  // Right Back
  | 'CDM' // Central Defensive Midfielder
  | 'CM'  // Central Midfielder
  | 'CAM' // Central Attacking Midfielder
  | 'LM'  // Left Midfielder
  | 'RM'  // Right Midfielder
  | 'LW'  // Left Winger
  | 'RW'  // Right Winger
  | 'ST'  // Striker
  | 'CF'  // Center Forward
  | 'LF'  // Left Forward
  | 'RF'; // Right Forward

export type PlayerColor = 
  | 'RED'
  | 'BLUE'
  | 'GREEN'
  | 'YELLOW'
  | 'PURPLE'
  | 'ORANGE'
  | 'PINK'
  | 'CYAN';

export interface ChemistryBonus {
  color: PlayerColor;
  playerCount: number;
  bonus: number;
}

export interface MatchResult {
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number;
  awayScore: number;
  homePoints: number;
  awayPoints: number;
}