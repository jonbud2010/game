import { MATCH_SETTINGS, LEAGUE_POINTS } from '../constants/game.js';
import { calculateTeamChemistry } from './chemistry.js';
import type { 
  Team, 
  Player, 
  Match, 
  MatchSimulation, 
  MatchEvent, 
  MatchResult,
  PlayerColor 
} from '../types/game.js';

export interface TeamWithPlayers {
  id: string;
  name: string;
  userId: string;
  formationId: string;
  players: Player[];
  totalPoints: number;
  chemistryPoints: number;
}

export interface TeamStrength {
  teamId: string;
  playerPoints: number;
  chemistryPoints: number;
  totalStrength: number;
  winChance: number;
}

/**
 * Calculate team strength based on player points and chemistry bonus
 */
export function calculateTeamStrength(team: TeamWithPlayers): TeamStrength {
  // Calculate total player points
  const playerPoints = team.players.reduce((sum, player) => sum + player.points, 0);
  
  // Calculate chemistry points
  let chemistryPoints = 0;
  try {
    const playersWithColors = team.players.map(p => ({ color: p.color as PlayerColor }));
    // Create a minimal team object for chemistry calculation
    const teamForChemistry = {
      id: team.id,
      name: team.name,
      userId: team.userId,
      formationId: team.formationId,
      players: team.players.map(p => ({ positionId: p.position, playerId: p.id })),
      totalPoints: team.totalPoints,
      chemistryPoints: 0
    };
    chemistryPoints = calculateTeamChemistry(teamForChemistry, playersWithColors);
  } catch (error) {
    // If chemistry validation fails, chemistry is 0
    chemistryPoints = 0;
  }
  
  const totalStrength = playerPoints + chemistryPoints;
  
  return {
    teamId: team.id,
    playerPoints,
    chemistryPoints,
    totalStrength,
    winChance: 0 // Will be calculated in match context
  };
}

/**
 * Calculate win chances for both teams based on their strengths
 */
export function calculateWinChances(team1Strength: TeamStrength, team2Strength: TeamStrength): {
  team1Chance: number;
  team2Chance: number;
} {
  const totalStrength = team1Strength.totalStrength + team2Strength.totalStrength;
  
  if (totalStrength === 0) {
    // If both teams have 0 strength, equal chances
    return { team1Chance: 0.5, team2Chance: 0.5 };
  }
  
  // Base chance is proportional to team strength
  const team1BaseChance = team1Strength.totalStrength / totalStrength;
  const team2BaseChance = team2Strength.totalStrength / totalStrength;
  
  // Calculate average strength for modifier calculation
  const averageStrength = totalStrength / 2;
  
  // Apply modifiers based on comparison to average
  let team1Modifier = 0;
  let team2Modifier = 0;
  
  if (team1Strength.totalStrength > averageStrength) {
    team1Modifier = (team1Strength.totalStrength - averageStrength) * MATCH_SETTINGS.MODIFIER_ABOVE_AVERAGE;
  } else if (team1Strength.totalStrength < averageStrength) {
    team1Modifier = -(averageStrength - team1Strength.totalStrength) * MATCH_SETTINGS.MODIFIER_BELOW_AVERAGE;
  }
  
  if (team2Strength.totalStrength > averageStrength) {
    team2Modifier = (team2Strength.totalStrength - averageStrength) * MATCH_SETTINGS.MODIFIER_ABOVE_AVERAGE;
  } else if (team2Strength.totalStrength < averageStrength) {
    team2Modifier = -(averageStrength - team2Strength.totalStrength) * MATCH_SETTINGS.MODIFIER_BELOW_AVERAGE;
  }
  
  // Base chance is 1% + modifiers
  const team1Chance = Math.max(0.001, MATCH_SETTINGS.BASE_CHANCE_PERCENTAGE / 100 + team1Modifier / 100);
  const team2Chance = Math.max(0.001, MATCH_SETTINGS.BASE_CHANCE_PERCENTAGE / 100 + team2Modifier / 100);
  
  return { team1Chance, team2Chance };
}

/**
 * Simulate a single chance (goal or miss)
 */
function simulateChance(winChance: number): boolean {
  return Math.random() < winChance;
}

/**
 * Generate match events during simulation
 */
function generateMatchEvents(
  team1Goals: number, 
  team2Goals: number, 
  team1Players: Player[], 
  team2Players: Player[]
): MatchEvent[] {
  const events: MatchEvent[] = [];
  const totalGoals = team1Goals + team2Goals;
  
  if (totalGoals === 0) return events;
  
  // Generate random minutes for goals (sorted)
  const goalMinutes = Array.from({ length: totalGoals }, () => Math.floor(Math.random() * 90) + 1)
    .sort((a, b) => a - b);
  
  let team1GoalsScored = 0;
  let team2GoalsScored = 0;
  
  goalMinutes.forEach(minute => {
    // Determine which team scored based on final score proportions
    const shouldBeTeam1Goal = team1GoalsScored < team1Goals && 
      (team2GoalsScored >= team2Goals || Math.random() < team1Goals / totalGoals);
    
    if (shouldBeTeam1Goal) {
      // Random player from team 1 scores
      const scorer = team1Players[Math.floor(Math.random() * team1Players.length)];
      if (scorer) {
        events.push({
          minute,
          type: 'goal',
          team: 1,
          playerId: scorer.id
        });
      }
      team1GoalsScored++;
    } else {
      // Random player from team 2 scores
      const scorer = team2Players[Math.floor(Math.random() * team2Players.length)];
      if (scorer) {
        events.push({
          minute,
          type: 'goal',
          team: 2,
          playerId: scorer.id
        });
      }
      team2GoalsScored++;
    }
  });
  
  return events;
}

/**
 * Simulate a match between two teams
 */
export function simulateMatch(homeTeam: TeamWithPlayers, awayTeam: TeamWithPlayers): MatchSimulation {
  // Calculate team strengths
  const homeStrength = calculateTeamStrength(homeTeam);
  const awayStrength = calculateTeamStrength(awayTeam);
  
  // Calculate win chances
  const { team1Chance, team2Chance } = calculateWinChances(homeStrength, awayStrength);
  
  // Simulate chances for each team
  let homeGoals = 0;
  let awayGoals = 0;
  
  // Home team chances
  for (let i = 0; i < MATCH_SETTINGS.TOTAL_CHANCES_PER_TEAM; i++) {
    if (simulateChance(team1Chance)) {
      homeGoals++;
    }
  }
  
  // Away team chances
  for (let i = 0; i < MATCH_SETTINGS.TOTAL_CHANCES_PER_TEAM; i++) {
    if (simulateChance(team2Chance)) {
      awayGoals++;
    }
  }
  
  // Generate match events
  const events = generateMatchEvents(homeGoals, awayGoals, homeTeam.players, awayTeam.players);
  
  return {
    events,
    team1Chances: MATCH_SETTINGS.TOTAL_CHANCES_PER_TEAM,
    team2Chances: MATCH_SETTINGS.TOTAL_CHANCES_PER_TEAM,
    team1Percentage: team1Chance * 100,
    team2Percentage: team2Chance * 100
  };
}

/**
 * Calculate match result with league points
 */
export function calculateMatchResult(
  homeTeam: TeamWithPlayers, 
  awayTeam: TeamWithPlayers, 
  simulation: MatchSimulation
): MatchResult {
  const homeGoals = simulation.events.filter(e => e.type === 'goal' && e.team === 1).length;
  const awayGoals = simulation.events.filter(e => e.type === 'goal' && e.team === 2).length;
  
  let homePoints = 0;
  let awayPoints = 0;
  
  if (homeGoals > awayGoals) {
    homePoints = LEAGUE_POINTS.WIN;
    awayPoints = LEAGUE_POINTS.LOSS;
  } else if (awayGoals > homeGoals) {
    homePoints = LEAGUE_POINTS.LOSS;
    awayPoints = LEAGUE_POINTS.WIN;
  } else {
    homePoints = LEAGUE_POINTS.DRAW;
    awayPoints = LEAGUE_POINTS.DRAW;
  }
  
  return {
    homeTeam: {
      id: homeTeam.id,
      name: homeTeam.name,
      userId: homeTeam.userId,
      formationId: homeTeam.formationId,
      players: homeTeam.players.map(p => ({ positionId: p.position, playerId: p.id })),
      totalPoints: homeTeam.totalPoints,
      chemistryPoints: homeTeam.chemistryPoints
    },
    awayTeam: {
      id: awayTeam.id,
      name: awayTeam.name,
      userId: awayTeam.userId,
      formationId: awayTeam.formationId,
      players: awayTeam.players.map(p => ({ positionId: p.position, playerId: p.id })),
      totalPoints: awayTeam.totalPoints,
      chemistryPoints: awayTeam.chemistryPoints
    },
    homeScore: homeGoals,
    awayScore: awayGoals,
    homePoints,
    awayPoints
  };
}

/**
 * Simulate a complete match with all details
 */
export function simulateCompleteMatch(homeTeam: TeamWithPlayers, awayTeam: TeamWithPlayers): {
  simulation: MatchSimulation;
  result: MatchResult;
  homeStrength: TeamStrength;
  awayStrength: TeamStrength;
} {
  const simulation = simulateMatch(homeTeam, awayTeam);
  const result = calculateMatchResult(homeTeam, awayTeam, simulation);
  const homeStrength = calculateTeamStrength(homeTeam);
  const awayStrength = calculateTeamStrength(awayTeam);
  
  return {
    simulation,
    result,
    homeStrength,
    awayStrength
  };
}

/**
 * Generate all matches for a 4-player league (round-robin)
 * Returns 6 matches: each player plays against every other player once
 */
export function generateLeagueMatches(teams: TeamWithPlayers[]): Array<{
  homeTeam: TeamWithPlayers;
  awayTeam: TeamWithPlayers;
  matchNumber: number;
}> {
  if (teams.length !== 4) {
    throw new Error('League must have exactly 4 teams');
  }
  
  const matches: Array<{
    homeTeam: TeamWithPlayers;
    awayTeam: TeamWithPlayers;
    matchNumber: number;
  }> = [];
  
  let matchNumber = 1;
  
  // Generate all unique pairings
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const homeTeam = teams[i];
      const awayTeam = teams[j];
      if (homeTeam && awayTeam) {
        matches.push({
          homeTeam,
          awayTeam,
          matchNumber: matchNumber++
        });
      }
    }
  }
  
  return matches;
}

/**
 * Simulate all matches in a league and return results
 */
export function simulateLeague(teams: TeamWithPlayers[]): Array<{
  matchNumber: number;
  simulation: MatchSimulation;
  result: MatchResult;
  homeStrength: TeamStrength;
  awayStrength: TeamStrength;
}> {
  const matches = generateLeagueMatches(teams);
  
  return matches.map(match => ({
    matchNumber: match.matchNumber,
    ...simulateCompleteMatch(match.homeTeam, match.awayTeam)
  }));
}