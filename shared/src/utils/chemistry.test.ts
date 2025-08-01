import { describe, it, expect } from 'vitest';
import { calculateTeamChemistry, getChemistryBreakdown, validateTeamChemistry } from './chemistry';
import { CHEMISTRY_POINTS, MATCH_SETTINGS } from '../constants/game';
import type { Team, PlayerColor, ChemistryBonus } from '../types/game';

describe('Chemistry Utils', () => {
  const mockTeam: Team = {
    id: 'team-1',
    name: 'Test Team',
    userId: 'user-1',
    formationId: 'formation-1',
    players: [
      { positionId: 'GK', playerId: 'player-1' },
      { positionId: 'CB', playerId: 'player-2' }
    ],
    totalPoints: 100,
    chemistryPoints: 0
  };

  describe('calculateTeamChemistry', () => {
    it('should calculate chemistry correctly for valid team', () => {
      const players = [
        { color: 'red' as PlayerColor },
        { color: 'red' as PlayerColor },
        { color: 'blue' as PlayerColor },
        { color: 'blue' as PlayerColor },
        { color: 'green' as PlayerColor },
        { color: 'green' as PlayerColor },
        { color: 'green' as PlayerColor }
      ];

      const chemistry = calculateTeamChemistry(mockTeam, players);
      
      // Expected: red(2)=4, blue(2)=4, green(3)=9 = 17 points
      expect(chemistry).toBe(17);
    });

    it('should throw error for insufficient colors', () => {
      const players = [
        { color: 'red' as PlayerColor },
        { color: 'red' as PlayerColor },
        { color: 'blue' as PlayerColor },
        { color: 'blue' as PlayerColor }
      ];

      expect(() => calculateTeamChemistry(mockTeam, players)).toThrow(
        `Team muss mindestens ${MATCH_SETTINGS.MIN_CHEMISTRY_COLORS} verschiedene Farben haben`
      );
    });

    it('should throw error for insufficient players per color', () => {
      const players = [
        { color: 'red' as PlayerColor },
        { color: 'blue' as PlayerColor },
        { color: 'green' as PlayerColor }
      ];

      expect(() => calculateTeamChemistry(mockTeam, players)).toThrow(
        'Farbe red muss mindestens 2 Spieler haben'
      );
    });

    it('should handle maximum color counts', () => {
      const players = [
        ...Array(7).fill({ color: 'red' as PlayerColor }),
        ...Array(2).fill({ color: 'blue' as PlayerColor }),
        ...Array(2).fill({ color: 'green' as PlayerColor })
      ];

      const chemistry = calculateTeamChemistry(mockTeam, players);
      
      // Expected: red(7)=49, blue(2)=4, green(2)=4 = 57 points
      expect(chemistry).toBe(57);
    });

    it('should ignore colors with more than 7 players', () => {
      const players = [
        ...Array(8).fill({ color: 'red' as PlayerColor }),
        ...Array(2).fill({ color: 'blue' as PlayerColor }),
        ...Array(2).fill({ color: 'green' as PlayerColor })
      ];

      const chemistry = calculateTeamChemistry(mockTeam, players);
      
      // Expected: red(8)=0 (ignored), blue(2)=4, green(2)=4 = 8 points
      expect(chemistry).toBe(8);
    });
  });

  describe('getChemistryBreakdown', () => {
    it('should return correct breakdown sorted by bonus', () => {
      const players = [
        { color: 'red' as PlayerColor },
        { color: 'red' as PlayerColor },
        { color: 'blue' as PlayerColor },
        { color: 'blue' as PlayerColor },
        { color: 'blue' as PlayerColor },
        { color: 'green' as PlayerColor },
        { color: 'green' as PlayerColor }
      ];

      const breakdown = getChemistryBreakdown(players);

      expect(breakdown).toHaveLength(3);
      expect(breakdown[0]).toEqual({
        color: 'blue',
        playerCount: 3,
        bonus: CHEMISTRY_POINTS[3]
      });
      expect(breakdown[1]).toEqual({
        color: 'red',
        playerCount: 2,
        bonus: CHEMISTRY_POINTS[2]
      });
      expect(breakdown[2]).toEqual({
        color: 'green',
        playerCount: 2,
        bonus: CHEMISTRY_POINTS[2]
      });
    });

    it('should exclude colors with less than 2 players', () => {
      const players = [
        { color: 'red' as PlayerColor },
        { color: 'blue' as PlayerColor },
        { color: 'blue' as PlayerColor }
      ];

      const breakdown = getChemistryBreakdown(players);

      expect(breakdown).toHaveLength(1);
      expect(breakdown[0]).toEqual({
        color: 'blue',
        playerCount: 2,
        bonus: CHEMISTRY_POINTS[2]
      });
    });

    it('should exclude colors with more than 7 players', () => {
      const players = [
        ...Array(8).fill({ color: 'red' as PlayerColor }),
        ...Array(2).fill({ color: 'blue' as PlayerColor })
      ];

      const breakdown = getChemistryBreakdown(players);

      expect(breakdown).toHaveLength(1);
      expect(breakdown[0]).toEqual({
        color: 'blue',
        playerCount: 2,
        bonus: CHEMISTRY_POINTS[2]
      });
    });
  });

  describe('validateTeamChemistry', () => {
    it('should validate correct team chemistry', () => {
      const players = [
        { color: 'red' as PlayerColor },
        { color: 'red' as PlayerColor },
        { color: 'blue' as PlayerColor },
        { color: 'blue' as PlayerColor },
        { color: 'green' as PlayerColor },
        { color: 'green' as PlayerColor }
      ];

      const result = validateTeamChemistry(players);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for insufficient colors', () => {
      const players = [
        { color: 'red' as PlayerColor },
        { color: 'red' as PlayerColor },
        { color: 'blue' as PlayerColor },
        { color: 'blue' as PlayerColor }
      ];

      const result = validateTeamChemistry(players);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        `Team muss mindestens ${MATCH_SETTINGS.MIN_CHEMISTRY_COLORS} verschiedene Farben haben`
      );
    });

    it('should return errors for insufficient players per color', () => {
      const players = [
        { color: 'red' as PlayerColor },
        { color: 'blue' as PlayerColor },
        { color: 'green' as PlayerColor }
      ];

      const result = validateTeamChemistry(players);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.errors).toContain('Farbe red muss mindestens 2 Spieler haben');
      expect(result.errors).toContain('Farbe blue muss mindestens 2 Spieler haben');
      expect(result.errors).toContain('Farbe green muss mindestens 2 Spieler haben');
    });
  });
});