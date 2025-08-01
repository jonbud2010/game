// TODO: Replace with Vitest-compatible BDD library
// import { defineFeature, loadFeature } from 'jest-cucumber';
import request from 'supertest';
import express from 'express';
import { register, login } from '../controllers/authController.js';
import { auth, requireAdmin } from '../middleware/auth.js';
import { testDb, resetTestDatabase } from '../test-utils/testDatabase.js';
import { createTestFactories, TestFactories } from '../test-utils/testFactories.js';
import { Role } from '@prisma/client';
import jwt from 'jsonwebtoken';

const feature = loadFeature('./features/authentifizierung.feature');

defineFeature(feature, (test) => {
  let app: express.Application;
  let factories: TestFactories;
  let response: request.Response;
  let testUser: any;
  let testAdmin: any;
  let userToken: string;
  let adminToken: string;

  beforeEach(async () => {
    // Setup Express app
    app = express();
    app.use(express.json());
    
    // Auth routes
    app.post('/auth/register', register);
    app.post('/auth/login', login);
    
    // Protected routes for testing
    app.get('/protected', auth, (req, res) => {
      res.json({ message: 'Access granted', user: (req as any).user });
    });
    
    app.get('/admin', auth, requireAdmin, (req, res) => {
      res.json({ message: 'Admin access granted', user: (req as any).user });
    });

    // Reset database and setup factories
    await resetTestDatabase();
    factories = createTestFactories(testDb.getPrisma());

    // Clear any previous state
    response = null as any;
    testUser = null;
    testAdmin = null;
    userToken = '';
    adminToken = '';
  });

  afterEach(async () => {
    await testDb.clean();
  });

  test('Erfolgreiche Benutzerregistrierung', ({ given, when, then, and }) => {
    given('ich bin ein neuer Benutzer', () => {
      // Test user will be created in the when step
    });

    when('ich mich mit gültigen Daten registriere:', async (table) => {
      const userData = table[0];
      response = await request(app)
        .post('/auth/register')
        .send({
          username: userData.Benutzername,
          email: userData['E-Mail'],
          password: userData.Passwort
        });
    });

    then('sollte ich eine Erfolgsmeldung erhalten', () => {
      expect(response.status).toBe(201);
      expect(response.body.message).toContain('successfully');
    });

    and('ein neuer Benutzer sollte in der Datenbank erstellt werden', async () => {
      const user = await testDb.getPrisma().user.findUnique({
        where: { email: 'max@example.com' }
      });
      expect(user).toBeTruthy();
      expect(user?.username).toBe('max.mustermann');
    });

    and('das Passwort sollte gehashed gespeichert werden', async () => {
      const user = await testDb.getPrisma().user.findUnique({
        where: { email: 'max@example.com' }
      });
      expect(user?.password).not.toBe('Sicher123!');
      expect(user?.password.length).toBeGreaterThan(20);
    });

    and('der Benutzer sollte die Rolle "USER" haben', async () => {
      const user = await testDb.getPrisma().user.findUnique({
        where: { email: 'max@example.com' }
      });
      expect(user?.role).toBe(Role.USER);
    });

    and('ich sollte 1000 Münzen als Startkapital erhalten', async () => {
      const user = await testDb.getPrisma().user.findUnique({
        where: { email: 'max@example.com' }
      });
      expect(user?.coins).toBe(1000);
    });
  });

  test('Registrierung mit bereits existierender E-Mail', ({ given, when, then, and }) => {
    given('ein Benutzer mit der E-Mail "existing@example.com" existiert bereits', async () => {
      await factories.createUser({
        email: 'existing@example.com',
        username: 'existing.user'
      });
    });

    when('ich versuche mich mit dieser E-Mail zu registrieren:', async (table) => {
      const userData = table[0];
      response = await request(app)
        .post('/auth/register')
        .send({
          username: userData.Benutzername,
          email: userData['E-Mail'],
          password: userData.Passwort
        });
    });

    then('sollte ich einen 400 Fehler erhalten', () => {
      expect(response.status).toBe(400);
    });

    and('die Fehlermeldung sollte "User with this email or username already exists" enthalten', () => {
      expect(response.body.message).toContain('User with this email or username already exists');
    });

    and('kein neuer Benutzer sollte erstellt werden', async () => {
      const users = await testDb.getPrisma().user.findMany({
        where: { email: 'existing@example.com' }
      });
      expect(users).toHaveLength(1); // Only the original user
    });
  });

  test('Registrierung mit bereits existierendem Benutzernamen', ({ given, when, then, and }) => {
    given('ein Benutzer mit dem Benutzernamen "existing.user" existiert bereits', async () => {
      await factories.createUser({
        username: 'existing.user',
        email: 'existing@example.com'
      });
    });

    when('ich versuche mich mit diesem Benutzernamen zu registrieren:', async (table) => {
      const userData = table[0];
      response = await request(app)
        .post('/auth/register')
        .send({
          username: userData.Benutzername,
          email: userData['E-Mail'],
          password: userData.Passwort
        });
    });

    then('sollte ich einen 400 Fehler erhalten', () => {
      expect(response.status).toBe(400);
    });

    and('die Fehlermeldung sollte "User with this email or username already exists" enthalten', () => {
      expect(response.body.message).toContain('User with this email or username already exists');
    });
  });

  test('Registrierung mit ungültigen Daten', ({ given, when, then, and }) => {
    given('ich bin ein neuer Benutzer', () => {
      // Setup for invalid data test
    });

    when('ich versuche mich mit ungültigen Daten zu registrieren:', async (table) => {
      const userData = table[0];
      response = await request(app)
        .post('/auth/register')
        .send({
          username: userData.Benutzername || '',
          email: userData['E-Mail'] || '',
          password: userData.Passwort || ''
        });
    });

    then('sollte ich einen 400 Validierungsfehler erhalten', () => {
      expect(response.status).toBe(400);
    });

    and('eine entsprechende Fehlermeldung sollte angezeigt werden', () => {
      expect(response.body.message).toBeTruthy();
    });
  });

  test('Erfolgreiche Benutzeranmeldung', ({ given, when, then, and }) => {
    given('ein Benutzer mit folgenden Daten existiert:', async (table) => {
      const userData = table[0];
      testUser = await factories.createUser({
        username: userData.Benutzername,
        email: userData['E-Mail'],
        password: userData.Passwort,
        role: userData.Rolle as Role
      });
    });

    when('ich mich mit korrekten Anmeldedaten anmelde:', async (table) => {
      const loginData = table[0];
      response = await request(app)
        .post('/auth/login')
        .send({
          email: loginData['E-Mail'],
          password: loginData.Passwort
        });
    });

    then('sollte ich eine Erfolgsmeldung erhalten', () => {
      expect(response.status).toBe(200);
      expect(response.body.message).toContain('success');
    });

    and('ich sollte einen gültigen JWT-Token erhalten', () => {
      expect(response.body.token).toBeTruthy();
      const decoded = jwt.verify(response.body.token, process.env.JWT_SECRET || 'test-jwt-secret');
      expect(decoded).toBeTruthy();
    });

    and('der Token sollte die Benutzer-ID enthalten', () => {
      const decoded = jwt.decode(response.body.token) as any;
      expect(decoded.userId).toBe(testUser.id);
    });

    and('die Antwort sollte die Benutzerinformationen enthalten', () => {
      expect(response.body.user).toBeTruthy();
      expect(response.body.user.id).toBe(testUser.id);
      expect(response.body.user.username).toBe(testUser.username);
    });
  });

  test('Anmeldung mit falscher E-Mail', ({ given, when, then, and }) => {
    given('ein Benutzer existiert', async () => {
      testUser = await factories.createUser();
    });

    when('ich versuche mich mit einer nicht existierenden E-Mail anzumelden:', async (table) => {
      const loginData = table[0];
      response = await request(app)
        .post('/auth/login')
        .send({
          email: loginData['E-Mail'],
          password: loginData.Passwort
        });
    });

    then('sollte ich einen 401 Fehler erhalten', () => {
      expect(response.status).toBe(401);
    });

    and('die Fehlermeldung sollte "Invalid credentials" enthalten', () => {
      expect(response.body.message).toContain('Invalid credentials');
    });

    and('ich sollte keinen Token erhalten', () => {
      expect(response.body.token).toBeUndefined();
    });
  });

  test('Anmeldung mit falschem Passwort', ({ given, when, then, and }) => {
    given('ein Benutzer mit der E-Mail "test@example.com" existiert', async () => {
      testUser = await factories.createUser({
        email: 'test@example.com',
        password: 'CorrectPassword123!'
      });
    });

    when('ich versuche mich mit einem falschen Passwort anzumelden:', async (table) => {
      const loginData = table[0];
      response = await request(app)
        .post('/auth/login')
        .send({
          email: loginData['E-Mail'],
          password: loginData.Passwort
        });
    });

    then('sollte ich einen 401 Fehler erhalten', () => {
      expect(response.status).toBe(401);
    });

    and('die Fehlermeldung sollte "Invalid credentials" enthalten', () => {
      expect(response.body.message).toContain('Invalid credentials');
    });
  });

  test('Zugriff auf geschützte Route mit gültigem Token', ({ given, when, then, and }) => {
    given('ich bin als Benutzer angemeldet', async () => {
      testUser = await factories.createUser();
    });

    and('ich habe einen gültigen JWT-Token', () => {
      userToken = factories.generateJwtToken(testUser.id, testUser.role);
    });

    when('ich eine geschützte Route mit dem Token aufrufe', async () => {
      response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${userToken}`);
    });

    then('sollte ich Zugriff erhalten', () => {
      expect(response.status).toBe(200);
    });

    and('die Anfrage sollte die Benutzerinformationen enthalten', () => {
      expect(response.body.user).toBeTruthy();
      expect(response.body.user.userId).toBe(testUser.id);
    });
  });

  test('Zugriff auf geschützte Route ohne Token', ({ given, when, then, and }) => {
    given('ich bin nicht angemeldet', () => {
      // No token will be provided
    });

    when('ich eine geschützte Route ohne Token aufrufe', async () => {
      response = await request(app)
        .get('/protected');
    });

    then('sollte ich einen 401 Fehler erhalten', () => {
      expect(response.status).toBe(401);
    });

    and('die Fehlermeldung sollte "Access token required" enthalten', () => {
      expect(response.body.message).toContain('Access token required');
    });
  });

  test('Zugriff auf geschützte Route mit ungültigem Token', ({ given, when, then, and }) => {
    given('ich habe einen ungültigen oder abgelaufenen Token', () => {
      userToken = 'invalid.jwt.token';
    });

    when('ich eine geschützte Route mit diesem Token aufrufe', async () => {
      response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${userToken}`);
    });

    then('sollte ich einen 403 Fehler erhalten', () => {
      expect(response.status).toBe(403);
    });

    and('die Fehlermeldung sollte "Invalid or expired token" enthalten', () => {
      expect(response.body.message).toContain('Invalid or expired token');
    });
  });

  test('Admin-Zugriff mit USER-Rolle', ({ given, when, then, and }) => {
    given('ich bin als normaler Benutzer (USER) angemeldet', async () => {
      testUser = await factories.createUser({ role: Role.USER });
      userToken = factories.generateJwtToken(testUser.id, testUser.role);
    });

    when('ich versuche auf eine Admin-Route zuzugreifen', async () => {
      response = await request(app)
        .get('/admin')
        .set('Authorization', `Bearer ${userToken}`);
    });

    then('sollte ich einen 403 Fehler erhalten', () => {
      expect(response.status).toBe(403);
    });

    and('die Fehlermeldung sollte "Admin access required" enthalten', () => {
      expect(response.body.message).toContain('Admin access required');
    });
  });

  test('Admin-Zugriff mit ADMIN-Rolle', ({ given, when, then, and }) => {
    given('ich bin als Administrator (ADMIN) angemeldet', async () => {
      testAdmin = await factories.createAdmin();
      adminToken = factories.generateJwtToken(testAdmin.id, testAdmin.role);
    });

    when('ich eine Admin-Route aufrufe', async () => {
      response = await request(app)
        .get('/admin')
        .set('Authorization', `Bearer ${adminToken}`);
    });

    then('sollte ich Zugriff erhalten', () => {
      expect(response.status).toBe(200);
    });

    and('die Admin-Funktionen sollten verfügbar sein', () => {
      expect(response.body.message).toContain('Admin access granted');
      expect(response.body.user.role).toBe('ADMIN');
    });
  });
});