import {
  calculateTeamStrength,
  calculateWinChances,
  simulateMatch,
  calculateMatchResult,
  generateLeagueMatches,
  simulateLeague,
  type TeamWithPlayers,
  type TeamStrength
} from './matchEngine.js';
import { MATCH_SETTINGS, LEAGUE_POINTS } from '../constants/game.js';
import type { Player, PlayerColor } from '../types/game.js';

describe('Match Engine Utils', () => {
  const mockPlayer1: Player = {
    id: 'player-1',
    name: 'Test Player 1',
    imageUrl: '/test1.jpg',
    points: 10,
    position: 'GK',
    color: 'red',
    marketPrice: 100,
    theme: 'basic',
    percentage: 50
  };

  const mockPlayer2: Player = {
    id: 'player-2',
    name: 'Test Player 2',
    imageUrl: '/test2.jpg',
    points: 15,
    position: 'CB',
    color: 'blue',
    marketPrice: 150,
    theme: 'basic',
    percentage: 60
  };

  const mockTeam: TeamWithPlayers = {
    id: 'team-1',
    name: 'Test Team',
    userId: 'user-1',
    formationId: 'formation-1',
    players: [mockPlayer1, mockPlayer2],
    totalPoints: 25,
    chemistryPoints: 0
  };

  const mockValidChemistryTeam: TeamWithPlayers = {
    id: 'team-2',
    name: 'Chemistry Team',
    userId: 'user-2',
    formationId: 'formation-1',
    players: [
      { ...mockPlayer1, color: 'red' },
      { ...mockPlayer1, id: 'player-3', color: 'red' },
      { ...mockPlayer2, color: 'blue' },
      { ...mockPlayer2, id: 'player-4', color: 'blue' },
      { ...mockPlayer1, id: 'player-5', color: 'green' },
      { ...mockPlayer1, id: 'player-6', color: 'green' }
    ],
    totalPoints: 60,
    chemistryPoints: 0
  };

  describe('calculateTeamStrength', () => {
    it('should calculate team strength without chemistry bonus', () => {
      const strength = calculateTeamStrength(mockTeam);

      expect(strength.teamId).toBe('team-1');
      expect(strength.playerPoints).toBe(25);
      expect(strength.chemistryPoints).toBe(0);
      expect(strength.totalStrength).toBe(25);
      expect(strength.winChance).toBe(0);
    });

    it('should calculate team strength with chemistry bonus', () => {
      const strength = calculateTeamStrength(mockValidChemistryTeam);

      expect(strength.teamId).toBe('team-2');
      expect(strength.playerPoints).toBe(60);
      expect(strength.chemistryPoints).toBe(12); // 3 colors with 2 players each: 4+4+4
      expect(strength.totalStrength).toBe(72);
    });

    it('should handle empty player array', () => {
      const emptyTeam: TeamWithPlayers = {
        ...mockTeam,
        players: [],
        totalPoints: 0
      };

      const strength = calculateTeamStrength(emptyTeam);

      expect(strength.playerPoints).toBe(0);
      expect(strength.chemistryPoints).toBe(0);
      expect(strength.totalStrength).toBe(0);
    });
  });

  describe('calculateWinChances', () => {
    it('should calculate equal chances for equal teams', () => {
      const team1Strength: TeamStrength = {
        teamId: 'team-1',
        playerPoints: 50,
        chemistryPoints: 10,
        totalStrength: 60,
        winChance: 0
      };

      const team2Strength: TeamStrength = {
        teamId: 'team-2',
        playerPoints: 50,
        chemistryPoints: 10,
        totalStrength: 60,
        winChance: 0
      };

      const chances = calculateWinChances(team1Strength, team2Strength);

      expect(chances.team1Chance).toBeCloseTo(0.01, 3); // Base 1% chance
      expect(chances.team2Chance).toBeCloseTo(0.01, 3);
    });

    it('should handle zero strength teams', () => {
      const team1Strength: TeamStrength = {
        teamId: 'team-1',
        playerPoints: 0,
        chemistryPoints: 0,
        totalStrength: 0,
        winChance: 0
      };

      const team2Strength: TeamStrength = {
        teamId: 'team-2',
        playerPoints: 0,
        chemistryPoints: 0,
        totalStrength: 0,
        winChance: 0
      };

      const chances = calculateWinChances(team1Strength, team2Strength);

      expect(chances.team1Chance).toBe(0.5);
      expect(chances.team2Chance).toBe(0.5);
    });

    it('should give advantage to stronger team', () => {
      const strongTeam: TeamStrength = {
        teamId: 'strong',
        playerPoints: 100,
        chemistryPoints: 20,
        totalStrength: 120,
        winChance: 0
      };

      const weakTeam: TeamStrength = {
        teamId: 'weak',
        playerPoints: 20,
        chemistryPoints: 0,
        totalStrength: 20,
        winChance: 0
      };

      const chances = calculateWinChances(strongTeam, weakTeam);

      expect(chances.team1Chance).toBeGreaterThan(chances.team2Chance);
      expect(chances.team1Chance).toBeGreaterThan(0.01);
      expect(chances.team2Chance).toBeLessThan(0.01);
    });

    it('should apply correct modifiers', () => {
      const team1: TeamStrength = {
        teamId: 'team-1',
        playerPoints: 80,
        chemistryPoints: 0,
        totalStrength: 80,
        winChance: 0
      };

      const team2: TeamStrength = {
        teamId: 'team-2',
        playerPoints: 20,
        chemistryPoints: 0,
        totalStrength: 20,
        winChance: 0
      };

      const chances = calculateWinChances(team1, team2);
      const averageStrength = (80 + 20) / 2; // 50

      // Team1 is 30 points above average, should get +1.5% (30 * 0.05)
      // Team2 is 30 points below average, should get -0.3% (30 * 0.01)
      expect(chances.team1Chance).toBeCloseTo(0.01 + 0.015, 3); // 2.5%
      expect(chances.team2Chance).toBeCloseTo(0.01 - 0.003, 3); // 0.7%
    });
  });

  describe('simulateMatch', () => {
    it('should simulate a match and return valid results', () => {
      const simulation = simulateMatch(mockTeam, mockValidChemistryTeam);

      expect(simulation.events).toBeDefined();
      expect(simulation.team1Chances).toBe(MATCH_SETTINGS.TOTAL_CHANCES_PER_TEAM);
      expect(simulation.team2Chances).toBe(MATCH_SETTINGS.TOTAL_CHANCES_PER_TEAM);
      expect(simulation.team1Percentage).toBeGreaterThanOrEqual(0);
      expect(simulation.team2Percentage).toBeGreaterThanOrEqual(0);
    });

    it('should generate goal events in chronological order', () => {
      const simulation = simulateMatch(mockValidChemistryTeam, mockTeam);
      
      const goalEvents = simulation.events.filter(e => e.type === 'goal');
      const minutes = goalEvents.map(e => e.minute);
      
      // Check if minutes are sorted
      for (let i = 1; i < minutes.length; i++) {
        expect(minutes[i]).toBeGreaterThanOrEqual(minutes[i - 1]);
      }
    });

    it('should assign goals to valid players', () => {
      const simulation = simulateMatch(mockTeam, mockValidChemistryTeam);
      
      const goalEvents = simulation.events.filter(e => e.type === 'goal');
      const team1PlayerIds = mockTeam.players.map(p => p.id);
      const team2PlayerIds = mockValidChemistryTeam.players.map(p => p.id);
      
      goalEvents.forEach(event => {
        if (event.team === 1) {
          expect(team1PlayerIds).toContain(event.playerId);
        } else {
          expect(team2PlayerIds).toContain(event.playerId);
        }
      });
    });
  });

  describe('generateLeagueMatches', () => {
    it('should generate correct number of matches for 4 teams', () => {
      const teams = [
        { ...mockTeam, id: 'team-1' },
        { ...mockTeam, id: 'team-2' },
        { ...mockTeam, id: 'team-3' },
        { ...mockTeam, id: 'team-4' }
      ];

      const matches = generateLeagueMatches(teams);

      expect(matches).toHaveLength(6); // 4 teams = 6 matches (C(4,2))
      expect(matches[0].matchNumber).toBe(1);
      expect(matches[5].matchNumber).toBe(6);
    });

    it('should throw error for wrong number of teams', () => {
      const teams = [mockTeam, mockValidChemistryTeam]; // Only 2 teams

      expect(() => generateLeagueMatches(teams)).toThrow('League must have exactly 4 teams');
    });

    it('should generate all unique pairings', () => {
      const teams = [
        { ...mockTeam, id: 'team-1' },
        { ...mockTeam, id: 'team-2' },
        { ...mockTeam, id: 'team-3' },
        { ...mockTeam, id: 'team-4' }
      ];

      const matches = generateLeagueMatches(teams);
      const pairings = matches.map(m => `${m.homeTeam.id}-${m.awayTeam.id}`);

      expect(pairings).toContain('team-1-team-2');
      expect(pairings).toContain('team-1-team-3');
      expect(pairings).toContain('team-1-team-4');
      expect(pairings).toContain('team-2-team-3');
      expect(pairings).toContain('team-2-team-4');
      expect(pairings).toContain('team-3-team-4');
    });
  });

  describe('calculateMatchResult', () => {
    it('should calculate correct league points for win', () => {
      const simulation = {
        events: [
          { minute: 10, type: 'goal' as const, team: 1, playerId: 'player-1' },
          { minute: 20, type: 'goal' as const, team: 1, playerId: 'player-2' }
        ],
        team1Chances: 100,
        team2Chances: 100,
        team1Percentage: 50,
        team2Percentage: 50
      };

      const result = calculateMatchResult(mockTeam, mockValidChemistryTeam, simulation);

      expect(result.homeScore).toBe(2);
      expect(result.awayScore).toBe(0);
      expect(result.homePoints).toBe(LEAGUE_POINTS.WIN);
      expect(result.awayPoints).toBe(LEAGUE_POINTS.LOSS);
    });

    it('should calculate correct league points for draw', () => {
      const simulation = {
        events: [
          { minute: 10, type: 'goal' as const, team: 1, playerId: 'player-1' },
          { minute: 20, type: 'goal' as const, team: 2, playerId: 'player-3' }
        ],
        team1Chances: 100,
        team2Chances: 100,
        team1Percentage: 50,
        team2Percentage: 50
      };

      const result = calculateMatchResult(mockTeam, mockValidChemistryTeam, simulation);

      expect(result.homeScore).toBe(1);
      expect(result.awayScore).toBe(1);
      expect(result.homePoints).toBe(LEAGUE_POINTS.DRAW);
      expect(result.awayPoints).toBe(LEAGUE_POINTS.DRAW);
    });
  });

  describe('simulateLeague', () => {
    it('should simulate complete league with all matches', () => {
      const teams = [
        { ...mockTeam, id: 'team-1' },
        { ...mockTeam, id: 'team-2' },
        { ...mockTeam, id: 'team-3' },
        { ...mockTeam, id: 'team-4' }
      ];

      const results = simulateLeague(teams);

      expect(results).toHaveLength(6);
      results.forEach((result, index) => {
        expect(result.matchNumber).toBe(index + 1);
        expect(result.simulation).toBeDefined();
        expect(result.result).toBeDefined();
        expect(result.homeStrength).toBeDefined();
        expect(result.awayStrength).toBeDefined();
      });
    });
  });
});