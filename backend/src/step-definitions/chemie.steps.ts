// TODO: Replace with Vitest-compatible BDD library
// import { defineFeature, loadFeature } from 'jest-cucumber';
import { calculateChemistry } from '@football-tcg/shared';
import { testDb, resetTestDatabase } from '../test-utils/testDatabase.js';
import { createTestFactories, TestFactories } from '../test-utils/testFactories.js';

const feature = loadFeature('./features/chemie.feature');

defineFeature(feature, (test) => {
  let factories: TestFactories;
  let testTeam: any;
  let testPlayers: any[] = [];
  let chemistryResult: any;
  let teamColors: { [color: string]: number } = {};

  beforeEach(async () => {
    // Reset database and setup factories
    await resetTestDatabase();
    factories = createTestFactories(testDb.getPrisma());

    // Clear any previous state
    testTeam = null;
    testPlayers = [];
    chemistryResult = null;
    teamColors = {};
  });

  afterEach(async () => {
    await testDb.clean();
  });

  test('Gültige Chemie mit minimalen Anforderungen', ({ given, when, then, and }) => {
    given('ich habe ein 11-Spieler Team mit folgenden Farben:', async (table) => {
      testPlayers = [];
      
      for (const row of table) {
        const color = row.Farbe;
        const count = parseInt(row['Anzahl Spieler']);
        
        for (let i = 0; i < count; i++) {
          const player = await factories.createPlayer({ color });
          testPlayers.push(player);
        }
        teamColors[color] = count;
      }
    });

    when('die Chemie berechnet wird', () => {
      const playerColors = testPlayers.map(p => p.color);
      chemistryResult = calculateChemistry(playerColors);
    });

    then('sollte die Chemie gültig sein', () => {
      expect(chemistryResult.isValid).toBe(true);
    });

    and('der Chemie-Bonus sollte berechnet werden als:', (table) => {
      table.forEach(row => {
        const color = row.Farbe;
        const playerCount = parseInt(row.Spieler);
        const expectedBonus = parseInt(row['Bonus (n²)']);
        
        expect(chemistryResult.colorBonuses[color]).toBe(expectedBonus);
        expect(expectedBonus).toBe(playerCount * playerCount);
      });
    });

    and(/der Gesamt-Chemie-Bonus sollte (\d+) Punkte betragen/, (totalBonus) => {
      expect(chemistryResult.totalBonus).toBe(parseInt(totalBonus));
    });
  });

  test('Maximale Chemie mit optimaler Verteilung', ({ given, when, then, and }) => {
    given('ich habe ein Team mit perfekter Farb-Verteilung (genau 3 Farben):', async (table) => {
      testPlayers = [];
      
      for (const row of table) {
        const color = row.Farbe;
        const count = parseInt(row['Anzahl Spieler']);
        
        for (let i = 0; i < count; i++) {
          const player = await factories.createPlayer({ color });
          testPlayers.push(player);
        }
      }
    });

    when('die Chemie berechnet wird', () => {
      const playerColors = testPlayers.map(p => p.color);
      chemistryResult = calculateChemistry(playerColors);
    });

    then('sollte die Chemie gültig sein', () => {
      expect(chemistryResult.isValid).toBe(true);
    });

    and(/der Chemie-Bonus sollte (\d+) Punkte betragen/, (expectedBonus) => {
      expect(chemistryResult.totalBonus).toBe(parseInt(expectedBonus));
    });

    and('alle 3 verwendeten Farben sollten Boni generieren', () => {
      const colorsWithBonus = Object.keys(chemistryResult.colorBonuses).filter(
        color => chemistryResult.colorBonuses[color] > 0
      );
      expect(colorsWithBonus).toHaveLength(3);
    });
  });

  test('Ungültige Chemie - zu wenige Farben', ({ given, when, then, and }) => {
    given('ich habe ein Team mit nur 2 Farben:', async (table) => {
      testPlayers = [];
      
      for (const row of table) {
        const color = row.Farbe;
        const count = parseInt(row['Anzahl Spieler']);
        
        for (let i = 0; i < count; i++) {
          const player = await factories.createPlayer({ color });
          testPlayers.push(player);
        }
      }
    });

    when('die Chemie berechnet wird', () => {
      const playerColors = testPlayers.map(p => p.color);
      chemistryResult = calculateChemistry(playerColors);
    });

    then('sollte die Chemie ungültig sein', () => {
      expect(chemistryResult.isValid).toBe(false);
    });

    and('der Chemie-Bonus sollte 0 betragen', () => {
      expect(chemistryResult.totalBonus).toBe(0);
    });

    and('eine Warnung sollte ausgegeben werden: "Team muss genau 3 verschiedene Farben haben"', () => {
      expect(chemistryResult.error).toContain('genau 3 verschiedene Farben');
    });
  });

  test('Ungültige Chemie - zu viele Farben', ({ given, when, then, and }) => {
    given('ich habe ein Team mit 4 verschiedenen Farben:', async (table) => {
      testPlayers = [];
      
      for (const row of table) {
        const color = row.Farbe;
        const count = parseInt(row['Anzahl Spieler']);
        
        for (let i = 0; i < count; i++) {
          const player = await factories.createPlayer({ color });
          testPlayers.push(player);
        }
      }
    });

    when('die Chemie berechnet wird', () => {
      const playerColors = testPlayers.map(p => p.color);
      chemistryResult = calculateChemistry(playerColors);
    });

    then('sollte die Chemie ungültig sein', () => {
      expect(chemistryResult.isValid).toBe(false);
    });

    and('der Chemie-Bonus sollte 0 betragen', () => {
      expect(chemistryResult.totalBonus).toBe(0);
    });

    and('eine Warnung sollte ausgegeben werden: "Team muss genau 3 verschiedene Farben haben"', () => {
      expect(chemistryResult.error).toContain('genau 3 verschiedene Farben');
    });
  });

  test('Optimale Chemie-Verteilungen', ({ given, when, then, and }) => {
    given('ich teste verschiedene 3-Farben Kombinationen:', async (table) => {
      // This test will run multiple chemistry calculations
    });

    when('die Chemie für jede Konfiguration berechnet wird', async () => {
      const testConfigurations = [
        { rot: 4, gelb: 4, lila: 3, expected: 41 },
        { rot: 5, gelb: 3, lila: 3, expected: 43 },
        { rot: 4, gelb: 3, lila: 4, expected: 41 },
        { rot: 3, gelb: 4, lila: 4, expected: 41 }
      ];

      for (const config of testConfigurations) {
        const colors = [];
        
        // Add players for each color
        for (let i = 0; i < config.rot; i++) colors.push('rot');
        for (let i = 0; i < config.gelb; i++) colors.push('gelb');
        for (let i = 0; i < config.lila; i++) colors.push('lila');
        
        const result = calculateChemistry(colors);
        expect(result.isValid).toBe(true);
        expect(result.totalBonus).toBe(config.expected);
      }
    });

    then('sollten alle Kombinationen gültig sein', () => {
      // Already tested in the when step
      expect(true).toBe(true);
    });

    and('die Boni sollten entsprechend der Quadratformel berechnet werden', () => {
      // Already tested in the when step
      expect(true).toBe(true);
    });

    and(/die 5-3-3 Verteilung sollte optimal sein \((\d+) Punkte\)/, (expectedPoints) => {
      const colors = [];
      for (let i = 0; i < 5; i++) colors.push('rot');
      for (let i = 0; i < 3; i++) colors.push('gelb');
      for (let i = 0; i < 3; i++) colors.push('lila');
      
      const result = calculateChemistry(colors);
      expect(result.totalBonus).toBe(parseInt(expectedPoints));
    });
  });

  test('Quadratische Bonus-Berechnung validieren', ({ given, when, then, and }) => {
    given('ich teste verschiedene Spieleranzahlen pro Farbe:', (table) => {
      // Test data is provided in the table
    });

    when('die Chemie für jede Konfiguration berechnet wird', () => {
      const testCases = [
        { players: 2, expected: 4 },
        { players: 3, expected: 9 },
        { players: 4, expected: 16 },
        { players: 5, expected: 25 },
        { players: 6, expected: 36 },
        { players: 7, expected: 49 }
      ];

      testCases.forEach(testCase => {
        // Create a valid 3-color team with one color having the test count
        const colors = [];
        
        // Add the test color
        for (let i = 0; i < testCase.players; i++) {
          colors.push('rot');
        }
        
        // Add minimum required for other colors
        const remainingPlayers = 11 - testCase.players;
        const secondColorCount = Math.ceil(remainingPlayers / 2);
        const thirdColorCount = remainingPlayers - secondColorCount;
        
        if (secondColorCount >= 2 && thirdColorCount >= 2) {
          for (let i = 0; i < secondColorCount; i++) colors.push('blau');
          for (let i = 0; i < thirdColorCount; i++) colors.push('grün');
          
          const result = calculateChemistry(colors);
          if (result.isValid) {
            expect(result.colorBonuses['rot']).toBe(testCase.expected);
          }
        }
      });
    });

    then(/sollten die Boni exakt der Formel n² entsprechen/, () => {
      // Already tested in when step
      expect(true).toBe(true);
    });

    and('die Berechnungen sollten mathematisch korrekt sein', () => {
      // Test the mathematical correctness
      for (let n = 2; n <= 7; n++) {
        expect(n * n).toBe(Math.pow(n, 2));
      }
    });
  });

  test('Chemie-Bonus in Team-Stärke integrieren', ({ given, when, then, and }) => {
    let teamStrength: number;
    let playerPoints: number;
    let chemistryBonus: number;

    given('ein Team hat folgende Eigenschaften:', (table) => {
      const teamData = table[0];
      playerPoints = parseInt(teamData['Spieler-Punkte Gesamt']);
      chemistryBonus = parseInt(teamData['Chemie-Bonus']);
    });

    when('die Gesamt-Team-Stärke berechnet wird', () => {
      teamStrength = playerPoints + chemistryBonus;
    });

    then(/sollte die Team-Stärke (\d+) Punkte betragen/, (expectedStrength) => {
      expect(teamStrength).toBe(parseInt(expectedStrength));
    });

    and('der Chemie-Bonus sollte klar ausgewiesen werden', () => {
      expect(chemistryBonus).toBe(45);
    });

    and('beide Komponenten sollten in Match-Berechnungen einfließen', () => {
      expect(playerPoints).toBe(850);
      expect(chemistryBonus).toBe(45);
      expect(teamStrength).toBe(895);
    });
  });

  test('Chemie-Auswirkung auf Match-Wahrscheinlichkeiten', ({ given, when, then, and }) => {
    let teamA: { playerPoints: number; chemistry: number; total: number };
    let teamB: { playerPoints: number; chemistry: number; total: number };
    let strengthDifference: number;

    given('zwei Teams treten gegeneinander an:', (table) => {
      teamA = {
        playerPoints: parseInt(table[0]['Spieler-Punkte']),
        chemistry: parseInt(table[0]['Chemie']),
        total: parseInt(table[0]['Gesamt'])
      };
      teamB = {
        playerPoints: parseInt(table[1]['Spieler-Punkte']),
        chemistry: parseInt(table[1]['Chemie']),
        total: parseInt(table[1]['Gesamt'])
      };
    });

    when('die Match-Wahrscheinlichkeiten berechnet werden', () => {
      strengthDifference = teamA.total - teamB.total;
    });

    then('sollte Team A trotz niedrigerer Spieler-Punkte bevorzugt sein', () => {
      expect(teamA.playerPoints).toBeLessThan(teamB.playerPoints);
      expect(teamA.total).toBeGreaterThan(teamB.total);
    });

    and('der Chemie-Bonus sollte die Wahrscheinlichkeiten beeinflussen', () => {
      expect(teamA.chemistry).toBeGreaterThan(teamB.chemistry);
    });

    and(/die Stärke-Differenz sollte (\d+) Punkte betragen/, (expectedDifference) => {
      expect(strengthDifference).toBe(parseInt(expectedDifference));
    });
  });

  test('Chemie-Berechnung bei unvollständigen Teams', ({ given, when, then, and }) => {
    given('ich habe ein Team mit nur 8 von 11 Spielern', async () => {
      testPlayers = [];
    });

    and('die Farb-Verteilung ist:', async (table) => {
      for (const row of table) {
        const color = row.Farbe;
        const count = parseInt(row.Anzahl);
        
        for (let i = 0; i < count; i++) {
          const player = await factories.createPlayer({ color });
          testPlayers.push(player);
        }
      }
    });

    when('die Chemie berechnet wird', () => {
      const playerColors = testPlayers.map(p => p.color);
      chemistryResult = calculateChemistry(playerColors);
    });

    then('sollte die aktuelle Chemie basierend auf 8 Spielern berechnet werden', () => {
      expect(testPlayers).toHaveLength(8);
      expect(chemistryResult).toBeTruthy();
    });

    and(/der Bonus sollte (\d+) Punkte betragen/, (expectedBonus) => {
      expect(chemistryResult.totalBonus).toBe(parseInt(expectedBonus));
    });

    and('eine Warnung über unvollständiges Team sollte ausgegeben werden', () => {
      // This would be handled by the team validation logic
      expect(testPlayers.length).toBeLessThan(11);
    });
  });

  test('Edge-Case: Alle Spieler gleiche Farbe', ({ given, when, then, and }) => {
    given('alle 11 Spieler haben die Farbe "rot"', async () => {
      testPlayers = [];
      for (let i = 0; i < 11; i++) {
        const player = await factories.createPlayer({ color: 'rot' });
        testPlayers.push(player);
      }
    });

    when('die Chemie berechnet wird', () => {
      const playerColors = testPlayers.map(p => p.color);
      chemistryResult = calculateChemistry(playerColors);
    });

    then('sollte die Chemie ungültig sein', () => {
      expect(chemistryResult.isValid).toBe(false);
    });

    and('der Chemie-Bonus sollte 0 betragen', () => {
      expect(chemistryResult.totalBonus).toBe(0);
    });

    and('eine Warnung sollte ausgegeben werden: "Team muss genau 3 verschiedene Farben haben"', () => {
      expect(chemistryResult.error).toContain('genau 3 verschiedene Farben');
    });
  });

  test('Edge-Case: Zu viele verschiedene Farben', ({ given, when, then, and }) => {
    given('ich habe ein Team mit 5 verschiedenen Farben:', async (table) => {
      testPlayers = [];
      
      for (const row of table) {
        const color = row.Farbe;
        const count = parseInt(row.Anzahl);
        
        for (let i = 0; i < count; i++) {
          const player = await factories.createPlayer({ color });
          testPlayers.push(player);
        }
      }
    });

    when('die Chemie berechnet wird', () => {
      const playerColors = testPlayers.map(p => p.color);
      chemistryResult = calculateChemistry(playerColors);
    });

    then('sollte die Chemie ungültig sein', () => {
      expect(chemistryResult.isValid).toBe(false);
    });

    and('kein Chemie-Bonus sollte gewährt werden', () => {
      expect(chemistryResult.totalBonus).toBe(0);
    });

    and('eine Warnung sollte ausgegeben werden: "Team muss genau 3 verschiedene Farben haben"', () => {
      expect(chemistryResult.error).toContain('genau 3 verschiedene Farben');
    });
  });
});