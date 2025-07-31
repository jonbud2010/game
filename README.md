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
# Auf Windows:
cmd /c yarn.cmd install
# Auf Linux/Mac:
node .yarn/releases/yarn-4.9.2.cjs install

# Beide Services starten (Frontend + Backend)
# Windows:
cmd /c yarn.cmd dev
# Linux/Mac:
node .yarn/releases/yarn-4.9.2.cjs dev

# Oder einzeln starten:
cmd /c yarn.cmd dev:frontend  # Frontend: http://localhost:5173
cmd /c yarn.cmd dev:backend   # Backend: http://localhost:3001

# Falls Backend-Probleme auftreten:
cd backend && npx tsx src/index.ts  # Direkter TypeScript-Start
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
# Development (Root) - Windows
cmd /c yarn.cmd dev             # Beide Services starten
cmd /c yarn.cmd dev:frontend    # Nur Frontend (Port 5173)
cmd /c yarn.cmd dev:backend     # Nur Backend (Port 3001)
cmd /c yarn.cmd dev:backend:clean  # Backend mit Port-Freigabe

# Build
cmd /c yarn.cmd build           # Alle Packages bauen
cmd /c yarn.cmd build:frontend  # Nur Frontend bauen
cmd /c yarn.cmd build:backend   # Nur Backend bauen

# Quality (Alle Workspaces)
cmd /c yarn.cmd lint            # ESLint für alle Packages
cmd /c yarn.cmd type-check      # TypeScript Check
cmd /c yarn.cmd test            # Jest Tests
cmd /c yarn.cmd test:watch      # Jest Watch Mode

# Workspace-spezifisch
cmd /c yarn.cmd workspace @football-tcg/frontend add react-router-dom
cmd /c yarn.cmd workspace @football-tcg/backend add prisma
cmd /c yarn.cmd workspace @football-tcg/shared build
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
cmd /c yarn.cmd kill-port

# Backend mit sauberem Start:
cmd /c yarn.cmd dev:backend:clean

# Backend direkt mit tsx starten:
cd backend && npx tsx src/index.ts

# Oder Prisma-Client neu generieren:
cd backend && npx prisma generate
```

**Yarn-Workspace Probleme?**
- Immer `yarn.cmd` auf Windows verwenden
- Shared Package erst bauen: `cmd /c yarn.cmd workspace @football-tcg/shared build`

**Datenbank-Probleme?**
- SQLite-Datei: `backend/dev.db`
- Migrationen: `cd backend && npx prisma migrate dev`

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

### 🚧 In Arbeit
- [ ] Spieler-System mit CRUD-Operationen (Stub vorhanden)
- [ ] Pack-System & Ziehungs-Mechanik
- [ ] Frontend-Backend Integration

### 📅 Geplant
- [ ] Team-Building Interface
- [ ] Match-Engine Implementation
- [ ] Liga-System & Tabellen
- [ ] Admin-Panel
- [ ] Mobile-Responsive UI

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
