import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService, User, LoginRequest, RegisterRequest } from '../services/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is already logged in on app start
  useEffect(() => {
    const checkAuth = async () => {
      if (apiService.isAuthenticated()) {
        try {
          const response = await apiService.getCurrentUser();
          setUser(response.user);
        } catch (error) {
          console.error('Failed to get current user:', error);
          // Token might be invalid, remove it
          apiService.logout();
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (credentials: LoginRequest) => {
    try {
      const response = await apiService.login(credentials);
      setUser(response.user);
    } catch (error) {
      throw error; // Re-throw to be handled by the component
    }
  };

  const register = async (userData: RegisterRequest) => {
    try {
      const response = await apiService.register(userData);
      setUser(response.user);
    } catch (error) {
      throw error; // Re-throw to be handled by the component
    }
  };

  const logout = () => {
    apiService.logout();
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};