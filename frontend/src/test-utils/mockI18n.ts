import { vi } from 'vitest';

// Mock translation function that returns the key instead of translated text
export const mockT = vi.fn((key: string, options?: any) => {
  // Handle interpolation by returning key with options
  if (options && typeof options === 'object') {
    const interpolated = Object.keys(options).reduce((str, optionKey) => {
      return str.replace(`{{${optionKey}}}`, options[optionKey]);
    }, key);
    return interpolated;
  }
  return key;
});

// Mock useTranslation hook
export const mockUseTranslation = vi.fn((namespace?: string) => ({
  t: mockT,
  i18n: {
    language: 'en',
    changeLanguage: vi.fn(),
    hasLoadedNamespace: vi.fn(() => true),
    loadNamespaces: vi.fn()
  }
}));

// Mock the entire react-i18next module
export const mockI18next = {
  useTranslation: mockUseTranslation,
  Trans: ({ children }: { children: React.ReactNode }) => children,
  initReactI18next: {
    type: '3rdParty',
    init: vi.fn()
  }
};

// Helper to verify translation key usage
export const expectTranslationKey = (key: string, times: number = 1) => {
  expect(mockT).toHaveBeenCalledWith(key, undefined);
  if (times > 1) {
    expect(mockT).toHaveBeenCalledTimes(times);
  }
};

// Helper to verify translation key with options
export const expectTranslationKeyWithOptions = (key: string, options: any) => {
  expect(mockT).toHaveBeenCalledWith(key, options);
};

// Reset all i18n mocks
export const resetI18nMocks = () => {
  mockT.mockClear();
  mockUseTranslation.mockClear();
};

// Setup i18n mocks for test files
export const setupI18nMocks = () => {
  // Mock react-i18next
  vi.mock('react-i18next', () => mockI18next);
  
  // Reset mocks before each test
  beforeEach(() => {
    resetI18nMocks();
    // Set default return value for useTranslation
    mockUseTranslation.mockReturnValue({
      t: mockT,
      i18n: {
        language: 'en',
        changeLanguage: vi.fn(),
        hasLoadedNamespace: vi.fn(() => true),
        loadNamespaces: vi.fn()
      }
    });
  });
};