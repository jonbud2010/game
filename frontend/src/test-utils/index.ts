import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { MemoryRouter, BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';

// Mock AuthContext types
export interface MockAuthContext {
  user: any;
  isAuthenticated: boolean;
  login: ReturnType<typeof vi.fn>;
  logout: ReturnType<typeof vi.fn>;
  register: ReturnType<typeof vi.fn>;
  isLoading: boolean;
}

// Create mock auth context
export const createMockAuthContext = (
  isAuthenticated: boolean = false, 
  user: any = null,
  isLoading: boolean = false
): MockAuthContext => ({
  user,
  isAuthenticated,
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
  isLoading
});

// Test wrapper props
interface TestWrapperProps {
  children: React.ReactNode;
  initialEntries?: string[];
  authContext?: MockAuthContext;
}

// Default test wrapper with all necessary providers
export const TestWrapper: React.FC<TestWrapperProps> = ({ 
  children, 
  initialEntries = ['/'],
  authContext = createMockAuthContext()
}) => {
  const Router = initialEntries.length > 1 || initialEntries[0] !== '/' 
    ? MemoryRouter 
    : BrowserRouter;
  const routerProps = Router === MemoryRouter ? { initialEntries } : {};

  return React.createElement(Router, routerProps, children);
};

// Custom render function that includes all providers
export const renderWithProviders = (
  ui: React.ReactElement,
  options: RenderOptions & {
    initialEntries?: string[];
    authContext?: MockAuthContext;
  } = {}
) => {
  const { initialEntries, authContext, ...renderOptions } = options;
  
  const Wrapper = ({ children }: { children: React.ReactNode }) => 
    React.createElement(TestWrapper, { initialEntries, authContext }, children);

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Helper to setup common mocks for component tests
export const setupComponentMocks = () => {
  // Mock useNavigate
  const mockNavigate = vi.fn();
  vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
      ...actual,
      useNavigate: () => mockNavigate
    };
  });

  return { mockNavigate };
};

// Helper to verify element by data-testid
export const expectTestId = (testId: string) => {
  return expect(document.querySelector(`[data-testid="${testId}"]`));
};

// Helper for async component testing with proper act() wrapping
export const waitForAuthCheck = async () => {
  // Wait a tick for async effects to complete
  await new Promise(resolve => setTimeout(resolve, 0));
};

// Common test data
export const mockUser = {
  id: 'test-user-1',
  username: 'testuser',
  email: 'test@example.com',
  coins: 1500,
  role: 'USER' as const
};

export const mockAdminUser = {
  ...mockUser,
  id: 'test-admin-1',
  role: 'ADMIN' as const
};

// Export everything for easier imports (using named exports to avoid interop warnings)
export {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
  act,
  within,
  getByRole,
  getByText,
  getByLabelText,
  getByTestId,
  queryByRole,
  queryByText,
  queryByLabelText,
  queryByTestId
} from '@testing-library/react';
export { vi } from 'vitest';