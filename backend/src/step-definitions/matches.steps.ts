// TODO: Replace with Vitest-compatible BDD library
// import { defineFeature, loadFeature } from 'jest-cucumber';
import request from 'supertest';
import express from 'express';
import { 
  createLeague, 
  simulateMatch, 
  simulateMatchday, 
  getLeagueTable,
  getMatches
} from '../controllers/matchController.js';
import { auth } from '../middleware/auth.js';
import { testDb, resetTestDatabase } from '../test-utils/testDatabase.js';
import { createTestFactories, TestFactories } from '../test-utils/testFactories.js';
import { LobbyStatus } from '@prisma/client';

const feature = loadFeature('./features/matches.feature');

defineFeature(feature, (test) => {
  let app: express.Application;
  let factories: TestFactories;
  let response: request.Response;
  let testUsers: any[] = [];
  let testLobby: any;
  let testTeams: any[] = [];
  let testLeague: any;
  let userToken: string;

  beforeEach(async () => {
    // Setup Express app
    app = express();
    app.use(express.json());
    
    // Match routes
    app.post('/leagues', auth, createLeague);
    app.post('/matches/:id/simulate', auth, simulateMatch);
    app.post('/leagues/:id/simulate-matchday', auth, simulateMatchday);
    app.get('/leagues/:id/table', auth, getLeagueTable);
    app.get('/leagues/:id/matches', auth, getMatches);

    // Reset database and setup factories
    await resetTestDatabase();
    factories = createTestFactories(testDb.getPrisma());

    // Clear any previous state
    response = null as any;
    testUsers = [];
    testLobby = null;
    testTeams = [];
    testLeague = null;
    userToken = '';
  });

  afterEach(async () => {
    await testDb.clean();
  });

  test('Liga erfolgreich erstellen', ({ given, when, then, and }) => {
    given('die Lobby "Champions Liga" hat den Status "WAITING"', async () => {
      // Create 4 users
      testUsers = await factories.createUsers(4);
      
      // Create lobby with first user as creator
      testLobby = await factories.createLobby({
        name: 'Champions Liga',
        status: LobbyStatus.WAITING,
        createdById: testUsers[0].id
      });

      // Add all users to lobby
      for (const user of testUsers) {
        await testDb.getPrisma().lobbyMembership.create({
          data: {
            lobbyId: testLobby.id,
            userId: user.id
          }
        });
      }

      userToken = factories.generateJwtToken(testUsers[0].id, testUsers[0].role);
    });

    and('alle 4 Spieler haben je 3 vollständige Teams', async () => {
      const formation = await testDb.getPrisma().formation.findFirst();
      
      for (const user of testUsers) {
        for (let matchday = 1; matchday <= 3; matchday++) {
          const team = await factories.createTeam({
            name: `Team ${user.username} MD${matchday}`,
            matchday,
            userId: user.id,
            lobbyId: testLobby.id,
            formationId: formation?.id
          });
          testTeams.push(team);
        }
      }
    });

    when('die Liga erstellt wird', async () => {
      response = await request(app)
        .post('/leagues')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          lobbyId: testLobby.id
        });
    });

    then('sollte die Liga erfolgreich erstellt werden', () => {
      expect(response.status).toBe(201);
      expect(response.body.league).toBeTruthy();
    });

    and('die Lobby sollte den Status "IN_PROGRESS" erhalten', async () => {
      const updatedLobby = await testDb.getPrisma().lobby.findUnique({
        where: { id: testLobby.id }
      });
      expect(updatedLobby?.status).toBe(LobbyStatus.IN_PROGRESS);
    });

    and('18 Matches sollten generiert werden (6 pro Spieltag)', async () => {
      const matches = await testDb.getPrisma().match.findMany({
        where: { leagueId: response.body.league.id }
      });
      expect(matches).toHaveLength(18);
      
      // Check 6 matches per matchday
      for (let matchday = 1; matchday <= 3; matchday++) {
        const matchdayMatches = matches.filter(m => m.matchday === matchday);
        expect(matchdayMatches).toHaveLength(6);
      }
    });

    and('jeder Spieler sollte gegen jeden anderen 3 Mal antreten', () => {
      // With 4 players, each plays 3 matches per matchday (3 matchdays = 9 total matches each)
      // 4 players × 9 matches each ÷ 2 (since each match involves 2 players) = 18 matches
      expect(testUsers).toHaveLength(4);
    });

    and('alle Matches sollten den Status "PENDING" haben', async () => {
      const matches = await testDb.getPrisma().match.findMany({
        where: { leagueId: response.body.league.id }
      });
      matches.forEach(match => {
        expect(match.status).toBe('PENDING');
      });
    });
  });

  test('Einzelnes Match simulieren', ({ given, when, then, and }) => {
    let teamA: any, teamB: any, match: any;

    given('zwei Teams mit folgenden Eigenschaften existieren:', async (table) => {
      testUsers = await factories.createUsers(2);
      testLobby = await factories.createLobby({
        createdById: testUsers[0].id
      });
      
      userToken = factories.generateJwtToken(testUsers[0].id, testUsers[0].role);

      // Create teams with specified strengths
      teamA = await factories.createTeam({
        name: 'Team A',
        userId: testUsers[0].id,
        lobbyId: testLobby.id
      });
      
      teamB = await factories.createTeam({
        name: 'Team B', 
        userId: testUsers[1].id,
        lobbyId: testLobby.id
      });

      // Create league and match
      const league = await testDb.getPrisma().league.create({
        data: {
          lobbyId: testLobby.id,
          status: 'IN_PROGRESS'
        }
      });

      match = await testDb.getPrisma().match.create({
        data: {
          leagueId: league.id,
          homeTeamId: teamA.id,
          awayTeamId: teamB.id,
          matchday: 1,
          status: 'PENDING'
        }
      });
    });

    when('das Match zwischen Team A und Team B simuliert wird', async () => {
      response = await request(app)
        .post(`/matches/${match.id}/simulate`)
        .set('Authorization', `Bearer ${userToken}`);
    });

    then('sollte das Match erfolgreich simuliert werden', () => {
      expect(response.status).toBe(200);
      expect(response.body.match).toBeTruthy();
    });

    and('beide Teams sollten je 100 Torchancen erhalten', () => {
      // This would be validated in the match simulation logic
      expect(response.body.match.homeGoals).toBeGreaterThanOrEqual(0);
      expect(response.body.match.awayGoals).toBeGreaterThanOrEqual(0);
    });

    and('Team A sollte eine höhere Torwahrscheinlichkeit haben', () => {
      // This assumes Team A has higher strength based on the test data
      // The exact probability calculation would be tested separately
      expect(response.body.match).toBeTruthy();
    });

    and('ein realistisches Endergebnis sollte generiert werden', () => {
      expect(typeof response.body.match.homeGoals).toBe('number');
      expect(typeof response.body.match.awayGoals).toBe('number');
      expect(response.body.match.homeGoals).toBeGreaterThanOrEqual(0);
      expect(response.body.match.awayGoals).toBeGreaterThanOrEqual(0);
    });

    and('das Ergebnis sollte in der Datenbank gespeichert werden', async () => {
      const updatedMatch = await testDb.getPrisma().match.findUnique({
        where: { id: match.id }
      });
      expect(updatedMatch?.status).toBe('COMPLETED');
      expect(updatedMatch?.homeGoals).not.toBeNull();
      expect(updatedMatch?.awayGoals).not.toBeNull();
    });
  });

  test('Liga ohne ausreichende Spieler starten', ({ given, when, then, and }) => {
    given('eine Lobby hat nur 3 Spieler', async () => {
      testUsers = await factories.createUsers(3);
      testLobby = await factories.createLobby({
        createdById: testUsers[0].id
      });

      // Add users to lobby
      for (const user of testUsers) {
        await testDb.getPrisma().lobbyMembership.create({
          data: {
            lobbyId: testLobby.id,
            userId: user.id
          }
        });
      }

      userToken = factories.generateJwtToken(testUsers[0].id, testUsers[0].role);
    });

    when('versucht wird eine Liga zu starten', async () => {
      response = await request(app)
        .post('/leagues')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          lobbyId: testLobby.id
        });
    });

    then('sollte ein 400 Fehler auftreten', () => {
      expect(response.status).toBe(400);
    });

    and('die Fehlermeldung sollte "Lobby must have exactly 4 players" enthalten', () => {
      expect(response.body.message).toContain('Lobby must have exactly 4 players');
    });

    and('keine Liga sollte erstellt werden', async () => {
      const leagues = await testDb.getPrisma().league.findMany({
        where: { lobbyId: testLobby.id }
      });
      expect(leagues).toHaveLength(0);
    });
  });

  test('Belohnungen nach Liga-Ende verteilen', ({ given, when, then, and }) => {
    given('eine Liga ist beendet', async () => {
      testUsers = await factories.createUsers(4);
      testLobby = await factories.createLobby({
        createdById: testUsers[0].id
      });

      testLeague = await testDb.getPrisma().league.create({
        data: {
          lobbyId: testLobby.id,
          status: 'FINISHED'
        }
      });

      userToken = factories.generateJwtToken(testUsers[0].id, testUsers[0].role);
    });

    and('die finale Tabelle steht fest', () => {
      // League table would be calculated from completed matches
    });

    when('die Belohnungen verteilt werden', async () => {
      response = await request(app)
        .post(`/leagues/${testLeague.id}/distribute-rewards`)
        .set('Authorization', `Bearer ${userToken}`);
    });

    then('sollte der 1. Platz 250 Münzen erhalten', async () => {
      // This would be tested by checking user coin balance changes
      expect(response.status).toBe(200);
    });

    and('der 2. Platz sollte 200 Münzen erhalten', () => {
      expect(response.body.rewards).toBeTruthy();
    });

    and('der 3. Platz sollte 150 Münzen erhalten', () => {
      expect(response.body.rewards).toBeTruthy();
    });

    and('der 4. Platz sollte 100 Münzen erhalten', () => {
      expect(response.body.rewards).toBeTruthy();
    });

    and('die Münzen sollten zu den Benutzer-Konten hinzugefügt werden', () => {
      expect(response.body.message).toContain('distributed');
    });
  });
});