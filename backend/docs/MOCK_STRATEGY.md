# Mock Strategy Documentation

## Übersicht
Diese Dokumentation definiert die Mocking-Strategie für das Football Trading Card Game Backend Testing Framework.

## Test Kategorien

### 1. Unit Tests (Mocked Dependencies)
**Ziel**: Isolierte Tests einzelner Komponenten mit gemockten Abhängigkeiten

#### Controller Tests
- **Was wird gemockt**: Prisma Client, bcrypt, JWT, File System
- **Was wird real getestet**: Controller-Logik, Request/Response Handling, Validation
- **Beispiel**: `authController.test.ts`
```typescript
vi.mock('../db/connection.js', () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      create: vi.fn()
    }
  }
}));
```

#### Middleware Tests
- **Was wird gemockt**: Database calls, External APIs
- **Was wird real getestet**: Middleware-Logik, Request transformation, Error handling
- **Beispiel**: `auth.middleware.test.ts`

#### Utilities Tests
- **Was wird gemockt**: Nichts (reine Funktionen)
- **Was wird real getestet**: Chemie-Berechnungen, Match-Engine, Business Logic

### 2. Integration Tests (Real Database)
**Ziel**: End-to-End API Testing mit echter SQLite Test-Datenbank

#### Was wird NICHT gemockt:
- Prisma Client (nutzt echte Test-DB)
- Database Operations
- File System Operations (in Test-Verzeichnis)
- JWT Token Generation/Validation

#### Was wird gemockt:
- External APIs (falls vorhanden)
- Email Services (falls vorhanden)  
- Cloud Storage (falls vorhanden)

### 3. BDD Gherkin Tests
**Ziel**: Business-Readable Acceptance Tests

#### Test Setup:
- **Database**: Real SQLite Test-DB mit Transaction Rollback
- **Authentication**: Real JWT Tokens
- **File Uploads**: Test File System
- **Business Logic**: Real Implementation

## Mocking Guidelines

### Prisma Client Mocking
```typescript
// Unit Tests - Mock Prisma
vi.mock('../db/connection.js', () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn()
    }
  }
}));

// Integration Tests - Real Prisma with Test DB
import { testDb } from '../test-utils/testDatabase.js';
const prisma = testDb.getPrisma();
```

### bcrypt Mocking
```typescript
// Unit Tests
vi.mock('bcryptjs', () => ({
  hash: vi.fn().mockResolvedValue('hashed-password'),
  compare: vi.fn().mockResolvedValue(true)
}));

// Integration Tests - Real bcrypt
import bcrypt from 'bcryptjs';
```

### JWT Mocking
```typescript
// Unit Tests
vi.mock('jsonwebtoken', () => ({
  sign: vi.fn().mockReturnValue('mock-token'),
  verify: vi.fn().mockReturnValue({ userId: 'test-id' })
}));

// Integration Tests - Real JWT
import jwt from 'jsonwebtoken';
```

## Test Data Strategy

### Unit Tests
- **Mock Data**: Minimal objects mit nur benötigten Properties
- **Factories**: Nicht verwendet (zu komplex für Unit Tests)
- **Database**: Vollständig gemockt

```typescript
const mockUser = {
  id: 'test-id',
  username: 'testuser',
  email: 'test@example.com',
  role: 'USER'
};
```

### Integration Tests
- **Real Data**: Test Factories für konsistente Daten
- **Database**: Real SQLite mit automatischem Cleanup
- **Relationships**: Vollständige Objekt-Beziehungen

```typescript
const testUser = await factories.createUser({
  username: 'testuser',
  email: 'test@example.com'
});
```

## Performance Considerations

### Unit Tests
- **Schnell**: < 1ms pro Test
- **Parallel**: Vollständig parallelisierbar
- **Isolation**: Keine shared state

### Integration Tests  
- **Moderat**: < 100ms pro Test
- **Sequential**: Database-abhängige Tests sequential
- **Cleanup**: Automatisches DB cleanup zwischen Tests

## Coverage Goals

### Unit Tests
- **Target**: 85% Function Coverage
- **Focus**: Controller Logic, Middleware, Utilities
- **Exclusions**: Database Models, External Dependencies

### Integration Tests
- **Target**: 80% API Endpoint Coverage  
- **Focus**: Request/Response Flows, Database Operations
- **Inclusions**: Authentication, Authorization, File Upload

## Mock Maintenance

### Aktualisierung bei API-Änderungen
1. Unit Test Mocks aktualisieren
2. Integration Test Factories anpassen
3. BDD Step Definitions erweitern

### Validation Rules
- Mocks müssen actual API interface entsprechen
- Integration Tests validieren real behavior
- BDD Tests dokumentieren expected business behavior

## Debugging Strategy

### Unit Test Failures
1. Überprüfe Mock Setup
2. Validiere erwartete Aufrufe
3. Teste Isolation

### Integration Test Failures
1. Prüfe Database State
2. Validiere Test Data Setup
3. Überprüfe Transaction Rollback

### BDD Test Failures
1. Validiere Gherkin Scenario
2. Prüfe Step Definition Mapping
3. Überprüfe Business Logic Implementation

## Tools & Utilities

### Mock Libraries
- **Vitest**: Standard Mocking Framework
- **vitest-cucumber (or alternative BDD library)**: Gherkin zu Vitest Mapping
- **supertest**: HTTP API Testing

### Test Utilities
- **TestDatabase**: SQLite Test DB Management
- **TestFactories**: Konsistente Test Data Generation  
- **TestRunner**: Infrastructure Validation

## Best Practices

1. **Mock nur externe Abhängigkeiten** in Unit Tests
2. **Verwende real implementations** in Integration Tests  
3. **Halte Mocks einfach** und fokussiert
4. **Dokumentiere Mock Assumptions** für zukünftige Entwickler
5. **Validiere Mock Behavior** gegen real implementations
6. **Update Mocks bei API Changes** zur gleichen Zeit

## Troubleshooting

### Häufige Probleme
1. **Mock Imports**: ESM Import/Export Issues
2. **Database State**: Test Isolation Probleme
3. **Async Handling**: Promise/Callback Mock Setup
4. **Type Safety**: TypeScript Mock Definitions

### Lösungsansätze
1. Verwende `vi.mocked()` für Type Safety
2. Nutze `beforeEach/afterEach` für Clean State
3. Implementiere proper `async/await` in Tests
4. Definiere Mock Types explizit