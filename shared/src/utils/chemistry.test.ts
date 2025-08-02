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
        { color: 'RED' as PlayerColor },
        { color: 'RED' as PlayerColor },
        { color: 'DARK_BLUE' as PlayerColor },
        { color: 'DARK_BLUE' as PlayerColor },
        { color: 'DARK_GREEN' as PlayerColor },
        { color: 'DARK_GREEN' as PlayerColor },
        { color: 'DARK_GREEN' as PlayerColor }
      ];

      const chemistry = calculateTeamChemistry(mockTeam, players);
      
      // Expected: RED(2)=4, DARK_BLUE(2)=4, DARK_GREEN(3)=9 = 17 points
      expect(chemistry).toBe(17);
    });

    it('should throw error for insufficient colors', () => {
      const players = [
        { color: 'RED' as PlayerColor },
        { color: 'RED' as PlayerColor },
        { color: 'DARK_BLUE' as PlayerColor },
        { color: 'DARK_BLUE' as PlayerColor }
      ];

      expect(() => calculateTeamChemistry(mockTeam, players)).toThrow(
        `Team must have exactly ${MATCH_SETTINGS.EXACT_CHEMISTRY_COLORS} different colors`
      );
    });

    it('should throw error for insufficient players per color', () => {
      const players = [
        { color: 'RED' as PlayerColor },
        { color: 'DARK_BLUE' as PlayerColor },
        { color: 'DARK_GREEN' as PlayerColor }
      ];

      expect(() => calculateTeamChemistry(mockTeam, players)).toThrow(
        'Color RED must have at least 2 players'
      );
    });

    it('should handle maximum color counts', () => {
      const players = [
        ...Array(7).fill({ color: 'RED' as PlayerColor }),
        ...Array(2).fill({ color: 'DARK_BLUE' as PlayerColor }),
        ...Array(2).fill({ color: 'DARK_GREEN' as PlayerColor })
      ];

      const chemistry = calculateTeamChemistry(mockTeam, players);
      
      // Expected: RED(7)=49, DARK_BLUE(2)=4, DARK_GREEN(2)=4 = 57 points
      expect(chemistry).toBe(57);
    });

    it('should ignore colors with more than 7 players', () => {
      const players = [
        ...Array(8).fill({ color: 'RED' as PlayerColor }),
        ...Array(2).fill({ color: 'DARK_BLUE' as PlayerColor }),
        ...Array(2).fill({ color: 'DARK_GREEN' as PlayerColor })
      ];

      const chemistry = calculateTeamChemistry(mockTeam, players);
      
      // Expected: RED(8)=0 (ignored), DARK_BLUE(2)=4, DARK_GREEN(2)=4 = 8 points
      expect(chemistry).toBe(8);
    });
  });

  describe('getChemistryBreakdown', () => {
    it('should return correct breakdown sorted by bonus', () => {
      const players = [
        { color: 'RED' as PlayerColor },
        { color: 'RED' as PlayerColor },
        { color: 'DARK_BLUE' as PlayerColor },
        { color: 'DARK_BLUE' as PlayerColor },
        { color: 'DARK_BLUE' as PlayerColor },
        { color: 'DARK_GREEN' as PlayerColor },
        { color: 'DARK_GREEN' as PlayerColor }
      ];

      const breakdown = getChemistryBreakdown(players);

      expect(breakdown).toHaveLength(3);
      expect(breakdown[0]).toEqual({
        color: 'DARK_BLUE',
        playerCount: 3,
        bonus: CHEMISTRY_POINTS[3]
      });
      expect(breakdown[1]).toEqual({
        color: 'RED',
        playerCount: 2,
        bonus: CHEMISTRY_POINTS[2]
      });
      expect(breakdown[2]).toEqual({
        color: 'DARK_GREEN',
        playerCount: 2,
        bonus: CHEMISTRY_POINTS[2]
      });
    });

    it('should exclude colors with less than 2 players', () => {
      const players = [
        { color: 'RED' as PlayerColor },
        { color: 'DARK_BLUE' as PlayerColor },
        { color: 'DARK_BLUE' as PlayerColor }
      ];

      const breakdown = getChemistryBreakdown(players);

      expect(breakdown).toHaveLength(1);
      expect(breakdown[0]).toEqual({
        color: 'DARK_BLUE',
        playerCount: 2,
        bonus: CHEMISTRY_POINTS[2]
      });
    });

    it('should exclude colors with more than 7 players', () => {
      const players = [
        ...Array(8).fill({ color: 'RED' as PlayerColor }),
        ...Array(2).fill({ color: 'DARK_BLUE' as PlayerColor })
      ];

      const breakdown = getChemistryBreakdown(players);

      expect(breakdown).toHaveLength(1);
      expect(breakdown[0]).toEqual({
        color: 'DARK_BLUE',
        playerCount: 2,
        bonus: CHEMISTRY_POINTS[2]
      });
    });
  });

  describe('validateTeamChemistry', () => {
    it('should validate correct team chemistry', () => {
      const players = [
        { color: 'RED' as PlayerColor },
        { color: 'RED' as PlayerColor },
        { color: 'DARK_BLUE' as PlayerColor },
        { color: 'DARK_BLUE' as PlayerColor },
        { color: 'DARK_GREEN' as PlayerColor },
        { color: 'DARK_GREEN' as PlayerColor }
      ];

      const result = validateTeamChemistry(players);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for insufficient colors', () => {
      const players = [
        { color: 'RED' as PlayerColor },
        { color: 'RED' as PlayerColor },
        { color: 'DARK_BLUE' as PlayerColor },
        { color: 'DARK_BLUE' as PlayerColor }
      ];

      const result = validateTeamChemistry(players);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        `Team must have exactly ${MATCH_SETTINGS.EXACT_CHEMISTRY_COLORS} different colors`
      );
    });

    it('should return errors for insufficient players per color', () => {
      const players = [
        { color: 'RED' as PlayerColor },
        { color: 'DARK_BLUE' as PlayerColor },
        { color: 'DARK_GREEN' as PlayerColor }
      ];

      const result = validateTeamChemistry(players);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.errors).toContain('Color RED must have at least 2 players');
      expect(result.errors).toContain('Color DARK_BLUE must have at least 2 players');
      expect(result.errors).toContain('Color DARK_GREEN must have at least 2 players');
    });
  });
});