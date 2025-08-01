# ⚽ Fußball-Sammelkartenspiel

Ein browserbasiertes Multiplayer Fußball-Sammelkartenspiel für genau 4 Spieler mit komplexer Liga-Mechanik, Pack-System und Team-Building.

## 🎯 Überblick

Sammle Fußballspieler durch Pack-Öffnungen, baue starke Teams mit cleverer Chemie und kämpfe in einem Liga-System wo jeder gegen jeden spielt. Nur die besten Strategien führen zum Sieg!

### ✨ Key Features

- 🏆 **4-Spieler Liga**: Jeder gegen jeden, 6 Spiele pro Spieltag
- 📦 **Pack-System**: Prozentsatz-basierte Spieler-Ziehungen  
- ⚗️ **Team-Chemie**: Farbbasiertes Bonussystem (genau 3 aus 8 Farben, min. 2 Spieler)
- 🎪 **Formation-Building**: Positionsgetreue Team-Aufstellung
- 💰 **Währungssystem**: Verdiene Münzen durch Liga-Erfolg
- 👨‍💼 **Admin-Panel**: Content-Management für Spieler, Formationen & Packs

## 🚀 Quick Start

```bash
# Repository klonen
git clone https://github.com/your-username/football-tcg.git
cd football-tcg

# Dependencies installieren (Yarn 4 Workspaces)
yarn install

# Beide Services starten (Frontend + Backend)
yarn dev

# Oder einzeln starten:
yarn dev:frontend  # Frontend: http://localhost:5173
yarn dev:backend   # Backend: http://localhost:3001

# Falls Backend-Probleme auftreten:
cd backend && yarn tsx src/index.ts  # Direkter TypeScript-Start
```

**Yarn 4 Setup:** Das Projekt nutzt Yarn Berry (v4.9.2) für moderne Workspace-Features. Die lokale Installation ist bereits konfiguriert.

## 🎮 Spielregeln

### Spieler sammeln
- Kaufe **Packs** mit der Ingame-Währung
- Jeder Pack hat einen **Spieler-Pool** mit Prozentsätzen
- Höhere Prozentsätze = höhere Zieh-Wahrscheinlichkeit
- Pool schrumpft nach jeder Ziehung

### Teams bauen
- **11 Spieler** pro Team in vordefinierte **Formationen**
- **3 verschiedene Teams** pro Spieltag (33 Spieler total)
- **Team-Chemie**: Genau 3 verschiedene Farben aus 8 verfügbaren, mindestens 2 Spieler pro Farbe
- **Verfügbare Farben**: Dunkelgrün, Hellgrün, Dunkelblau, Hellblau, Rot, Gelb, Lila, Orange
- **Chemie-Boni**: 2²=4, 3²=9, 4²=16, 5²=25, 6²=36, 7²=49 Punkte pro Farbe
- **Optimale Verteilung**: 5-3-3 (43 Punkte) oder 4-4-3 (41 Punkte)

### Liga-System
- **Jeder gegen jeden**: 6 Spiele pro Spieltag
- **Punkte**: 3 (Sieg) / 1 (Unentschieden) / 0 (Niederlage)
- **Tiebreaker**: Torverhältnis entscheidet
- **Belohnungen**: 250/200/150/100 Münzen für Plätze 1-4

### Match-Engine
- **Team-Stärke**: Spieler-Punkte + Chemie-Bonus
- **Tor-Chancen**: 100 pro Team, Wahrscheinlichkeit basiert auf Stärke-Verhältnis
- **Realistische Ergebnisse**: Durchschnittswerte und Modifikatoren

## 🛠️ Tech Stack

### Frontend (`/frontend`)
- **React 19** mit TypeScript
- **Vite** für Build & Dev Server
- **CSS Modules** für Styling
- **Jest + Testing Library** für Tests

### Backend (`/backend`)
- **Node.js + Express** REST API
- **SQLite** (Development) / **PostgreSQL** (Production) mit Prisma ORM
- **JWT** Authentifizierung + bcrypt (✅ implementiert)
- **Lobby-System** für 4-Spieler Räume (✅ implementiert)
- **Multer + Sharp** für Bild-Uploads (geplant)

### Shared (`/shared`)
- **TypeScript Types** für API & Game Logic
- **Business Logic** (Chemie-Berechnung, Validierung)
- **Konstanten** und Utilities

## 📁 Projektstruktur

```
football-tcg/
├── package.json         # Root Yarn Workspace
├── yarn.lock           
├── frontend/            # React Frontend
│   ├── src/
│   │   ├── components/  # React Komponenten
│   │   ├── hooks/       # Custom Hooks
│   │   ├── assets/      # Statische Assets
│   │   └── ...
│   ├── package.json
│   └── vite.config.ts
├── backend/             # Express Backend
│   ├── src/
│   │   ├── routes/      # API Routes
│   │   ├── controllers/ # Request Handler
│   │   ├── middleware/  # Auth, Validation
│   │   ├── models/      # Prisma Models
│   │   └── ...
│   └── package.json
├── shared/              # Geteilte Types & Utils
│   ├── src/
│   │   ├── types/       # TypeScript Interfaces
│   │   ├── constants/   # Game Constants  
│   │   └── utils/       # Business Logic
│   └── package.json
└── docs/               # Dokumentation
```

## 🔧 Development

### Verfügbare Scripts

```bash
# Development (Root)
yarn dev             # Beide Services starten
yarn dev:frontend    # Nur Frontend (Port 5173)
yarn dev:backend     # Nur Backend (Port 3001)
yarn dev:backend:clean  # Backend mit Port-Freigabe

# Build
yarn build           # Alle Packages bauen
yarn build:frontend  # Nur Frontend bauen
yarn build:backend   # Nur Backend bauen

# Quality (Alle Workspaces)
yarn lint            # ESLint für alle Packages
yarn type-check      # TypeScript Check
yarn test            # Jest Tests
yarn test:watch      # Jest Watch Mode

# Workspace-spezifisch
yarn workspace @football-tcg/frontend add react-router-dom
yarn workspace @football-tcg/backend add prisma
yarn workspace @football-tcg/shared build
```

### Code-Qualität

- **TypeScript Strict Mode** für Typsicherheit
- **ESLint + Prettier** für Code-Formatierung  
- **Husky Pre-commit Hooks** für Qualitätschecks
- **Jest + Testing Library** für umfassende Tests

### 🔧 Troubleshooting

**Backend startet nicht?**
```bash
# Port 3001 freigeben (tötet hängende Prozesse):
yarn kill-port

# Backend mit sauberem Start:
yarn dev:backend:clean

# Backend direkt mit tsx starten:
cd backend && yarn tsx src/index.ts

# Oder Prisma-Client neu generieren:
cd backend && yarn prisma generate
```

**Yarn-Workspace Probleme?**
- Shared Package erst bauen: `yarn workspace @football-tcg/shared build`

**Datenbank-Probleme?**
- SQLite-Datei: `backend/dev.db`
- Migrationen: `cd backend && yarn prisma migrate dev`

## 📋 Development Status

Siehe [PLAN.md](./PLAN.md) für den vollständigen Entwicklungsplan.

### ✅ Abgeschlossen
- [x] Projekt-Setup (React + TypeScript + Vite)
- [x] Yarn Workspace-Struktur (Frontend/Backend/Shared)
- [x] Grundlegende Komponenten-Struktur
- [x] Backend-Grundgerüst mit Express
- [x] Shared Types & Business Logic
- [x] Datenbank-Setup mit Prisma ORM (SQLite)
- [x] User Management & JWT Authentifizierung
- [x] Lobby-System (Erstellen, Beitreten, Verlassen)
- [x] Entwicklungsplan & Dokumentation
- [x] Test Database Infrastructure (SQLite)
- [x] Mock Strategy Documentation

### 🚧 Teilweise Abgeschlossen
- [x] Unit Tests Implementation (20+ Test Files)
- [x] Comprehensive Mocking (Prisma, JWT, File System)
- [x] Coverage Report Setup
- [x] Backend Test Design & Gherkin Scenarios
- [x] BDD Framework Setup (jest-cucumber)
- [⚠️] Test Execution (Yarn Workspace Dependencies Issue)
- [ ] Test Coverage Optimization (Target: 80%)
- [ ] Bug Discovery & Resolution
- [ ] Performance Optimization
- [ ] CI/CD Integration

### 📅 Geplant
- [ ] Production Deployment
- [ ] Mobile-Responsive UI Enhancements
- [ ] Advanced Analytics

## 🤝 Contributing

1. Fork das Repository
2. Feature Branch erstellen (`git checkout -b feature/AmazingFeature`)
3. Changes committen (`git commit -m 'Add some AmazingFeature'`)
4. Branch pushen (`git push origin feature/AmazingFeature`)
5. Pull Request öffnen

### Development Guidelines

- Folge der bestehenden Code-Struktur
- Schreibe Tests für neue Features
- Verwende aussagekräftige Commit-Messages
- Halte PRs fokussiert und klein

## 📄 Lizenz

Dieses Projekt steht unter der MIT Lizenz - siehe [LICENSE](LICENSE) für Details.

## 🔗 Links

- [Vollständiger Entwicklungsplan](./PLAN.md)
- [API Dokumentation](./docs/api.md) *(geplant)*
- [Deployment Guide](./docs/deployment.md) *(geplant)*

---

Entwickelt mit ❤️ und ⚽ für Fußball-Fans und Sammelkarten-Enthusiasten!
