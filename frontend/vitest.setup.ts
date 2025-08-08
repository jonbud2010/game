import './src/test-setup/jest-dom';
import './src/test-setup/vitest.d.ts';
import { vi } from 'vitest';

// Set up React Router future flags to eliminate warnings
// This needs to be done before any Router components are imported
if (typeof window !== 'undefined') {
  // @ts-ignore - Setting future flags for React Router
  window.__reactRouterVersion = '6';
  window.__reactRouterFutureFlags = {
    v7_startTransition: true,
    v7_relativeSplatPath: true
  };
}

// Optimized i18n mock - simplified for performance
const mockT = vi.fn((key: string) => key);
const mockI18n = {
  language: 'en',
  changeLanguage: vi.fn(),
  hasLoadedNamespace: vi.fn(() => true),
  loadNamespaces: vi.fn()
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: mockT,
    i18n: mockI18n
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
  initReactI18next: {
    type: '3rdParty',
    init: vi.fn()
  }
}));

// Optimized custom translation hooks - simplified for performance
vi.mock('./src/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: mockT,
    i18n: mockI18n
  }),
  useColorTranslation: () => (colorKey: string) => `colors.${colorKey}`,
  usePositionTranslation: () => (positionKey: string) => `positions.${positionKey}`,
  useCommonTranslations: () => ({
    common: (key: string) => `common.${key}`,
    game: (key: string) => `game.${key}`,
    admin: (key: string) => `admin.${key}`,
    errors: (key: string) => `errors.${key}`
  }),
  useNamespaceTranslation: (namespace: string) => ({
    t: (key: string) => `${namespace}.${key}`,
    i18n: mockI18n
  })
}));

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

// Mock localStorage with proper typing
const localStorageMock = {
  getItem: vi.fn().mockReturnValue(null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn().mockReturnValue(null)
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock sessionStorage with proper typing  
const sessionStorageMock = {
  getItem: vi.fn().mockReturnValue(null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn().mockReturnValue(null)
};
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });

// Mock console.warn to reduce noise from React Router future flags
const originalWarn = console.warn;
console.warn = (...args) => {
  const message = args[0];
  if (typeof message === 'string' && 
      (message.includes('React Router Future Flag Warning') || 
       message.includes('v7_startTransition') ||
       message.includes('v7_relativeSplatPath'))) {
    return; // Suppress React Router future flag warnings
  }
  originalWarn(...args);
};

// Optimized cleanup function - only reset what's necessary
beforeEach(() => {
  // Clear mocks more efficiently
  vi.clearAllMocks();
  
  // Only reset the return value, don't clear all method calls
  localStorageMock.getItem.mockReturnValue(null);
  sessionStorageMock.getItem.mockReturnValue(null);
});