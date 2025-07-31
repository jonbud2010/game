# 🏆 Fußball-Sammelkartenspiel - Entwicklungsplan

## 📋 Projektübersicht

Ein browserbasiertes Fußball-Sammelkartenspiel für genau 4 Spieler mit komplexer Spielmechanik, Pack-System und Turniermodus.

### 🎯 Kernkonzept
- **4-Spieler Multiplayer**: Genau 4 Spieler pro Lobby
- **Sammelkarten-Mechanik**: Spieler sammeln Fußballspieler durch Pack-Öffnungen
- **Liga-System**: Jeder gegen jeden, 6 Spiele pro Spieltag
- **Komplexe Team-Chemie**: Farbbasiertes Bonussystem
- **Admin-gesteuert**: Admins verwalten Spieler, Formationen und Packs

---

## 🏗️ Technische Architektur

### Workspace-Architektur
- **Package Manager**: Yarn Workspaces für Monorepo-Setup
- **Shared Types**: Gemeinsame TypeScript Definitionen zwischen Frontend/Backend
- **Business Logic**: Zentrale Game-Logik im Shared Package

### Frontend (`/frontend`)
- **Framework**: React 19 mit TypeScript + Vite
- **State Management**: Context API mit Custom Hooks
- **Styling**: CSS mit Mobile-First Design
- **Testing**: Jest + React Testing Library (implementiert)

### Backend (`/backend`)
- **Runtime**: Node.js mit Express.js + TypeScript
- **Datenbank**: SQLite (dev) / PostgreSQL (prod) mit Prisma ORM
- **Authentifizierung**: JWT + bcrypt Hashing
- **File Upload**: Multer + Sharp (Bildkomprimierung)
- **Testing**: Jest mit supertest (70% Coverage-Ziel konfiguriert)

### Shared (`/shared`)
- **Types**: Game Types, API Interfaces
- **Utils**: Chemie-Berechnung, Match-Engine
- **Constants**: Game-Konstanten, Konfiguration

---

## 🎮 Spielregeln & Mechaniken

### 👥 Spieler-System
- **Attribute**: Bild, Punktzahl, Position, Farbe, Marktpreis, Thema, Prozentsatz
- **15 Positionen**: GK, CB, LB, RB, CDM, CM, CAM, LM, RM, LW, RW, ST, CF, LF, RF
- **8 Farben**: Dunkelgrün, Hellgrün, Dunkelblau, Hellblau, Rot, Gelb, Lila, Orange

### 🧪 Chemie-System
- **Farb-Regel**: Genau 3 verschiedene Farben aus 8 verfügbaren, mindestens 2 Spieler pro Farbe
- **Verfügbare Farben**: Dunkelgrün, Hellgrün, Dunkelblau, Hellblau, Rot, Gelb, Lila, Orange
- **Bonus-Berechnung**: 2²=4, 3²=9, 4²=16, 5²=25, 6²=36, 7²=49 Punkte pro Farbe
- **Optimale Verteilung**: 5-3-3 (43 Punkte) oder 4-4-3 (41 Punkte) für maximale Chemie

### ⚔️ Match-Engine
- **Team-Stärke**: Spieler-Punkte + Chemie-Bonus
- **Simulation**: 100 Torchancen pro Team basierend auf Stärke-Verhältnis
- **Liga-Format**: Jeder gegen jeden, 3 Spieltage (18 Matches total)
- **Belohnungen**: 250/200/150/100 Münzen für Plätze 1-4

---

## ✅ Abgeschlossene Entwicklung (Phasen 1-5)

### Grundlagen & Infrastructure ✅
- **Backend-Setup**: Express Server, SQLite/PostgreSQL, JWT Auth, Prisma ORM
- **Frontend-Setup**: React 19 + TypeScript, Vite, Router, Context API
- **User Management**: Registrierung, Login, Protected Routes, Session Persistence

### Content Management System ✅
- **Admin-Panel**: Vollständiges CRUD für Spieler, Formationen, Packs
- **File-Upload**: Multer + Sharp mit WebP-Konvertierung und Größenanpassung
- **Spieler-System**: Backend Controller + Frontend Interface mit Filterung
- **Pack-System**: Prozentsatz-basierte Wahrscheinlichkeit und Pool-Management

### Gameplay Core & Liga-System ✅
- **Team-Builder**: Drag & Drop Interface mit Formation-Validierung
- **Chemie-Engine**: Farbbasierte Bonus-Berechnung (shared utilities)
- **Pack-Opening**: Dynamische Pool-Verwaltung mit Animationen
- **Match-Engine**: 100-Chancen Simulation mit realistischen Ergebnissen
- **Tournament-Engine**: Automatische Liga-Erstellung und -Simulation
- **Tabellen-System**: Sortierung nach Punkten und Torverhältnis

### Polish & Initial Testing ✅
- **UI/UX**: Mobile-First Responsive Design, Loading States, Error Boundaries
- **Performance**: Code Splitting, Lazy Loading, Bundle Optimierung
- **Basic Testing**: Jest Setup für alle 3 Packages mit initialen Tests
- **Accessibility**: WCAG 2.1 Compliance, Keyboard Navigation, Screen Reader Support

**Aktueller Status**: Funktionsfähiges Multiplayer-Spiel mit vollständiger Feature-Set

---

## 🧪 Phase 6: Backend Test Design & Gherkin Scenarios (Woche 11)

### Ziel: Comprehensive Test Planning mit Behavior-Driven Development

#### 6.1 Gherkin Feature Files erstellen
- **Authentication.feature**: Login, Register, JWT Validation, Role-based Access
- **Lobby.feature**: Create/Join/Leave Lobbies, 4-Player Limits, Status Transitions
- **Players.feature**: CRUD Operations, Admin Permissions, File Upload, Validation
- **Packs.feature**: Purchase Flow, Drawing Algorithm, Pool Management, Status Updates
- **Teams.feature**: Formation Validation, Team Building, Multi-Matchday Support
- **Matches.feature**: Match Simulation, League Creation, Scoring, Rewards
- **Chemistry.feature**: Color Rules, Bonus Calculations, Team Validation

#### 6.2 Test Infrastructure Setup
```bash
npm install --save-dev @cucumber/cucumber jest-cucumber
```
- **jest-cucumber Integration**: Gherkin zu Jest Test Mapping
- **Test Database Setup**: SQLite Test-DB für Integration Tests
- **Mock Strategy**: Definition welche Components gemockt vs. real getestet werden
- **Test Data Factory**: Seed-Data Generator für konsistente Test-Setups

#### 6.3 Test Categories Mapping
- **Unit Tests (Mocked)**: Controllers, Middleware, Utilities, Validation
- **Integration Tests (Real DB)**: API Endpoints, Database Operations, File Uploads
- **Edge Cases**: Error Handling, Boundary Conditions, Performance Limits

#### Deliverables:
- [ ] 7 Feature Files mit detaillierten Gherkin Scenarios
- [ ] Jest-Cucumber Test Runner Configuration  
- [ ] Test Database Schema und Seed Scripts
- [ ] Mock Strategy Documentation

---

## 🔬 Phase 7: Unit Tests Implementation (Woche 12)

### Ziel: 80% Unit Test Coverage mit Mocking

#### 7.1 Controller Unit Tests (Mocked Dependencies)
```typescript
// Beispiel: authController.feature -> authController.test.ts
Given('a user with valid credentials')
When('they attempt to login')
Then('they should receive a JWT token')
And('the token should contain user role')
```

- **authController**: Login, Register, Token Validation (Prisma mocked)
- **playerController**: CRUD Operations, Filtering, Admin Checks (DB mocked)
- **lobbyController**: Create/Join/Leave Logic, Status Management (DB mocked)
- **packController**: Purchase, Drawing Algorithm, Pool Updates (DB mocked)
- **teamController**: Formation Validation, Chemistry Checks (DB mocked)
- **matchController**: Simulation Logic, League Operations (DB mocked)

#### 7.2 Middleware Unit Tests
- **auth.js**: JWT Verification, Role Checks, Request Decoration
- **validation.js**: Joi Schema Validation für alle Endpoints
- **upload.js**: File Type, Size, Security Validations

#### 7.3 Utilities Unit Tests
- **Chemistry calculations** (bereits vorhanden in shared/)
- **Match engine logic** (bereits vorhanden in shared/)
- **Pack drawing algorithms**
- **League table calculations**

#### 7.4 Coverage Goals
- **Branches**: 80%+ für alle kritischen Pfade
- **Functions**: 85%+ für Controller und Middleware
- **Lines**: 80%+ für gesamten Backend Code
- **Statements**: 80%+ Coverage

#### Deliverables:
- [ ] 20+ Unit Test Files mit Gherkin-basierter Implementierung
- [ ] Comprehensive Mocking für Prisma, JWT, File System
- [ ] Coverage Report mit detailliertem Branch Analysis
- [ ] Performance Benchmarks für kritische Functions

---

## 🔧 Phase 8: Integration Tests Implementation (Woche 13)

### Ziel: End-to-End API Testing mit SQLite Database

#### 8.1 Database Integration Tests
```gherkin
Scenario: Complete player creation workflow
  Given the database is clean
  When an admin creates a player with valid data
  Then the player should be stored in the database
  And the player should be retrievable via API
  And the image should be processed and stored
```

- **Real SQLite Database**: Test-DB mit automatischem Setup/Teardown
- **Data Seeding**: Konsistente Test-Daten für jeden Test
- **Transaction Rollback**: Isolation zwischen Tests
- **Foreign Key Constraints**: Vollständige Datenkonsistenz-Tests

#### 8.2 API Endpoint Integration
- **Authentication Flow**: Register → Login → Protected Route Access
- **Lobby Workflow**: Create → Join → Start Game → Leave
- **Player Management**: Upload Image → Create Player → Update → Delete
- **Pack System**: Create Pack → Add Players → Purchase → Draw → Pool Update
- **Game Flow**: Create Teams → Simulate Matches → Update League → Distribute Rewards

#### 8.3 File Upload Integration
- **Image Processing**: Upload → Sharp Processing → WebP Conversion → Storage
- **Error Scenarios**: Invalid Files, Size Limits, Storage Failures
- **Security Tests**: Malicious File Detection, Path Traversal Prevention

#### 8.4 Performance & Stress Testing
- **Concurrent Users**: Multiple simultaneous API requests
- **Large Data Sets**: Performance mit 1000+ Players, 100+ Lobbies
- **Memory Leaks**: Long-running Test Scenarios
- **Database Connection Pooling**: Connection Limits und Timeouts

#### Deliverables:
- [ ] 50+ Integration Test Scenarios mit realer Database
- [ ] Automated Test Data Seeding/Cleanup Pipeline
- [ ] File Upload Security und Performance Tests
- [ ] Concurrent User Simulation Tests

---

## 🎯 Phase 9: Test Execution & Bug Fixing (Woche 14)

### Ziel: 80% Coverage erreichen und Production-Ready Code

#### 9.1 Coverage Analysis & Optimization
```bash
# Continuous Coverage Monitoring
yarn test --coverage --watchAll=false
yarn test:integration --coverage
```

- **Coverage Gaps Identification**: Uncovered Branches und Edge Cases
- **Test Case Enhancement**: Zusätzliche Scenarios für kritische Pfade
- **Performance Optimization**: Slow Tests identifizieren und optimieren
- **Flaky Test Resolution**: Intermittierende Test-Failures beheben

#### 9.2 Bug Discovery & Resolution Workflow
1. **Test Failure Analysis**: Root Cause Investigation
2. **Bug Categorization**: Critical/High/Medium/Low Priority
3. **Fix Implementation**: Code Changes mit Test-First Approach
4. **Regression Testing**: Ensure keine bestehenden Features brechen
5. **Documentation Update**: Bug Fixes und Test Cases dokumentieren

#### 9.3 Test Infrastructure Optimization
- **Parallel Test Execution**: Jest Worker Optimization
- **Test Database Performance**: Index Optimization, Query Performance
- **CI/CD Integration**: GitHub Actions für Automated Testing
- **Test Reporting**: HTML Coverage Reports, Trend Analysis

#### 9.4 Quality Gates
- **Minimum 80% Coverage**: Branches, Functions, Lines, Statements
- **Zero Critical Bugs**: Alle High-Priority Issues resolved
- **Performance Benchmarks**: API Response Times <200ms (95th percentile)
- **Security Validation**: No vulnerabilities in dependencies

#### Deliverables:
- [ ] 80%+ Test Coverage across all categories
- [ ] Bug Fix Documentation mit Root Cause Analysis
- [ ] Optimized Test Suite mit <5min Full Test Runtime
- [ ] Production-Ready Testing Pipeline mit CI/CD Integration

---

## 📊 Testing Strategy & Tools

### BDD Framework Stack
- **Gherkin**: Feature files für business-readable specifications
- **jest-cucumber**: Gherkin to Jest test mapping
- **supertest**: HTTP API testing mit Express integration
- **Prisma Test Database**: SQLite für schnelle, isolierte Integration tests

### Coverage & Quality Metrics
- **Target Coverage**: 80% (branches, functions, lines, statements)
- **Test Categories**: 60% Unit Tests, 35% Integration Tests, 5% E2E
- **Performance**: <200ms API response time (95th percentile)
- **Reliability**: <1% flaky test rate

### Test Data Management
- **Factories**: Programmatic test data generation
- **Fixtures**: Static test datasets für komplexe scenarios
- **Database Seeding**: Automated setup/teardown für integration tests
- **Isolation**: Transaction rollback zwischen tests

---

## 🚀 Success Metrics

### Technical KPIs
- **Test Coverage**: ≥80% across all backend code
- **Bug Rate**: <1 Critical Bug discovered in production
- **Test Performance**: Complete test suite runs in <5 minutes
- **API Performance**: 95th percentile response time <200ms

### Quality Indicators  
- **Test Reliability**: <1% flaky test failure rate
- **Documentation Coverage**: 100% of Gherkin scenarios implemented
- **Security**: Zero high-severity vulnerabilities
- **Maintainability**: All tests pass with minimal maintenance overhead

---

## 🔧 Development Commands

### Testing Commands
```bash
# Development
cmd /c yarn.cmd dev                    # Start frontend + backend
cmd /c yarn.cmd test                   # Run all tests
cmd /c yarn.cmd test:watch             # Watch mode tests
cmd /c yarn.cmd test --coverage        # Coverage report

# Backend-specific
cd backend && npm test                 # Backend unit tests
cd backend && npm run test:integration # Integration tests with SQLite
cd backend && npm run test:coverage    # Backend coverage report

# Quality Assurance
cmd /c yarn.cmd lint                   # ESLint all workspaces
cmd /c yarn.cmd type-check            # TypeScript validation
```

### Database Commands
```bash
cd backend
npx prisma generate                    # Generate Prisma client
npx prisma migrate dev                 # Run migrations (dev)
npx prisma db seed                     # Seed test data
sqlite3 dev.db                         # Open SQLite CLI
```

---

*Dieses Dokument fokussiert sich auf die verbleibenden Test-Phasen zur Erreichung einer robusten, 80%+ getesteten Backend-Architektur.*