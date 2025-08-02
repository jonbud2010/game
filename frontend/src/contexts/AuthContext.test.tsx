import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    })
  };
})();

Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

// Mock fetch
global.fetch = vi.fn();
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
    mockLocalStorage.clear();
  });

  describe('initial state', () => {
    it('should initialize with default values when no token in localStorage', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated');
      expect(screen.getByTestId('user')).toHaveTextContent('no-user');
    });

    it('should initialize with loading state when token exists in localStorage', async () => {
      mockLocalStorage.getItem.mockReturnValue('existing-token');
      
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

      await act(async () => {
        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );
      });

      expect(screen.getByTestId('loading')).toHaveTextContent('loading');
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

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const loginButton = screen.getByText('Login');
      
      await act(async () => {
        loginButton.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated');
        expect(screen.getByTestId('user')).toHaveTextContent(JSON.stringify(mockUser));
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('auth_token', 'mock-jwt-token');
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

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const loginButton = screen.getByText('Login');
      
      await expect(act(async () => {
        loginButton.click();
      })).rejects.toThrow('Invalid credentials');

      expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated');
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });

    it('should handle network errors during login', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

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

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const registerButton = screen.getByText('Register');
      
      await act(async () => {
        registerButton.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated');
        expect(screen.getByTestId('user')).toHaveTextContent(JSON.stringify(mockUser));
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('auth_token', 'mock-jwt-token');
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

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

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
      mockLocalStorage.getItem.mockReturnValue('existing-token');
      
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

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

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
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_token');
    });
  });

  describe('token validation on mount', () => {
    it('should validate existing token and set user', async () => {
      mockLocalStorage.getItem.mockReturnValue('valid-token');
      
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

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

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
      mockLocalStorage.getItem.mockReturnValue('invalid-token');
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          error: 'Invalid token'
        })
      } as Response);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated');
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      });

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_token');
    });
  });

  describe('error handling', () => {
    it('should handle network errors during token validation', async () => {
      mockLocalStorage.getItem.mockReturnValue('token');
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
        expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated');
      });

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_token');
    });
  });
});