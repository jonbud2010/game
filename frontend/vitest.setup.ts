import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Initialize i18next for tests
i18n
  .use(initReactI18next)
  .init({
    lng: 'de',
    fallbackLng: 'de',
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    resources: {
      de: {
        common: {
          navigation: {
            home: "Home",
            lobbies: "Lobbies",
            collection: "Sammlung",
            packs: "Packs",
            team_builder: "Team Builder",
            league: "Liga",
            admin: "Admin"
          },
          buttons: {
            login: "Anmelden",
            logout: "Abmelden",
            register: "Registrieren"
          },
          forms: {
            email: "E-Mail",
            password: "Passwort"
          },
          pages: {
            login: {
              welcome_back: "Willkommen zurück!",
              no_account: "Noch kein Account?"
            }
          },
          status: {
            loading: "Lädt..."
          },
          user: {
            coins_balance: "Münzen"
          }
        }
      }
    }
  });

// Mock matchMedia for responsive design tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock fetch for API calls
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.sessionStorage = sessionStorageMock;