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
- **Framework**: React 19 mit TypeScript
- **Build Tool**: Vite mit HMR
- **State Management**: Redux Toolkit / Zustand
- **Styling**: CSS Modules / Styled Components
- **Testing**: Jest + React Testing Library + Playwright

### Backend (`/backend`)
- **Runtime**: Node.js mit Express.js
- **Datenbank**: PostgreSQL mit Prisma ORM
- **Authentifizierung**: JWT + bcrypt Hashing
- **File Upload**: Multer + Sharp (Bildkomprimierung)
- **Validation**: Joi Schema Validation

### Shared (`/shared`)
- **Types**: Game Types, API Interfaces
- **Utils**: Chemie-Berechnung, Validierung
- **Constants**: Game-Konstanten, Konfiguration

### DevOps & Qualität
- **Linting**: ESLint + TypeScript-ESLint
- **Testing**: 80%+ Code Coverage
- **Documentation**: OpenAPI/Swagger
- **Error Tracking**: Winston Logger

---

## 🎮 Spielregeln & Mechaniken

### 👥 Spieler-System
- **Attribute**: Bild, Punktzahl, Position, Farbe, Marktpreis, Thema, Prozentsatz
- **Sichtbarkeit**: Spieler sehen nur das Bild
- **Admin-Verwaltung**: Vollständige CRUD-Operationen

### 🔄 Formation-System
- **Struktur**: 11 definierte Positionen pro Formation
- **Sichtbarkeit**: Spieler sehen nur das Formations-Bild
- **Positionszuordnung**: Spieler können nur auf passende Positionen gesetzt werden

### 📦 Pack-System
- **Kaufprozess**: Kaufbestätigung → Zufällige Ziehung
- **Pool-Management**: Prozentsatz-basierte Wahrscheinlichkeit
- **Dynamik**: Pool schrumpft nach jeder Ziehung, Prozentsätze werden neu berechnet
- **Pack-Lebenszyklus**: Verschwindet wenn Pool leer ist

### ⚽ Team-Building
- **Team-Größe**: 11 Spieler pro Team
- **Formation-Bindung**: Spieler müssen zu Formation-Positionen passen
- **Mehrfach-Teams**: 3 verschiedene Teams pro Spieltag (33 Spieler total)
- **Auto-Fill**: Leere Plätze werden mit 0-Punkt Dummy-Spielern gefüllt

### 🧪 Chemie-System
- **Farb-Regel**: Minimum 3 verschiedene Farben, mindestens 2 Spieler pro Farbe
- **Bonus-Berechnung**: 
  - 2 Spieler: 4 Punkte
  - 3 Spieler: 9 Punkte  
  - 4 Spieler: 16 Punkte
  - 5 Spieler: 25 Punkte
  - 6 Spieler: 36 Punkte
  - 7 Spieler: 49 Punkte
- **Gesamt-Chemie**: Summe aller drei Farben

### ⚔️ Match-Engine
- **Team-Stärke**: Spieler-Punkte + Chemie-Bonus
- **Basis-Chance**: 1% pro Team
- **Modifikation**: 
  - +0.05% pro Punkt über Durchschnitt
  - -0.01% pro Punkt unter Durchschnitt
- **Simulation**: 100 Torchancen pro Team pro Spiel
- **Ergebnis**: Realistische Tor-Verteilung

### 🏆 Liga-System
- **Format**: Jeder gegen jeden (6 Spiele pro Spieltag)
- **Punkte-System**: 3 (Sieg) / 1 (Unentschieden) / 0 (Niederlage)
- **Tabellen-Sortierung**: Punkte → Torverhältnis
- **Belohnungen**: 250/200/150/100 Münzen für Plätze 1-4

---

## 📊 Datenbank-Schema

### Core Entities
```sql
Users (id, username, email, password_hash, coins, role)
Lobbies (id, name, max_players, status, created_at)
LobbyMembers (lobby_id, user_id, joined_at)

Players (id, name, image_url, points, position, color, market_price, theme, percentage)
Formations (id, name, image_url, positions[11])
Packs (id, name, image_url, price, player_pool, status)

UserPlayers (id, user_id, player_id, acquired_at)
Teams (id, user_id, lobby_id, formation_id, players[11], name)
Matches (id, lobby_id, team1_id, team2_id, score1, score2, match_day)
LeagueTable (id, lobby_id, user_id, points, goals_for, goals_against, position)
```

---

## 🚀 Entwicklungsphasen

### Phase 1: Grundlagen (Woche 1-2)
- [ ] **Backend-Setup**: Express Server, Datenbank, Auth
- [ ] **Frontend-Setup**: React App Struktur, Routing
- [ ] **User Management**: Registrierung, Login, Profil
- [ ] **Lobby-System**: 4-Spieler Lobbies erstellen/beitreten

### Phase 2: Content Management (Woche 3-4)  
- [ ] **Admin-Panel**: Spieler/Formation/Pack CRUD
- [ ] **File-Upload**: Bild-Upload mit Validierung/Komprimierung
- [ ] **Spieler-System**: Vollständige Spieler-Verwaltung
- [ ] **Pack-System**: Pack-Erstellung und Pool-Management

### Phase 3: Gameplay Core (Woche 5-6)
- [ ] **Team-Builder**: Formation-basiertes Team-Building
- [ ] **Chemie-Engine**: Farbbasierte Bonus-Berechnung  
- [ ] **Pack-Opening**: Prozentsatz-basierte Ziehung
- [ ] **Match-Engine**: Realistische Spiel-Simulation

### Phase 4: Liga-System (Woche 7-8)
- [ ] **Tournament-Engine**: Jeder-gegen-jeden Logik
- [ ] **Match-Visualization**: Live-Spiel Darstellung
- [ ] **Tabellen-System**: Punkte, Torverhältnis, Sortierung
- [ ] **Reward-System**: Münz-Verteilung nach Tabellenplatz

### Phase 5: Polish & Testing (Woche 9-10)
- [ ] **UI/UX-Verbesserung**: Responsive Design, Animationen
- [ ] **Testing Suite**: Unit/Integration/E2E Tests (80% Coverage)
- [ ] **Performance-Optimierung**: Caching, Lazy Loading
- [ ] **Error Handling**: Globale Fehlerbehandlung
- [ ] **Accessibility**: WCAG 2.1 Compliance

---

## 🎨 UI/UX Konzept

### Hauptbereiche
- **Dashboard**: Münzen, Sammlung, aktuelle Liga
- **Pack-Store**: Verfügbare Packs mit Kauf-Modal
- **Team-Builder**: Drag&Drop Formation-Editor
- **Liga-Übersicht**: Tabelle, nächste Spiele, Ergebnisse
- **Admin-Panel**: Content-Management (nur Admins)

### Design-Prinzipien
- **Mobile-First**: Responsive ab 320px
- **Gamification**: Animationen bei Pack-Opening
- **Accessibility**: Keyboard-Navigation, Screen-Reader
- **Performance**: <3s Ladezeit, 60fps Animationen

---

## ✅ Qualitätssicherung

### Testing-Strategie
- **Unit Tests**: Jest für Business Logic (70% Coverage)
- **Integration Tests**: API Endpoints (20% Coverage)  
- **E2E Tests**: Playwright für User Journeys (10% Coverage)
- **Performance Tests**: Lighthouse CI (Score >90)

### Code-Qualität
- **TypeScript**: Strict Mode, keine `any` Types
- **ESLint**: Airbnb Config + Custom Rules
- **Prettier**: Konsistente Code-Formatierung
- **Husky**: Pre-commit Hooks für Linting/Testing

### Security
- **Input Validation**: Joi/Zod Schemas
- **SQL Injection**: Prepared Statements (ORM)
- **XSS Protection**: Content Security Policy
- **Authentication**: JWT mit Refresh Tokens
- **File Upload**: Validierung, Größen-Limits

---

## 📈 Performance-Ziele

### Frontend
- **First Contentful Paint**: <1.5s
- **Largest Contentful Paint**: <2.5s
- **Time to Interactive**: <3.5s
- **Bundle Size**: <500KB gzipped

### Backend  
- **API Response Time**: <200ms (95th percentile)
- **Database Queries**: <50ms durchschnittlich
- **File Upload**: <2MB Bilder in <5s
- **Concurrent Users**: 100+ ohne Performance-Verlust

---

## 🔄 Deployment & Monitoring

### Staging/Production Pipeline
- **Development**: Local Docker Setup
- **Staging**: GitHub Actions → Vercel/Railway
- **Production**: PM2/Docker → DigitalOcean/AWS
- **Database**: PostgreSQL mit Backups

### Monitoring
- **Error Tracking**: Sentry für Frontend/Backend
- **Performance**: New Relic APM
- **Uptime**: StatusPage für User
- **Analytics**: Plausible für Privacy-friendly Tracking

---

## 📚 Dokumentation

### Developer Docs
- **API Documentation**: OpenAPI/Swagger Auto-generated
- **Database Schema**: ER-Diagramm + Migrationen
- **Component Library**: Storybook für UI Components  
- **Setup Guide**: README mit Docker Quick-Start

### User Docs
- **Spielregeln**: Interaktives Tutorial
- **FAQ**: Häufige Fragen + Antworten
- **Admin Guide**: Content-Management Anleitung

---

## 🎯 Success Metrics

### Technical KPIs
- **Code Coverage**: >80%
- **Bug Rate**: <1 Critical Bug/Woche
- **Performance**: Lighthouse Score >90
- **Uptime**: >99.5%

### Business KPIs  
- **User Retention**: >70% nach 1 Woche
- **Match Completion**: >90% der gestarteten Spiele
- **Pack Opening**: >5 Packs/User/Woche
- **Admin Adoption**: >3 aktive Content-Ersteller

---

## 🔧 Nice-to-Have Features (Future)

### V2 Features
- **Replay System**: Match-Replays ansehen
- **Trading**: Spieler zwischen Usern tauschen  
- **Achievements**: Erfolgs-System mit Belohnungen
- **Seasons**: Regelmäßige Liga-Resets
- **Mobile App**: React Native Version

### Advanced Features
- **AI Opponents**: KI-gesteuerte Gegner
- **Live Matches**: Real-time Match-Visualization
- **Voice Chat**: In-Game Kommunikation
- **Streaming**: Twitch/YouTube Integration
- **Esports**: Offizielle Turniere

---

*Dieses Dokument wird kontinuierlich aktualisiert während der Entwicklung.*