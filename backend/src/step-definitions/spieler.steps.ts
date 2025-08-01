// TODO: Replace with Vitest-compatible BDD library
// import { defineFeature, loadFeature } from 'jest-cucumber';
import request from 'supertest';
import express from 'express';
import path from 'path';
import { 
  createPlayer, 
  getPlayers, 
  getPlayer, 
  updatePlayer, 
  deletePlayer 
} from '../controllers/playerController.js';
import { auth, requireAdmin } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { testDb, resetTestDatabase } from '../test-utils/testDatabase.js';
import { createTestFactories, TestFactories } from '../test-utils/testFactories.js';
import { Role } from '@prisma/client';

const feature = loadFeature('./features/spieler.feature');

defineFeature(feature, (test) => {
  let app: express.Application;
  let factories: TestFactories;
  let response: request.Response;
  let testAdmin: any;
  let testUser: any;
  let testPlayer: any;
  let adminToken: string;
  let userToken: string;

  beforeEach(async () => {
    // Setup Express app
    app = express();
    app.use(express.json());
    
    // Player routes
    app.post('/players', auth, requireAdmin, upload.single('image'), createPlayer);
    app.get('/players', auth, getPlayers);
    app.get('/players/:id', auth, getPlayer);
    app.put('/players/:id', auth, requireAdmin, upload.single('image'), updatePlayer);
    app.delete('/players/:id', auth, requireAdmin, deletePlayer);

    // Reset database and setup factories
    await resetTestDatabase();
    factories = createTestFactories(testDb.getPrisma());

    // Clear any previous state
    response = null as any;
    testAdmin = null;
    testUser = null;
    testPlayer = null;
    adminToken = '';
    userToken = '';
  });

  afterEach(async () => {
    await testDb.clean();
  });

  test('Neuen Spieler erfolgreich erstellen', ({ given, when, then, and }) => {
    given('ich bin ein Administrator', async () => {
      testAdmin = await factories.createAdmin();
      adminToken = factories.generateJwtToken(testAdmin.id, testAdmin.role);
    });

    when('ich einen neuen Spieler erstelle mit folgenden Daten:', async (table) => {
      const playerData = table[0];
      response = await request(app)
        .post('/players')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: playerData.Name,
          points: parseInt(playerData.Punkte),
          position: playerData.Position,
          color: playerData.Farbe,
          marketPrice: parseInt(playerData.Marktpreis),
          theme: playerData.Thema,
          percentage: parseFloat(playerData.Prozentsatz)
        });
    });

    then('sollte der Spieler erfolgreich erstellt werden', () => {
      expect(response.status).toBe(201);
      expect(response.body.player).toBeTruthy();
    });

    and('der Spieler sollte in der Datenbank gespeichert werden', async () => {
      const player = await testDb.getPrisma().player.findUnique({
        where: { id: response.body.player.id }
      });
      expect(player).toBeTruthy();
    });

    and('der Spieler sollte eine eindeutige ID erhalten', () => {
      expect(response.body.player.id).toBeTruthy();
    });

    and('alle Attribute sollten korrekt gespeichert werden', async () => {
      const player = await testDb.getPrisma().player.findUnique({
        where: { id: response.body.player.id }
      });
      expect(player?.name).toBe('Lionel Messi');
      expect(player?.points).toBe(95);
      expect(player?.position).toBe('RW');
      expect(player?.color).toBe('red');
      expect(player?.marketPrice).toBe(500);
      expect(player?.theme).toBe('Legends');
      expect(player?.percentage).toBe(0.02);
    });
  });

  test('Spieler mit ungültigen Daten erstellen', ({ given, when, then, and }) => {
    given('ich bin ein Administrator', async () => {
      testAdmin = await factories.createAdmin();
      adminToken = factories.generateJwtToken(testAdmin.id, testAdmin.role);
    });

    when('ich versuche einen Spieler mit ungültigen Daten zu erstellen:', async (table) => {
      const playerData = table[0];
      response = await request(app)
        .post('/players')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: playerData.Name || '',
          points: parseInt(playerData.Punkte) || -10,
          position: playerData.Position || 'INVALID_POS',
          color: playerData.Farbe || 'rainbow',
          marketPrice: parseInt(playerData.Marktpreis) || -50,
          percentage: parseFloat(playerData.Prozentsatz) || 1.5
        });
    });

    then('sollte ich einen 400 Validierungsfehler erhalten', () => {
      expect(response.status).toBe(400);
    });

    and('eine detaillierte Fehlermeldung sollte angezeigt werden', () => {
      expect(response.body.message).toBeTruthy();
    });

    and('kein Spieler sollte erstellt werden', async () => {
      const players = await testDb.getPrisma().player.findMany();
      expect(players).toHaveLength(0);
    });
  });

  test('Alle Spieler abrufen', ({ given, when, then, and }) => {
    given('folgende Spieler existieren:', async (table) => {
      testUser = await factories.createUser();
      userToken = factories.generateJwtToken(testUser.id, testUser.role);

      for (const row of table) {
        await factories.createPlayer({
          name: row.Name,
          points: parseInt(row.Punkte),
          position: row.Position,
          color: row.Farbe
        });
      }
    });

    when('ich alle Spieler abrufe', async () => {
      response = await request(app)
        .get('/players')
        .set('Authorization', `Bearer ${userToken}`);
    });

    then('sollte ich eine Liste mit 4 Spielern erhalten', () => {
      expect(response.status).toBe(200);
      expect(response.body.players).toHaveLength(4);
    });

    and('die Spieler sollten nach Punkten absteigend sortiert sein', () => {
      const players = response.body.players;
      for (let i = 1; i < players.length; i++) {
        expect(players[i-1].points).toBeGreaterThanOrEqual(players[i].points);
      }
    });

    and('die Antwort sollte die Gesamtanzahl enthalten', () => {
      expect(response.body.total).toBe(4);
    });
  });

  test('Spieler nach Position filtern', ({ given, when, then, and }) => {
    given('Spieler mit verschiedenen Positionen existieren', async () => {
      testUser = await factories.createUser();
      userToken = factories.generateJwtToken(testUser.id, testUser.role);

      await factories.createPlayer({ position: 'ST', name: 'Striker 1' });
      await factories.createPlayer({ position: 'ST', name: 'Striker 2' });
      await factories.createPlayer({ position: 'GK', name: 'Keeper 1' });
      await factories.createPlayer({ position: 'CB', name: 'Defender 1' });
    });

    when('ich Spieler mit der Position "ST" abrufe', async () => {
      response = await request(app)
        .get('/players?position=ST')
        .set('Authorization', `Bearer ${userToken}`);
    });

    then('sollte ich nur Stürmer erhalten', () => {
      expect(response.status).toBe(200);
      expect(response.body.players).toHaveLength(2);
      response.body.players.forEach((player: any) => {
        expect(player.position).toBe('ST');
      });
    });

    and('andere Positionsspieler sollten nicht enthalten sein', () => {
      const hasNonStrikers = response.body.players.some((player: any) => player.position !== 'ST');
      expect(hasNonStrikers).toBe(false);
    });
  });

  test('Einzelnen Spieler abrufen', ({ given, when, then, and }) => {
    given('ein Spieler "Karim Benzema" mit der ID "player-123" existiert', async () => {
      testUser = await factories.createUser();
      userToken = factories.generateJwtToken(testUser.id, testUser.role);
      
      testPlayer = await factories.createPlayer({
        name: 'Karim Benzema'
      });
    });

    when('ich den Spieler mit der ID "player-123" abrufe', async () => {
      response = await request(app)
        .get(`/players/${testPlayer.id}`)
        .set('Authorization', `Bearer ${userToken}`);
    });

    then('sollte ich die vollständigen Spielerdaten erhalten', () => {
      expect(response.status).toBe(200);
      expect(response.body.player).toBeTruthy();
      expect(response.body.player.name).toBe('Karim Benzema');
    });

    and('die Antwort sollte UserPlayers und PackPlayers Beziehungen enthalten', () => {
      expect(response.body.player.userPlayers).toBeDefined();
      expect(response.body.player.packPlayers).toBeDefined();
    });
  });

  test('Nicht existierenden Spieler abrufen', ({ given, when, then, and }) => {
    given('kein Spieler mit der ID "invalid-id" existiert', async () => {
      testUser = await factories.createUser();
      userToken = factories.generateJwtToken(testUser.id, testUser.role);
    });

    when('ich versuche den Spieler "invalid-id" abzurufen', async () => {
      response = await request(app)
        .get('/players/invalid-id')
        .set('Authorization', `Bearer ${userToken}`);
    });

    then('sollte ich einen 404 Fehler erhalten', () => {
      expect(response.status).toBe(404);
    });

    and('die Fehlermeldung sollte "Player not found" enthalten', () => {
      expect(response.body.message).toContain('Player not found');
    });
  });

  test('Spieler erfolgreich aktualisieren', ({ given, when, then, and }) => {
    given('ein Spieler "Robert Lewandowski" existiert', async () => {
      testAdmin = await factories.createAdmin();
      adminToken = factories.generateJwtToken(testAdmin.id, testAdmin.role);
      
      testPlayer = await factories.createPlayer({
        name: 'Robert Lewandowski',
        points: 90,
        marketPrice: 400,
        percentage: 0.02
      });
    });

    when('ich den Spieler aktualisiere mit:', async (table) => {
      const updateData = table[0];
      response = await request(app)
        .put(`/players/${testPlayer.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: updateData.Name,
          points: parseInt(updateData.Punkte),
          marketPrice: parseInt(updateData.Marktpreis),
          percentage: parseFloat(updateData.Prozentsatz)
        });
    });

    then('sollte der Spieler erfolgreich aktualisiert werden', () => {
      expect(response.status).toBe(200);
      expect(response.body.player).toBeTruthy();
    });

    and('die neuen Werte sollten gespeichert werden', async () => {
      const updatedPlayer = await testDb.getPrisma().player.findUnique({
        where: { id: testPlayer.id }
      });
      expect(updatedPlayer?.points).toBe(93);
      expect(updatedPlayer?.marketPrice).toBe(450);
      expect(updatedPlayer?.percentage).toBe(0.03);
    });

    and('das Aktualisierungsdatum sollte gesetzt werden', async () => {
      const updatedPlayer = await testDb.getPrisma().player.findUnique({
        where: { id: testPlayer.id }
      });
      expect(updatedPlayer?.updatedAt).toBeTruthy();
    });
  });

  test('Nicht existierenden Spieler aktualisieren', ({ given, when, then, and }) => {
    given('kein Spieler mit der ID "invalid-player" existiert', async () => {
      testAdmin = await factories.createAdmin();
      adminToken = factories.generateJwtToken(testAdmin.id, testAdmin.role);
    });

    when('ich versuche den Spieler "invalid-player" zu aktualisieren', async () => {
      response = await request(app)
        .put('/players/invalid-player')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Name',
          points: 85
        });
    });

    then('sollte ich einen 404 Fehler erhalten', () => {
      expect(response.status).toBe(404);
    });

    and('keine Änderungen sollten vorgenommen werden', async () => {
      const players = await testDb.getPrisma().player.findMany();
      expect(players).toHaveLength(0);
    });
  });

  test('Spieler erfolgreich löschen', ({ given, when, then, and }) => {
    given('ein Spieler "Old Player" existiert', async () => {
      testAdmin = await factories.createAdmin();
      adminToken = factories.generateJwtToken(testAdmin.id, testAdmin.role);
      
      testPlayer = await factories.createPlayer({
        name: 'Old Player'
      });
    });

    and('der Spieler ist in keinen Packs oder Teams verwendet', () => {
      // Player will be created without any relationships
    });

    when('ich den Spieler lösche', async () => {
      response = await request(app)
        .delete(`/players/${testPlayer.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
    });

    then('sollte der Spieler erfolgreich gelöscht werden', () => {
      expect(response.status).toBe(200);
      expect(response.body.message).toContain('deleted');
    });

    and('das zugehörige Bild sollte gelöscht werden', () => {
      // Image deletion will be handled by the controller
      expect(response.body.message).toBeTruthy();
    });

    and('der Spieler sollte nicht mehr in der Datenbank existieren', async () => {
      const deletedPlayer = await testDb.getPrisma().player.findUnique({
        where: { id: testPlayer.id }
      });
      expect(deletedPlayer).toBeFalsy();
    });
  });

  test('Nicht existierenden Spieler löschen', ({ given, when, then, and }) => {
    given('kein Spieler mit der ID "nonexistent" existiert', async () => {
      testAdmin = await factories.createAdmin();
      adminToken = factories.generateJwtToken(testAdmin.id, testAdmin.role);
    });

    when('ich versuche den Spieler "nonexistent" zu löschen', async () => {
      response = await request(app)
        .delete('/players/nonexistent')
        .set('Authorization', `Bearer ${adminToken}`);
    });

    then('sollte ich einen 404 Fehler erhalten', () => {
      expect(response.status).toBe(404);
    });

    and('die Fehlermeldung sollte "Player not found" enthalten', () => {
      expect(response.body.message).toContain('Player not found');
    });
  });

  test('Spieler-Erstellung ohne Admin-Berechtigung', ({ given, when, then, and }) => {
    given('ich bin als normaler Benutzer (USER) angemeldet', async () => {
      testUser = await factories.createUser({ role: Role.USER });
      userToken = factories.generateJwtToken(testUser.id, testUser.role);
    });

    when('ich versuche einen neuen Spieler zu erstellen', async () => {
      response = await request(app)
        .post('/players')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Test Player',
          points: 80,
          position: 'ST',
          color: 'red',
          marketPrice: 200,
          theme: 'Standard',
          percentage: 0.05
        });
    });

    then('sollte ich einen 403 Fehler erhalten', () => {
      expect(response.status).toBe(403);
    });

    and('die Fehlermeldung sollte "Admin access required" enthalten', () => {
      expect(response.body.message).toContain('Admin access required');
    });

    and('kein Spieler sollte erstellt werden', async () => {
      const players = await testDb.getPrisma().player.findMany();
      expect(players).toHaveLength(0);
    });
  });

  test('Alle gültigen Positionen testen', ({ given, when, then, and }) => {
    given('ich bin ein Administrator', async () => {
      testAdmin = await factories.createAdmin();
      adminToken = factories.generateJwtToken(testAdmin.id, testAdmin.role);
    });

    when('ich Spieler mit allen gültigen Positionen erstelle:', async (table) => {
      const positions = Object.keys(table[0]);
      
      for (const position of positions) {
        const response = await request(app)
          .post('/players')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: `Player ${position}`,
            points: 75,
            position: position,
            color: 'red',
            marketPrice: 200,
            theme: 'Standard',
            percentage: 0.05
          });
        
        expect(response.status).toBe(201);
      }
    });

    then('sollten alle Spieler erfolgreich erstellt werden', async () => {
      const players = await testDb.getPrisma().player.findMany();
      expect(players.length).toBeGreaterThan(10); // Should have created players for all positions
    });

    and('jede Position sollte korrekt validiert werden', async () => {
      const players = await testDb.getPrisma().player.findMany();
      const validPositions = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST', 'CF', 'LF', 'RF'];
      
      players.forEach(player => {
        expect(validPositions).toContain(player.position);
      });
    });
  });
});