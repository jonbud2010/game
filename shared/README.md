# Shared - Football Trading Card Game

Geteilte TypeScript Types, Constants und Business Logic zwischen Frontend und Backend.

## 📦 Exports

### Types
- `Player`, `Team`, `Formation`, `Pack` - Kern-Game-Entities
- `Match`, `League`, `User`, `Lobby` - System-Entities  
- `ApiResponse`, `LoginRequest`, etc. - API-Interfaces

### Constants
- `PLAYER_POSITIONS` - Alle Spielerpositionen
- `PLAYER_COLORS` - Verfügbare Farben
- `CHEMISTRY_POINTS` - Chemie-Bonussystem
- `LEAGUE_SETTINGS` - Liga-Konfiguration

### Utils
- `calculateTeamChemistry()` - Berechne Team-Chemie
- `validateTeamChemistry()` - Validiere Team-Setup
- `getChemistryBreakdown()` - Detaillierte Chemie-Aufschlüsselung

## 🚀 Development

```bash
# Build (wird von anderen Packages verwendet)
yarn build

# Watch Mode für Development
yarn dev
```

## 🧪 Testing

```bash
yarn test
yarn test:watch
```

## 📝 Usage

```typescript
import { 
  Player, 
  calculateTeamChemistry, 
  CHEMISTRY_POINTS 
} from '@football-tcg/shared';

const players: Player[] = [...];
const chemistry = calculateTeamChemistry(team, players);
```