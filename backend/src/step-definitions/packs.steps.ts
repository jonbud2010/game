import { defineFeature, loadFeature } from 'jest-cucumber';
import request from 'supertest';
import express from 'express';
import { 
  createPack, 
  getPacks, 
  getPack, 
  updatePack, 
  deletePack,
  addPlayerToPack,
  removePlayerFromPack,
  purchasePack,
  openPack
} from '../controllers/packController.js';
import { auth, requireAdmin } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { testDb, resetTestDatabase } from '../test-utils/testDatabase.js';
import { createTestFactories, TestFactories } from '../test-utils/testFactories.js';
import { Role } from '@prisma/client';

const feature = loadFeature('./features/packs.feature');

defineFeature(feature, (test) => {
  let app: express.Application;
  let factories: TestFactories;
  let response: request.Response;
  let testAdmin: any;
  let testUser: any;
  let testPack: any;
  let testPlayers: any[] = [];
  let adminToken: string;
  let userToken: string;

  beforeEach(async () => {
    // Setup Express app
    app = express();
    app.use(express.json());
    
    // Pack routes
    app.post('/packs', auth, requireAdmin, upload.single('image'), createPack);
    app.get('/packs', auth, getPacks);
    app.get('/packs/:id', auth, getPack);
    app.put('/packs/:id', auth, requireAdmin, upload.single('image'), updatePack);
    app.delete('/packs/:id', auth, requireAdmin, deletePack);
    app.post('/packs/:id/players', auth, requireAdmin, addPlayerToPack);
    app.delete('/packs/:packId/players/:playerId', auth, requireAdmin, removePlayerFromPack);
    app.post('/packs/:id/purchase', auth, purchasePack);
    app.post('/packs/:id/open', auth, openPack);

    // Reset database and setup factories
    await resetTestDatabase();
    factories = createTestFactories(testDb.getPrisma());

    // Clear any previous state
    response = null as any;
    testAdmin = null;
    testUser = null;
    testPack = null;
    testPlayers = [];
    adminToken = '';
    userToken = '';
  });

  afterEach(async () => {
    await testDb.clean();
  });

  test('Neuen Pack als Administrator erstellen', ({ given, when, then, and }) => {
    given('ich bin als Administrator angemeldet', async () => {
      testAdmin = await factories.createAdmin();
      adminToken = factories.generateJwtToken(testAdmin.id, testAdmin.role);
    });

    when('ich einen neuen Pack erstelle mit folgenden Daten:', async (table) => {
      const packData = table[0];
      response = await request(app)
        .post('/packs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: packData.Name,
          price: parseInt(packData.Preis),
          status: packData.Status
        });
    });

    then('sollte der Pack erfolgreich erstellt werden', () => {
      expect(response.status).toBe(201);
      expect(response.body.pack).toBeTruthy();
    });

    and('der Pack sollte in der Datenbank gespeichert werden', async () => {
      const pack = await testDb.getPrisma().pack.findUnique({
        where: { id: response.body.pack.id }
      });
      expect(pack).toBeTruthy();
    });

    and('der Pack sollte eine eindeutige ID erhalten', () => {
      expect(response.body.pack.id).toBeTruthy();
    });

    and('der Pack sollte anfangs einen leeren Spielerpool haben', async () => {
      const packPlayers = await testDb.getPrisma().packPlayer.findMany({
        where: { packId: response.body.pack.id }
      });
      expect(packPlayers).toHaveLength(0);
    });
  });

  test('Pack erfolgreich kaufen', ({ given, when, then, and }) => {
    given('ein Benutzer mit 500 Münzen existiert', async () => {
      testUser = await factories.createUser({ coins: 500 });
      userToken = factories.generateJwtToken(testUser.id, testUser.role);
    });

    and('ein Pack "Bronze Pack" für 100 Münzen existiert', async () => {
      testPack = await factories.createPack({
        name: 'Bronze Pack',
        price: 100,
        status: 'ACTIVE'
      });
    });

    and('der Pack hat den Status "ACTIVE"', async () => {
      const pack = await testDb.getPrisma().pack.findUnique({
        where: { id: testPack.id }
      });
      expect(pack?.status).toBe('ACTIVE');
    });

    and('ich bin als dieser Benutzer angemeldet', () => {
      // Already set up in the first given step
    });

    when('ich den Pack "Bronze Pack" kaufe', async () => {
      response = await request(app)
        .post(`/packs/${testPack.id}/purchase`)
        .set('Authorization', `Bearer ${userToken}`);
    });

    then('sollte der Kauf erfolgreich sein', () => {
      expect(response.status).toBe(200);
      expect(response.body.message).toContain('purchased');
    });

    and('100 Münzen sollten von meinem Konto abgezogen werden', async () => {
      const updatedUser = await testDb.getPrisma().user.findUnique({
        where: { id: testUser.id }
      });
      expect(updatedUser?.coins).toBe(400);
    });

    and('ich sollte 400 Münzen übrig haben', async () => {
      const updatedUser = await testDb.getPrisma().user.findUnique({
        where: { id: testUser.id }
      });
      expect(updatedUser?.coins).toBe(400);
    });

    and('der Kaufvorgang sollte protokolliert werden', () => {
      expect(response.body.purchase).toBeTruthy();
    });
  });

  test('Pack kaufen ohne ausreichende Münzen', ({ given, when, then, and }) => {
    given('ein Benutzer mit 50 Münzen existiert', async () => {
      testUser = await factories.createUser({ coins: 50 });
      userToken = factories.generateJwtToken(testUser.id, testUser.role);
    });

    and('ein Pack "Gold Pack" für 200 Münzen existiert', async () => {
      testPack = await factories.createPack({
        name: 'Gold Pack',
        price: 200,
        status: 'ACTIVE'
      });
    });

    and('ich bin als dieser Benutzer angemeldet', () => {
      // Already set up in the first given step
    });

    when('ich versuche den Pack "Gold Pack" zu kaufen', async () => {
      response = await request(app)
        .post(`/packs/${testPack.id}/purchase`)
        .set('Authorization', `Bearer ${userToken}`);
    });

    then('sollte ich einen 400 Fehler erhalten', () => {
      expect(response.status).toBe(400);
    });

    and('die Fehlermeldung sollte "Insufficient coins" enthalten', () => {
      expect(response.body.message).toContain('Insufficient coins');
    });

    and('meine Münzanzahl sollte unverändert bleiben', async () => {
      const unchangedUser = await testDb.getPrisma().user.findUnique({
        where: { id: testUser.id }
      });
      expect(unchangedUser?.coins).toBe(50);
    });

    and('kein Kauf sollte protokolliert werden', async () => {
      const purchases = await testDb.getPrisma().userPlayer.findMany({
        where: { userId: testUser.id }
      });
      expect(purchases).toHaveLength(0);
    });
  });

  test('Spieler zu Pack hinzufügen', ({ given, when, then, and }) => {
    given('ein Pack "Starter Pack" existiert', async () => {
      testPack = await factories.createPack({ name: 'Starter Pack' });
    });

    and('ein Spieler "Lionel Messi" mit 5% Prozentsatz existiert', async () => {
      const player = await factories.createPlayer({
        name: 'Lionel Messi',
        percentage: 0.05
      });
      testPlayers.push(player);
    });

    and('ich bin als Administrator angemeldet', async () => {
      testAdmin = await factories.createAdmin();
      adminToken = factories.generateJwtToken(testAdmin.id, testAdmin.role);
    });

    when('ich den Spieler "Lionel Messi" zum Pack "Starter Pack" hinzufüge', async () => {
      response = await request(app)
        .post(`/packs/${testPack.id}/players`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          playerId: testPlayers[0].id
        });
    });

    then('sollte der Spieler erfolgreich zum Pack hinzugefügt werden', () => {
      expect(response.status).toBe(200);
      expect(response.body.message).toContain('added');
    });

    and('der Spielerpool sollte den Spieler enthalten', async () => {
      const packPlayer = await testDb.getPrisma().packPlayer.findFirst({
        where: {
          packId: testPack.id,
          playerId: testPlayers[0].id
        }
      });
      expect(packPlayer).toBeTruthy();
    });

    and('die Wahrscheinlichkeitsberechnung sollte aktualisiert werden', () => {
      expect(response.body.pack.totalProbability).toBeGreaterThan(0);
    });
  });

  test('Pack-Erstellung ohne Admin-Berechtigung', ({ given, when, then, and }) => {
    given('ich bin als normaler Benutzer angemeldet', async () => {
      testUser = await factories.createUser({ role: Role.USER });
      userToken = factories.generateJwtToken(testUser.id, testUser.role);
    });

    when('ich versuche einen neuen Pack zu erstellen', async () => {
      response = await request(app)
        .post('/packs')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Unauthorized Pack',
          price: 100,
          status: 'ACTIVE'
        });
    });

    then('sollte ich einen 403 Fehler erhalten', () => {
      expect(response.status).toBe(403);
    });

    and('die Fehlermeldung sollte "Admin access required" enthalten', () => {
      expect(response.body.message).toContain('Admin access required');
    });

    and('kein Pack sollte erstellt werden', async () => {
      const packs = await testDb.getPrisma().pack.findMany();
      expect(packs).toHaveLength(0);
    });
  });
});