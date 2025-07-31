# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is "Spiel" - a browser-based multiplayer football (soccer) trading card game for exactly 4 players. The game features complex league mechanics, pack opening systems, and team building with chemistry bonuses.

## Architecture

### Yarn Workspace Monorepo Structure
- **Root**: Yarn 4 workspace configuration with concurrent development scripts
- **Frontend** (`/frontend`): React 19 + TypeScript + Vite application  
- **Backend** (`/backend`): Node.js + Express + TypeScript API server
- **Shared** (`/shared`): Common TypeScript types, constants, and business logic

The shared package exports game types, chemistry calculation utilities, and constants used by both frontend and backend.

## Development Commands

### Starting Development Services
```bash
# On Windows (use yarn.cmd):
cmd /c yarn.cmd dev              # Start both frontend and backend
cmd /c yarn.cmd dev:frontend     # Frontend only (port 5173)
cmd /c yarn.cmd dev:backend      # Backend only (port 3001)

# Clean start (kills dangling processes first):
cmd /c yarn.cmd dev:backend:clean  # Kill port 3001 processes, then start backend

# Alternative backend start (if yarn dev fails):
cd backend && npx tsx src/index.ts  # Direct TypeScript execution

# On Linux/Mac:
node .yarn/releases/yarn-4.9.2.cjs dev
```

### Building
```bash
cmd /c yarn.cmd build            # Build all packages (shared first)
cmd /c yarn.cmd build:frontend   # Frontend only
cmd /c yarn.cmd build:backend    # Backend only (✅ working)

# Backend uses tsx for both development and production start
# TypeScript compilation (tsc) generates dist files for type checking
```

### Quality Assurance
```bash
cmd /c yarn.cmd lint             # ESLint all workspaces
cmd /c yarn.cmd type-check       # TypeScript check all
cmd /c yarn.cmd test             # Jest tests all
cmd /c yarn.cmd test:watch       # Watch mode tests
```

### Database Tools Setup

**SQLite Installation (Windows)**:
SQLite tools are installed system-wide for convenient access from any directory:
- **Location**: `C:\sqlite\bin\`
- **Tools included**: sqlite3.exe, sqldiff.exe, sqlite3_analyzer.exe
- **PATH**: Added to Windows PATH environment variable for global access

**Verification**:
```bash
sqlite3 --version    # Should display SQLite version
```

**Note**: After PATH modification, restart command prompt/terminal or reboot system to access sqlite3 globally. 
Until restart, use full path: `C:\sqlite\bin\sqlite3`

### Database Operations (Backend)

**Local Development (SQLite)**:
```bash
cd backend
npx prisma generate          # Generate Prisma client
npx prisma migrate dev       # Run migrations
npx prisma db seed           # Seed test data

# SQLite CLI commands (available globally):
sqlite3 dev.db               # Open database in SQLite CLI
sqlite3 prisma/dev.db        # Open Prisma database directly
```

**Production (PostgreSQL)** - Use schema.production.prisma:
```bash
cmd /c yarn.cmd workspace @football-tcg/backend db:migrate
cmd /c yarn.cmd workspace @football-tcg/backend db:generate
cmd /c yarn.cmd workspace @football-tcg/backend db:seed
```

## Game Architecture & Business Logic

### Core Game Concepts
- **4-Player Lobbies**: Exactly 4 players per game session
- **Pack System**: Percentage-based player drawing with shrinking pools
- **Team Chemistry**: Color-based bonus system requiring exactly 3 colors, 2+ players per color
- **League Format**: Round-robin tournament (6 matches per matchday)
- **Formation System**: 11-player teams with position validation

### Key Constants (shared/src/constants/game.ts)
- Chemistry bonuses: 2²=4, 3²=9, 4²=16, 5²=25, 6²=36, 7²=49 points per color
- League rewards: 250/200/150/100 coins for positions 1-4
- Match simulation: 100 chances per team, percentage-based scoring
- Team requirements: 11 players, 3 teams per matchday (33 total players)

### Business Logic Location
- **Chemistry calculations**: `shared/src/utils/chemistry.ts`
- **Game constants**: `shared/src/constants/game.ts`
- **Type definitions**: `shared/src/types/game.ts` and `shared/src/types/api.ts`

### Player Positions
15 distinct positions: GK, CB, LB, RB, CDM, CM, CAM, LM, RM, LW, RW, ST, CF, LF, RF

### Player Colors & Chemistry
8 colors available: Dunkelgrün, Hellgrün, Dunkelblau, Hellblau, Rot, Gelb, Lila, Orange
Teams must have exactly 3 different colors with at least 2 players per color for valid chemistry.
Optimal distributions: 5-3-3 (43 points) or 4-4-3 (41 points) for maximum chemistry.

## Technical Stack

### Frontend
- React 19 with TypeScript strict mode
- Vite for development and building
- CSS for styling (no CSS framework detected)
- Custom hooks for game state management

### Backend  
- Express.js with TypeScript
- SQLite for local development, PostgreSQL for production + Prisma ORM
- JWT authentication + bcrypt (implemented)
- Lobby management system (implemented)
- Player management endpoints (stub implementation)
- File uploads with Multer + Sharp (planned)

### Development Status
The project is in early development phase:
- ✅ Basic project structure and workspace setup
- ✅ Shared types and business logic
- ✅ Frontend component structure  
- ✅ Backend API skeleton with working routes
- ✅ Database setup and models (SQLite working locally, Prisma configured)
- ✅ Authentication system (JWT-based, implemented)
- ✅ Lobby system (create, join, leave lobbies)
- 📅 Player management system (stub implementation)
- 📅 Pack system and game mechanics (planned)
- 📅 Team building and match engine (planned)

## Troubleshooting

### Backend Won't Start
If the backend crashes on startup, common issues include:

1. **Port Already in Use (EADDRINUSE)**:
   ```bash
   # Kill any processes on port 3001:
   cmd /c yarn.cmd kill-port
   
   # Or use the clean start command:
   cmd /c yarn.cmd dev:backend:clean
   ```

2. **Module Import Errors**: 
   - Ensure all TypeScript imports use correct paths without `.js` extensions
   - Check that shared package types are properly exported

3. **Database Connection Issues**:
   ```bash
   cd backend
   npx prisma generate    # Regenerate Prisma client
   npx prisma migrate dev # Apply latest migrations
   ```

4. **Alternative Backend Start**:
   ```bash
   cd backend
   npx tsx src/index.ts   # Direct TypeScript execution bypasses build issues
   ```

5. **Environment Variables**: 
   - Ensure `.env` file exists in backend directory with required variables

### TypeScript Compilation ✅ 
The backend now properly supports both development and production builds:
- Development: Uses `tsx` for fast TypeScript execution
- Production: TypeScript compiles successfully with `tsc`
- Type checking: `npm run type-check` validates without emitting files

### Database Issues
- SQLite database files are located in `backend/dev.db` and `backend/prisma/dev.db`
- Use `sqlite3 --version` to verify SQLite CLI tools are available globally

## Important Notes

- This is a German-language project (comments and UI in German)
- Uses Yarn Berry (v4.9.2) - always use `yarn.cmd` on Windows
- SQLite database (dev.db) is used for local development, PostgreSQL for production
- Shared package must be built before frontend/backend due to workspace dependencies
- Game rules are complex - refer to PLAN.md for detailed specifications
- Backend uses `tsx` for runtime execution, `tsc` for building and type checking
- No malicious code detected - this is a legitimate game development project