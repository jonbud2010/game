import { defineFeature, loadFeature } from 'jest-cucumber';
import request from 'supertest';
import express from 'express';
import { 
  createLobby, 
  joinLobby, 
  leaveLobby, 
  getLobbies, 
  getLobby 
} from '../controllers/lobbyController.js';
import { auth } from '../middleware/auth.js';
import { testDb, resetTestDatabase } from '../test-utils/testDatabase.js';
import { createTestFactories, TestFactories } from '../test-utils/testFactories.js';
import { LobbyStatus } from '@prisma/client';

const feature = loadFeature('./features/lobbies.feature');

defineFeature(feature, (test) => {
  let app: express.Application;
  let factories: TestFactories;
  let response: request.Response;
  let testUser: any;
  let testUsers: any[] = [];
  let testLobby: any;
  let userToken: string;
  let userTokens: string[] = [];

  beforeEach(async () => {
    // Setup Express app
    app = express();
    app.use(express.json());
    
    // Lobby routes
    app.post('/lobbies', auth, createLobby);
    app.post('/lobbies/:id/join', auth, joinLobby);
    app.post('/lobbies/:id/leave', auth, leaveLobby);
    app.get('/lobbies', auth, getLobbies);
    app.get('/lobbies/:id', auth, getLobby);

    // Reset database and setup factories
    await resetTestDatabase();
    factories = createTestFactories(testDb.getPrisma());

    // Clear any previous state
    response = null as any;
    testUser = null;
    testUsers = [];
    testLobby = null;
    userToken = '';
    userTokens = [];
  });

  afterEach(async () => {
    await testDb.clean();
  });

  test('Neue Lobby erstellen', ({ given, when, then, and }) => {
    given('ich bin ein angemeldeter Benutzer', async () => {
      testUser = await factories.createUser();
      userToken = factories.generateJwtToken(testUser.id, testUser.role);
    });

    when('ich eine neue Lobby erstelle mit folgenden Daten:', async (table) => {
      const lobbyData = table[0];
      response = await request(app)
        .post('/lobbies')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: lobbyData.Name,
          maxPlayers: parseInt(lobbyData['Max Spieler'])
        });
    });

    then('sollte die Lobby erfolgreich erstellt werden', () => {
      expect(response.status).toBe(201);
      expect(response.body.lobby).toBeTruthy();
    });

    and('ich sollte automatisch der Lobby beitreten', async () => {
      const lobby = await testDb.getPrisma().lobby.findUnique({
        where: { id: response.body.lobby.id },
        include: { memberships: true }
      });
      expect(lobby?.memberships).toHaveLength(1);
      expect(lobby?.memberships[0].userId).toBe(testUser.id);
    });

    and('die Lobby sollte den Status "WAITING" haben', () => {
      expect(response.body.lobby.status).toBe(LobbyStatus.WAITING);
    });

    and('ich sollte der einzige Spieler in der Lobby sein', () => {
      expect(response.body.lobby.currentPlayers).toBe(1);
    });

    and('die Lobby sollte in der Lobbyliste erscheinen', async () => {
      const lobbiesResponse = await request(app)
        .get('/lobbies')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(lobbiesResponse.status).toBe(200);
      expect(lobbiesResponse.body.lobbies).toHaveLength(1);
      expect(lobbiesResponse.body.lobbies[0].id).toBe(response.body.lobby.id);
    });
  });

  test('Lobby mit ungültigem Namen erstellen', ({ given, when, then, and }) => {
    given('ich bin ein angemeldeter Benutzer', async () => {
      testUser = await factories.createUser();
      userToken = factories.generateJwtToken(testUser.id, testUser.role);
    });

    when('ich versuche eine Lobby mit leerem Namen zu erstellen', async () => {
      response = await request(app)
        .post('/lobbies')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: '',
          maxPlayers: 4
        });
    });

    then('sollte ich einen 400 Validierungsfehler erhalten', () => {
      expect(response.status).toBe(400);
    });

    and('eine entsprechende Fehlermeldung sollte angezeigt werden', () => {
      expect(response.body.message).toBeTruthy();
    });

    and('keine Lobby sollte erstellt werden', async () => {
      const lobbies = await testDb.getPrisma().lobby.findMany();
      expect(lobbies).toHaveLength(0);
    });
  });

  test('Lobby mit falscher Spielerzahl erstellen', ({ given, when, then, and }) => {
    given('ich bin ein angemeldeter Benutzer', async () => {
      testUser = await factories.createUser();
      userToken = factories.generateJwtToken(testUser.id, testUser.role);
    });

    when('ich versuche eine Lobby mit 3 maximalen Spielern zu erstellen', async () => {
      response = await request(app)
        .post('/lobbies')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Test Lobby',
          maxPlayers: 3
        });
    });

    then('sollte ich einen 400 Validierungsfehler erhalten', () => {
      expect(response.status).toBe(400);
    });

    and('die Fehlermeldung sollte "Max players must be exactly 4" enthalten', () => {
      expect(response.body.message).toContain('Max players must be exactly 4');
    });
  });

  test('Erfolgreicher Beitritt zu einer Lobby', ({ given, when, then, and }) => {
    given('eine Lobby "Premiere League" mit 1 Spieler existiert', async () => {
      const creator = await factories.createUser();
      testLobby = await factories.createLobby({
        name: 'Premiere League',
        createdById: creator.id
      });
      
      // Add creator to lobby
      await testDb.getPrisma().lobbyMembership.create({
        data: {
          lobbyId: testLobby.id,
          userId: creator.id
        }
      });
    });

    and('die Lobby hat den Status "WAITING"', async () => {
      const lobby = await testDb.getPrisma().lobby.findUnique({
        where: { id: testLobby.id }
      });
      expect(lobby?.status).toBe(LobbyStatus.WAITING);
    });

    when('ich der Lobby beitrete', async () => {
      testUser = await factories.createUser();
      userToken = factories.generateJwtToken(testUser.id, testUser.role);
      
      response = await request(app)
        .post(`/lobbies/${testLobby.id}/join`)
        .set('Authorization', `Bearer ${userToken}`);
    });

    then('sollte ich erfolgreich der Lobby beitreten', () => {
      expect(response.status).toBe(200);
      expect(response.body.message).toContain('joined');
    });

    and('die Lobby sollte nun 2 Spieler haben', async () => {
      const lobby = await testDb.getPrisma().lobby.findUnique({
        where: { id: testLobby.id },
        include: { memberships: true }
      });
      expect(lobby?.memberships).toHaveLength(2);
    });

    and('die Lobby sollte immer noch den Status "WAITING" haben', async () => {
      const lobby = await testDb.getPrisma().lobby.findUnique({
        where: { id: testLobby.id }
      });
      expect(lobby?.status).toBe(LobbyStatus.WAITING);
    });

    and('ich sollte in der Mitgliederliste erscheinen', async () => {
      const membership = await testDb.getPrisma().lobbyMembership.findFirst({
        where: {
          lobbyId: testLobby.id,
          userId: testUser.id
        }
      });
      expect(membership).toBeTruthy();
    });
  });

  test('Beitritt zu einer vollen Lobby', ({ given, when, then, and }) => {
    given('eine Lobby "Champions League" mit 4 Spielern existiert', async () => {
      const { lobby } = await factories.createLobbyWithMembers(4, {
        name: 'Champions League'
      });
      testLobby = lobby;
    });

    and('die Lobby hat den Status "WAITING"', async () => {
      const lobby = await testDb.getPrisma().lobby.findUnique({
        where: { id: testLobby.id }
      });
      expect(lobby?.status).toBe(LobbyStatus.WAITING);
    });

    when('ich versuche der Lobby beizutreten', async () => {
      testUser = await factories.createUser();
      userToken = factories.generateJwtToken(testUser.id, testUser.role);
      
      response = await request(app)
        .post(`/lobbies/${testLobby.id}/join`)
        .set('Authorization', `Bearer ${userToken}`);
    });

    then('sollte ich einen 400 Fehler erhalten', () => {
      expect(response.status).toBe(400);
    });

    and('die Fehlermeldung sollte "Lobby is full" enthalten', () => {
      expect(response.body.message).toContain('Lobby is full');
    });

    and('ich sollte nicht der Lobby beitreten', async () => {
      const membership = await testDb.getPrisma().lobbyMembership.findFirst({
        where: {
          lobbyId: testLobby.id,
          userId: testUser.id
        }
      });
      expect(membership).toBeFalsy();
    });
  });

  test('Beitritt zu einer nicht existierenden Lobby', ({ given, when, then, and }) => {
    given('keine Lobby mit der ID "non-existent-id" existiert', () => {
      // No lobby will be created
    });

    when('ich versuche der Lobby "non-existent-id" beizutreten', async () => {
      testUser = await factories.createUser();
      userToken = factories.generateJwtToken(testUser.id, testUser.role);
      
      response = await request(app)
        .post('/lobbies/non-existent-id/join')
        .set('Authorization', `Bearer ${userToken}`);
    });

    then('sollte ich einen 404 Fehler erhalten', () => {
      expect(response.status).toBe(404);
    });

    and('die Fehlermeldung sollte "Lobby not found" enthalten', () => {
      expect(response.body.message).toContain('Lobby not found');
    });
  });

  test('Beitritt zu einer bereits gestarteten Lobby', ({ given, when, then, and }) => {
    given('eine Lobby "Europa League" mit dem Status "IN_PROGRESS" existiert', async () => {
      testLobby = await factories.createLobby({
        name: 'Europa League',
        status: LobbyStatus.IN_PROGRESS
      });
    });

    when('ich versuche dieser Lobby beizutreten', async () => {
      testUser = await factories.createUser();
      userToken = factories.generateJwtToken(testUser.id, testUser.role);
      
      response = await request(app)
        .post(`/lobbies/${testLobby.id}/join`)
        .set('Authorization', `Bearer ${userToken}`);
    });

    then('sollte ich einen 400 Fehler erhalten', () => {
      expect(response.status).toBe(400);
    });

    and('die Fehlermeldung sollte "Cannot join lobby that is not waiting" enthalten', () => {
      expect(response.body.message).toContain('Cannot join lobby that is not waiting');
    });
  });

  test('Doppelter Beitritt zur gleichen Lobby', ({ given, when, then, and }) => {
    given('ich bin bereits Mitglied der Lobby "La Liga"', async () => {
      testUser = await factories.createUser();
      testLobby = await factories.createLobby({
        name: 'La Liga',
        createdById: testUser.id
      });
      
      await testDb.getPrisma().lobbyMembership.create({
        data: {
          lobbyId: testLobby.id,
          userId: testUser.id
        }
      });
      
      userToken = factories.generateJwtToken(testUser.id, testUser.role);
    });

    when('ich versuche erneut der Lobby "La Liga" beizutreten', async () => {
      response = await request(app)
        .post(`/lobbies/${testLobby.id}/join`)
        .set('Authorization', `Bearer ${userToken}`);
    });

    then('sollte ich einen 400 Fehler erhalten', () => {
      expect(response.status).toBe(400);
    });

    and('die Fehlermeldung sollte "Already a member of this lobby" enthalten', () => {
      expect(response.body.message).toContain('Already a member of this lobby');
    });

    and('die Anzahl der Spieler sollte unverändert bleiben', async () => {
      const lobby = await testDb.getPrisma().lobby.findUnique({
        where: { id: testLobby.id },
        include: { memberships: true }
      });
      expect(lobby?.memberships).toHaveLength(1);
    });
  });

  test('Verlassen einer Lobby', ({ given, when, then, and }) => {
    given('ich bin Mitglied der Lobby "Serie A"', async () => {
      testUser = await factories.createUser();
      testLobby = await factories.createLobby({
        name: 'Serie A',
        createdById: testUser.id
      });
      
      await testDb.getPrisma().lobbyMembership.create({
        data: {
          lobbyId: testLobby.id,
          userId: testUser.id
        }
      });
      
      userToken = factories.generateJwtToken(testUser.id, testUser.role);
    });

    and('die Lobby hat 3 Spieler', async () => {
      // Add 2 more users
      for (let i = 0; i < 2; i++) {
        const user = await factories.createUser();
        await testDb.getPrisma().lobbyMembership.create({
          data: {
            lobbyId: testLobby.id,
            userId: user.id
          }
        });
      }
    });

    when('ich die Lobby verlasse', async () => {
      response = await request(app)
        .post(`/lobbies/${testLobby.id}/leave`)
        .set('Authorization', `Bearer ${userToken}`);
    });

    then('sollte ich erfolgreich die Lobby verlassen', () => {
      expect(response.status).toBe(200);
      expect(response.body.message).toContain('left');
    });

    and('die Lobby sollte nur noch 2 Spieler haben', async () => {
      const lobby = await testDb.getPrisma().lobby.findUnique({
        where: { id: testLobby.id },
        include: { memberships: true }
      });
      expect(lobby?.memberships).toHaveLength(2);
    });

    and('ich sollte nicht mehr in der Mitgliederliste stehen', async () => {
      const membership = await testDb.getPrisma().lobbyMembership.findFirst({
        where: {
          lobbyId: testLobby.id,
          userId: testUser.id
        }
      });
      expect(membership).toBeFalsy();
    });

    and('die Lobby sollte den Status "WAITING" behalten', async () => {
      const lobby = await testDb.getPrisma().lobby.findUnique({
        where: { id: testLobby.id }
      });
      expect(lobby?.status).toBe(LobbyStatus.WAITING);
    });
  });

  test('Verlassen einer Lobby als letzter Spieler', ({ given, when, then, and }) => {
    given('ich bin das einzige Mitglied der Lobby "Ligue 1"', async () => {
      testUser = await factories.createUser();
      testLobby = await factories.createLobby({
        name: 'Ligue 1',
        createdById: testUser.id
      });
      
      await testDb.getPrisma().lobbyMembership.create({
        data: {
          lobbyId: testLobby.id,
          userId: testUser.id
        }
      });
      
      userToken = factories.generateJwtToken(testUser.id, testUser.role);
    });

    when('ich die Lobby verlasse', async () => {
      response = await request(app)
        .post(`/lobbies/${testLobby.id}/leave`)
        .set('Authorization', `Bearer ${userToken}`);
    });

    then('sollte ich erfolgreich die Lobby verlassen', () => {
      expect(response.status).toBe(200);
    });

    and('die Lobby sollte gelöscht werden', async () => {
      const lobby = await testDb.getPrisma().lobby.findUnique({
        where: { id: testLobby.id }
      });
      expect(lobby).toBeFalsy();
    });

    and('die Lobby sollte nicht mehr in der Lobbyliste erscheinen', async () => {
      const lobbiesResponse = await request(app)
        .get('/lobbies')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(lobbiesResponse.status).toBe(200);
      expect(lobbiesResponse.body.lobbies).toHaveLength(0);
    });
  });

  test('Alle verfügbaren Lobbies abrufen', ({ given, when, then, and }) => {
    given('folgende Lobbies existieren:', async (table) => {
      testUser = await factories.createUser();
      userToken = factories.generateJwtToken(testUser.id, testUser.role);

      for (const row of table) {
        const lobby = await factories.createLobby({
          name: row.Name,
          status: row.Status as LobbyStatus
        });

        // Add members to lobbies
        const memberCount = parseInt(row.Spieler);
        for (let i = 0; i < memberCount; i++) {
          const user = await factories.createUser();
          await testDb.getPrisma().lobbyMembership.create({
            data: {
              lobbyId: lobby.id,
              userId: user.id
            }
          });
        }
      }
    });

    when('ich alle Lobbies abrufe', async () => {
      response = await request(app)
        .get('/lobbies')
        .set('Authorization', `Bearer ${userToken}`);
    });

    then('sollte ich eine Liste mit 3 Lobbies erhalten', () => {
      expect(response.status).toBe(200);
      expect(response.body.lobbies).toHaveLength(3);
    });

    and('nur Lobbies mit dem Status "WAITING" sollten angezeigt werden', () => {
      response.body.lobbies.forEach((lobby: any) => {
        expect(lobby.status).toBe(LobbyStatus.WAITING);
      });
    });

    and('die Lobbies sollten nach Erstellungsdatum sortiert sein (neueste zuerst)', () => {
      const lobbies = response.body.lobbies;
      for (let i = 1; i < lobbies.length; i++) {
        const currentDate = new Date(lobbies[i-1].createdAt);
        const nextDate = new Date(lobbies[i].createdAt);
        expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime());
      }
    });

    and('jede Lobby sollte folgende Informationen enthalten:', (table) => {
      const expectedFields = table.map(row => row.Feld);
      response.body.lobbies.forEach((lobby: any) => {
        expectedFields.forEach(field => {
          switch (field) {
            case 'ID':
              expect(lobby.id).toBeTruthy();
              break;
            case 'Name':
              expect(lobby.name).toBeTruthy();
              break;
            case 'Aktuelle Spieler':
              expect(typeof lobby.currentPlayers).toBe('number');
              break;
            case 'Max Spieler':
              expect(lobby.maxPlayers).toBe(4);
              break;
            case 'Status':
              expect(lobby.status).toBeTruthy();
              break;
            case 'Mitgliederliste':
              expect(Array.isArray(lobby.members)).toBe(true);
              break;
          }
        });
      });
    });
  });
});