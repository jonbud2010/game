// Route constants for type-safe navigation
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  LOBBY: '/lobby',
  COLLECTION: '/collection',
  PACKS: '/packs',
  PROFILE: '/profile',
  TEAM_BUILDER: '/team-builder',
  MATCH: '/match',
  LEAGUE: '/league',
} as const;

// Route labels for UI display
export const ROUTE_LABELS = {
  [ROUTES.HOME]: 'Home',
  [ROUTES.LOGIN]: 'Anmelden',
  [ROUTES.REGISTER]: 'Registrieren',
  [ROUTES.LOBBY]: 'Lobbies',
  [ROUTES.COLLECTION]: 'Sammlung',
  [ROUTES.PACKS]: 'Packs',
  [ROUTES.PROFILE]: 'Profil',
  [ROUTES.TEAM_BUILDER]: 'Team Builder',
  [ROUTES.MATCH]: 'Match',
  [ROUTES.LEAGUE]: 'Liga',
} as const;

// Protected routes that require authentication
export const PROTECTED_ROUTES = [
  ROUTES.LOBBY,
  ROUTES.COLLECTION,
  ROUTES.PACKS,
  ROUTES.PROFILE,
  ROUTES.TEAM_BUILDER,
  ROUTES.MATCH,
  ROUTES.LEAGUE,
] as const;

// Public routes accessible without authentication
export const PUBLIC_ROUTES = [
  ROUTES.HOME,
  ROUTES.LOGIN,
  ROUTES.REGISTER,
] as const;