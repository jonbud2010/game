// TODO: Replace with Vitest-compatible BDD library
// import { defineFeature, loadFeature } from 'jest-cucumber';
import request from 'supertest';
import express from 'express';
import { 
  createTeam, 
  getTeams, 
  getTeam, 
  updateTeam, 
  deleteTeam,
  addPlayerToTeam,
  removePlayerFromTeam
} from '../controllers/teamController.js';
import { auth } from '../middleware/auth.js';
import { testDb, resetTestDatabase } from '../test-utils/testDatabase.js';
import { createTestFactories, TestFactories } from '../test-utils/testFactories.js';

const feature = loadFeature('./features/teams.feature');

defineFeature(feature, (test) => {
  let app: express.Application;
  let factories: TestFactories;
  let response: request.Response;
  let testUser: any;
  let testLobby: any;
  let testTeam: any;
  let testPlayers: any[] = [];
  let userToken: string;

  beforeEach(async () => {
    // Setup Express app
    app = express();
    app.use(express.json());
    
    // Team routes
    app.post('/teams', auth, createTeam);
    app.get('/teams', auth, getTeams);
    app.get('/teams/:id', auth, getTeam);
    app.put('/teams/:id', auth, updateTeam);
    app.delete('/teams/:id', auth, deleteTeam);
    app.post('/teams/:id/players', auth, addPlayerToTeam);
    app.delete('/teams/:teamId/players/:playerId', auth, removePlayerFromTeam);

    // Reset database and setup factories
    await resetTestDatabase();
    factories = createTestFactories(testDb.getPrisma());

    // Clear any previous state
    response = null as any;
    testUser = null;
    testLobby = null;
    testTeam = null;
    testPlayers = [];
    userToken = '';
  });

  afterEach(async () => {
    await testDb.clean();
  });

  test('Neues Team erfolgreich erstellen', ({ given, when, then, and }) => {
    given('ich habe keine Teams für die aktuelle Lobby', async () => {
      testUser = await factories.createUser();
      testLobby = await factories.createLobby({
        createdById: testUser.id
      });
      userToken = factories.generateJwtToken(testUser.id, testUser.role);
    });

    and('eine Formation "4-3-3" existiert', async () => {
      // Formation should exist from seeding
      const formation = await testDb.getPrisma().formation.findFirst({
        where: { name: '4-3-3' }
      });
      expect(formation).toBeTruthy();
    });

    when('ich ein neues Team erstelle mit:', async (table) => {
      const teamData = table[0];
      const formation = await testDb.getPrisma().formation.findFirst({
        where: { name: teamData.Formation }
      });

      response = await request(app)
        .post('/teams')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: teamData.Name,
          formationId: formation?.id,
          matchday: parseInt(teamData.Spieltag),
          lobbyId: testLobby.id
        });
    });

    then('sollte das Team erfolgreich erstellt werden', () => {
      expect(response.status).toBe(201);
      expect(response.body.team).toBeTruthy();
    });

    and('das Team sollte in der Datenbank gespeichert werden', async () => {
      const team = await testDb.getPrisma().team.findUnique({
        where: { id: response.body.team.id }
      });
      expect(team).toBeTruthy();
    });

    and('das Team sollte der aktuellen Lobby zugeordnet werden', async () => {
      const team = await testDb.getPrisma().team.findUnique({
        where: { id: response.body.team.id }
      });
      expect(team?.lobbyId).toBe(testLobby.id);
    });

    and('alle 11 Positionen sollten zunächst leer sein', async () => {
      const teamPlayers = await testDb.getPrisma().teamPlayer.findMany({
        where: { teamId: response.body.team.id }
      });
      expect(teamPlayers).toHaveLength(0);
    });
  });

  test('Vollständiges Team mit gültiger Chemie aufstellen', ({ given, when, then, and }) => {
    given('ich habe ein Team "Chemistry Team"', async () => {
      testUser = await factories.createUser();
      testLobby = await factories.createLobby({
        createdById: testUser.id
      });
      testTeam = await factories.createTeam({
        name: 'Chemistry Team',
        userId: testUser.id,
        lobbyId: testLobby.id
      });
      userToken = factories.generateJwtToken(testUser.id, testUser.role);
    });

    and('ich besitze 11 Spieler mit folgenden Farben:', async (table) => {
      testPlayers = [];
      for (const row of table) {
        const player = await factories.createPlayer({
          name: row.Spieler,
          position: row.Position,
          color: row.Farbe
        });
        testPlayers.push(player);
      }
    });

    when('ich alle Spieler auf die entsprechenden Positionen setze', async () => {
      for (let i = 0; i < testPlayers.length; i++) {
        await request(app)
          .post(`/teams/${testTeam.id}/players`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            playerId: testPlayers[i].id,
            position: i
          });
      }

      response = await request(app)
        .get(`/teams/${testTeam.id}`)
        .set('Authorization', `Bearer ${userToken}`);
    });

    then('sollte das Team vollständig besetzt sein', () => {
      expect(response.status).toBe(200);
      expect(response.body.team.players).toHaveLength(11);
    });

    and('die Chemie sollte gültig sein (3 Farben, je min. 2 Spieler)', () => {
      const colors = response.body.team.players.map((tp: any) => tp.player.color);
      const colorCounts = colors.reduce((counts: any, color: string) => {
        counts[color] = (counts[color] || 0) + 1;
        return counts;
      }, {});
      
      const uniqueColors = Object.keys(colorCounts);
      expect(uniqueColors).toHaveLength(3);
      
      uniqueColors.forEach(color => {
        expect(colorCounts[color]).toBeGreaterThanOrEqual(2);
      });
    });

    and('der Chemie-Bonus sollte berechnet werden', () => {
      expect(response.body.team.chemistryBonus).toBeGreaterThan(0);
    });

    and('die Gesamt-Team-Stärke sollte korrekt kalkuliert werden', () => {
      expect(response.body.team.totalStrength).toBeGreaterThan(0);
    });
  });

  test('Team für bereits existierenden Spieltag erstellen', ({ given, when, then, and }) => {
    given('ich habe bereits ein Team für Spieltag 1', async () => {
      testUser = await factories.createUser(); 
      testLobby = await factories.createLobby({
        createdById: testUser.id
      });
      
      await factories.createTeam({
        matchday: 1,
        userId: testUser.id,
        lobbyId: testLobby.id
      });
      
      userToken = factories.generateJwtToken(testUser.id, testUser.role);
    });

    when('ich versuche ein weiteres Team für Spieltag 1 zu erstellen', async () => {
      const formation = await testDb.getPrisma().formation.findFirst();
      
      response = await request(app)
        .post('/teams')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Second Team',
          formationId: formation?.id,
          matchday: 1,
          lobbyId: testLobby.id
        });
    });

    then('sollte ich einen 400 Fehler erhalten', () => {
      expect(response.status).toBe(400);
    });

    and('die Fehlermeldung sollte "Team for this matchday already exists" enthalten', () => {
      expect(response.body.message).toContain('Team for this matchday already exists');
    });

    and('kein zusätzliches Team sollte erstellt werden', async () => {
      const teams = await testDb.getPrisma().team.findMany({
        where: {
          userId: testUser.id,
          lobbyId: testLobby.id,
          matchday: 1
        }
      });
      expect(teams).toHaveLength(1);
    });
  });
});