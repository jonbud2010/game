# Backend - Football Trading Card Game

Express.js REST API für das Fußball-Sammelkartenspiel.

## 🚀 Development

```bash
# Von Root-Verzeichnis aus
yarn dev:backend

# Oder direkt im Backend-Verzeichnis
cd backend
yarn dev
```

## 🔧 Setup

1. Environment variables kopieren:
   ```bash
   cp .env.example .env
   ```

2. Datenbank-URL in `.env` anpassen

3. Dependencies installieren und Datenbank migrieren:
   ```bash
   yarn install
   yarn db:migrate
   yarn db:seed
   ```

## 📦 Abhängigkeiten

- **Express.js** für REST API
- **Prisma** als ORM
- **JWT** für Authentifizierung
- **@football-tcg/shared** für geteilte Types

## 🗄️ Datenbank

```bash
yarn db:migrate    # Migrationen ausführen
yarn db:generate   # Prisma Client generieren
yarn db:seed       # Testdaten einfügen
```

## 🧪 Testing

```bash
yarn test
yarn test:watch
```

## 🏗️ Build

```bash
yarn build
yarn start
```