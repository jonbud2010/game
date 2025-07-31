import {
  PLAYER_POSITIONS,
  PLAYER_COLORS,
  CHEMISTRY_POINTS,
  LEAGUE_POINTS,
  LEAGUE_REWARDS,
  MATCH_SETTINGS,
  LOBBY_SETTINGS,
  VALIDATION_RULES
} from './game.js';

describe('Game Constants', () => {
  describe('PLAYER_POSITIONS', () => {
    it('should have all required positions', () => {
      const expectedPositions = [
        'GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 
        'LM', 'RM', 'LW', 'RW', 'ST', 'CF', 'LF', 'RF'
      ];

      expectedPositions.forEach(position => {
        expect(PLAYER_POSITIONS).toHaveProperty(position);
        expect(typeof PLAYER_POSITIONS[position as keyof typeof PLAYER_POSITIONS]).toBe('string');
      });
    });

    it('should have exactly 15 positions', () => {
      expect(Object.keys(PLAYER_POSITIONS)).toHaveLength(15);
    });

    it('should have German descriptions', () => {
      expect(PLAYER_POSITIONS.GK).toBe('Torwart');
      expect(PLAYER_POSITIONS.ST).toBe('Stürmer');
      expect(PLAYER_POSITIONS.CB).toBe('Innenverteidiger');
    });
  });

  describe('PLAYER_COLORS', () => {
    it('should have all required colors', () => {
      const expectedColors = [
        'red', 'blue', 'green', 'yellow', 'purple',
        'orange', 'pink', 'cyan', 'lime', 'indigo'
      ];

      expectedColors.forEach(color => {
        expect(PLAYER_COLORS).toHaveProperty(color);
        expect(typeof PLAYER_COLORS[color as keyof typeof PLAYER_COLORS]).toBe('string');
      });
    });

    it('should have exactly 10 colors', () => {
      expect(Object.keys(PLAYER_COLORS)).toHaveLength(10);
    });

    it('should have valid hex color codes', () => {
      Object.values(PLAYER_COLORS).forEach(colorCode => {
        expect(colorCode).toMatch(/^#[0-9A-F]{6}$/i);
      });
    });
  });

  describe('CHEMISTRY_POINTS', () => {
    it('should have correct chemistry point values', () => {
      expect(CHEMISTRY_POINTS[2]).toBe(4);
      expect(CHEMISTRY_POINTS[3]).toBe(9);
      expect(CHEMISTRY_POINTS[4]).toBe(16);
      expect(CHEMISTRY_POINTS[5]).toBe(25);
      expect(CHEMISTRY_POINTS[6]).toBe(36);
      expect(CHEMISTRY_POINTS[7]).toBe(49);
    });

    it('should follow square formula pattern (n²)', () => {
      expect(CHEMISTRY_POINTS[2]).toBe(2 * 2);
      expect(CHEMISTRY_POINTS[3]).toBe(3 * 3);
      expect(CHEMISTRY_POINTS[4]).toBe(4 * 4);
      expect(CHEMISTRY_POINTS[5]).toBe(5 * 5);
      expect(CHEMISTRY_POINTS[6]).toBe(6 * 6);
      expect(CHEMISTRY_POINTS[7]).toBe(7 * 7);
    });

    it('should have exactly 6 entries', () => {
      expect(Object.keys(CHEMISTRY_POINTS)).toHaveLength(6);
    });
  });

  describe('LEAGUE_POINTS', () => {
    it('should have correct league point values', () => {
      expect(LEAGUE_POINTS.WIN).toBe(3);
      expect(LEAGUE_POINTS.DRAW).toBe(1);
      expect(LEAGUE_POINTS.LOSS).toBe(0);
    });

    it('should have all required league outcomes', () => {
      expect(LEAGUE_POINTS).toHaveProperty('WIN');
      expect(LEAGUE_POINTS).toHaveProperty('DRAW');
      expect(LEAGUE_POINTS).toHaveProperty('LOSS');
    });
  });

  describe('LEAGUE_REWARDS', () => {
    it('should have correct reward values', () => {
      expect(LEAGUE_REWARDS[1]).toBe(250);
      expect(LEAGUE_REWARDS[2]).toBe(200);
      expect(LEAGUE_REWARDS[3]).toBe(150);
      expect(LEAGUE_REWARDS[4]).toBe(100);
    });

    it('should have descending reward values', () => {
      const positions = Object.keys(LEAGUE_REWARDS).map(Number).sort();
      for (let i = 1; i < positions.length; i++) {
        const currentPos = positions[i];
        const prevPos = positions[i - 1];
        if (currentPos && prevPos) {
          expect(LEAGUE_REWARDS[prevPos]).toBeGreaterThan(LEAGUE_REWARDS[currentPos]);
        }
      }
    });

    it('should have exactly 4 reward positions', () => {
      expect(Object.keys(LEAGUE_REWARDS)).toHaveLength(4);
    });
  });

  describe('MATCH_SETTINGS', () => {
    it('should have correct match simulation settings', () => {
      expect(MATCH_SETTINGS.BASE_CHANCE_PERCENTAGE).toBe(1);
      expect(MATCH_SETTINGS.MODIFIER_ABOVE_AVERAGE).toBe(0.05);
      expect(MATCH_SETTINGS.MODIFIER_BELOW_AVERAGE).toBe(0.01);
      expect(MATCH_SETTINGS.TOTAL_CHANCES_PER_TEAM).toBe(100);
    });

    it('should have correct chemistry requirements', () => {
      expect(MATCH_SETTINGS.MIN_CHEMISTRY_COLORS).toBe(3);
      expect(MATCH_SETTINGS.MIN_PLAYERS_PER_COLOR).toBe(2);
    });

    it('should have correct team composition settings', () => {
      expect(MATCH_SETTINGS.PLAYERS_PER_TEAM).toBe(11);
      expect(MATCH_SETTINGS.TEAMS_PER_MATCHDAY).toBe(3);
      expect(MATCH_SETTINGS.TOTAL_PLAYERS_PER_MATCHDAY).toBe(33);
    });

    it('should have logical consistency in team settings', () => {
      expect(MATCH_SETTINGS.TOTAL_PLAYERS_PER_MATCHDAY)
        .toBe(MATCH_SETTINGS.PLAYERS_PER_TEAM * MATCH_SETTINGS.TEAMS_PER_MATCHDAY);
    });
  });

  describe('LOBBY_SETTINGS', () => {
    it('should have correct lobby settings', () => {
      expect(LOBBY_SETTINGS.MAX_PLAYERS).toBe(4);
      expect(LOBBY_SETTINGS.MATCHES_PER_MATCHDAY).toBe(6);
    });

    it('should have logical match count for 4 players', () => {
      // For 4 players, round-robin = C(4,2) = 6 matches
      const expectedMatches = (4 * (4 - 1)) / 2;
      expect(LOBBY_SETTINGS.MATCHES_PER_MATCHDAY).toBe(expectedMatches);
    });
  });

  describe('VALIDATION_RULES', () => {
    it('should have username validation rules', () => {
      expect(VALIDATION_RULES.USERNAME.MIN_LENGTH).toBe(3);
      expect(VALIDATION_RULES.USERNAME.MAX_LENGTH).toBe(20);
    });

    it('should have password validation rules', () => {
      expect(VALIDATION_RULES.PASSWORD.MIN_LENGTH).toBe(8);
      expect(VALIDATION_RULES.PASSWORD.MAX_LENGTH).toBe(128);
    });

    it('should have email validation rules', () => {
      expect(VALIDATION_RULES.EMAIL.MAX_LENGTH).toBe(255);
    });

    it('should have all entity name validation rules', () => {
      const entities = ['TEAM_NAME', 'LOBBY_NAME', 'PLAYER_NAME', 'FORMATION_NAME', 'PACK_NAME'];
      
      entities.forEach(entity => {
        expect(VALIDATION_RULES).toHaveProperty(entity);
        expect(VALIDATION_RULES[entity as keyof typeof VALIDATION_RULES]).toHaveProperty('MIN_LENGTH');
        expect(VALIDATION_RULES[entity as keyof typeof VALIDATION_RULES]).toHaveProperty('MAX_LENGTH');
      });
    });

    it('should have reasonable length limits', () => {
      expect(VALIDATION_RULES.USERNAME.MIN_LENGTH).toBeGreaterThan(0);
      expect(VALIDATION_RULES.USERNAME.MAX_LENGTH).toBeGreaterThan(VALIDATION_RULES.USERNAME.MIN_LENGTH);
      
      expect(VALIDATION_RULES.PASSWORD.MIN_LENGTH).toBeGreaterThanOrEqual(8);
      expect(VALIDATION_RULES.PASSWORD.MAX_LENGTH).toBeGreaterThan(VALIDATION_RULES.PASSWORD.MIN_LENGTH);
    });
  });
});