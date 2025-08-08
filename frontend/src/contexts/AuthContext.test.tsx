import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';

// Mock LoadingSpinner component
vi.mock('../components/LoadingSpinner', () => ({
  default: ({ text }: { text: string }) => <div data-testid="loading-spinner">{text}</div>
}));

// Mock fetch (global fetch is already mocked in vitest.setup.ts)
const mockFetch = vi.mocked(fetch);

// Test component to access context
const TestComponent: React.FC = () => {
  const { user, isAuthenticated, isLoading, login, logout, register } = useAuth();
  
  return (
    <div>
      <div data-testid="loading">{isLoading ? 'loading' : 'not-loading'}</div>
      <div data-testid="authenticated">{isAuthenticated ? 'authenticated' : 'not-authenticated'}</div>
      <div data-testid="user">{user ? JSON.stringify(user) : 'no-user'}</div>
      <button onClick={() => login({ email: 'test@example.com', password: 'password' })}>
        Login
      </button>
      <button onClick={() => register({ username: 'test', email: 'test@example.com', password: 'password' })}>
        Register
      </button>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // localStorage is already mocked globally in vitest.setup.ts
    // Reset fetch mock
    mockFetch.mockClear();
  });

  describe('initial state', () => {
    it('should initialize with default values when no token in localStorage', () => {
      vi.mocked(localStorage.getItem).mockReturnValue(null);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated');
      expect(screen.getByTestId('user')).toHaveTextContent('no-user');
    });

    it('should show loading state when token exists in localStorage', async () => {
      vi.mocked(localStorage.getItem).mockReturnValue('existing-token');
      
      // Mock successful user fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: {
            id: 'user-1',
            username: 'testuser',
            email: 'test@example.com',
            coins: 1000,
            role: 'USER'
          }
        })
      } as Response);

      let renderResult;
      await act(async () => {
        renderResult = render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );
      });

      // Wait for auth check to complete
      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated');
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      });
    });
  });

  describe('login functionality', () => {
    it('should login successfully and update state', async () => {
      const mockUser = {
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        coins: 1000,
        role: 'USER'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: mockUser,
          token: 'mock-jwt-token'
        })
      } as Response);

      await act(async () => {
        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );
      });

      const loginButton = screen.getByText('Login');
      
      await act(async () => {
        loginButton.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated');
        expect(screen.getByTestId('user')).toHaveTextContent(JSON.stringify(mockUser));
      });

      expect(localStorage.setItem).toHaveBeenCalledWith('auth_token', 'mock-jwt-token');
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', password: 'password' })
      });
    });

    it('should handle login failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: 'Invalid credentials'
        })
      } as Response);

      await act(async () => {
        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );
      });

      const loginButton = screen.getByText('Login');
      
      await expect(act(async () => {
        loginButton.click();
      })).rejects.toThrow('Invalid credentials');

      expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated');
      expect(localStorage.setItem).not.toHaveBeenCalled();
    });

    it('should handle network errors during login', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await act(async () => {
        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );
      });

      const loginButton = screen.getByText('Login');
      
      await expect(act(async () => {
        loginButton.click();
      })).rejects.toThrow('Network error');

      expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated');
    });
  });

  describe('register functionality', () => {
    it('should register successfully and update state', async () => {
      const mockUser = {
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        coins: 1000,
        role: 'USER'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          user: mockUser,
          token: 'mock-jwt-token'
        })
      } as Response);

      await act(async () => {
        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );
      });

      const registerButton = screen.getByText('Register');
      
      await act(async () => {
        registerButton.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated');
        expect(screen.getByTestId('user')).toHaveTextContent(JSON.stringify(mockUser));
      });

      expect(localStorage.setItem).toHaveBeenCalledWith('auth_token', 'mock-jwt-token');
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'test', email: 'test@example.com', password: 'password' })
      });
    });

    it('should handle registration failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: 'User already exists'
        })
      } as Response);

      await act(async () => {
        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );
      });

      const registerButton = screen.getByText('Register');
      
      await expect(act(async () => {
        registerButton.click();
      })).rejects.toThrow('User already exists');

      expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated');
    });
  });

  describe('logout functionality', () => {
    it('should logout and clear state', async () => {
      // First set up authenticated state
      vi.mocked(localStorage.getItem).mockReturnValue('existing-token');
      
      const mockUser = {
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        coins: 1000,
        role: 'USER'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: mockUser
        })
      } as Response);

      await act(async () => {
        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );
      });

      // Wait for initial auth check
      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated');
      });

      // Now logout
      const logoutButton = screen.getByText('Logout');
      
      act(() => {
        logoutButton.click();
      });

      expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated');
      expect(screen.getByTestId('user')).toHaveTextContent('no-user');
      expect(localStorage.removeItem).toHaveBeenCalledWith('auth_token');
    });
  });

  describe('token validation on mount', () => {
    it('should validate existing token and set user', async () => {
      vi.mocked(localStorage.getItem).mockReturnValue('valid-token');
      
      const mockUser = {
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        coins: 1000,
        role: 'USER'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: mockUser
        })
      } as Response);

      await act(async () => {
        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );
      });

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated');
        expect(screen.getByTestId('user')).toHaveTextContent(JSON.stringify(mockUser));
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/me', {
        headers: { 
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token' 
        }
      });
    });

    it('should handle invalid token and clear localStorage', async () => {
      vi.mocked(localStorage.getItem).mockReturnValue('invalid-token');
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          error: 'Invalid token'
        })
      } as Response);

      await act(async () => {
        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );
      });

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated');
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      });

      expect(localStorage.removeItem).toHaveBeenCalledWith('auth_token');
    });
  });

  describe('error handling', () => {
    it('should handle network errors during token validation', async () => {
      vi.mocked(localStorage.getItem).mockReturnValue('token');
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await act(async () => {
        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );
      });

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
        expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated');
      });

      expect(localStorage.removeItem).toHaveBeenCalledWith('auth_token');
    });
  });
});