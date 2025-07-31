import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import Header from './Header';
import { AuthProvider } from '../../contexts/AuthContext';

// Mock the AuthContext
const mockLogout = jest.fn();

const createMockAuthContext = (isAuthenticated: boolean = false, user: any = null) => ({
  user,
  isAuthenticated,
  login: jest.fn(),
  logout: mockLogout,
  register: jest.fn(),
  loading: false
});

// Wrapper component to provide context
const TestWrapper: React.FC<{ 
  children: React.ReactNode; 
  isAuthenticated?: boolean; 
  user?: any;
  initialEntries?: string[];
}> = ({ 
  children, 
  isAuthenticated = false, 
  user = null,
  initialEntries = ['/']
}) => {
  const Router = initialEntries ? MemoryRouter : BrowserRouter;
  const routerProps = initialEntries ? { initialEntries } : {};

  return (
    <Router {...routerProps}>
      <AuthProvider value={createMockAuthContext(isAuthenticated, user)}>
        {children}
      </AuthProvider>
    </Router>
  );
};

describe('Header Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when user is not authenticated', () => {
    it('should render logo and public navigation links', () => {
      render(
        <TestWrapper>
          <Header />
        </TestWrapper>
      );

      // Check logo
      expect(screen.getByText('⚽')).toBeInTheDocument();
      expect(screen.getByText('Football TCG')).toBeInTheDocument();

      // Check navigation links
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Lobbies')).toBeInTheDocument();
      expect(screen.getByText('Sammlung')).toBeInTheDocument();
      expect(screen.getByText('Packs')).toBeInTheDocument();
    });

    it('should show login and register links when not authenticated', () => {
      render(
        <TestWrapper isAuthenticated={false}>
          <Header />
        </TestWrapper>
      );

      expect(screen.getByText('Anmelden')).toBeInTheDocument();
      expect(screen.getByText('Registrieren')).toBeInTheDocument();
    });

    it('should not show user-specific elements when not authenticated', () => {
      render(
        <TestWrapper isAuthenticated={false}>
          <Header />
        </TestWrapper>
      );

      expect(screen.queryByText('Abmelden')).not.toBeInTheDocument();
      expect(screen.queryByText(/Münzen/)).not.toBeInTheDocument();
    });
  });

  describe('when user is authenticated', () => {
    const mockUser = {
      id: 'user-1',
      username: 'testuser',
      email: 'test@example.com',
      coins: 1500,
      role: 'USER'
    };

    it('should show user information when authenticated', () => {
      render(
        <TestWrapper isAuthenticated={true} user={mockUser}>
          <Header />
        </TestWrapper>
      );

      expect(screen.getByText('testuser')).toBeInTheDocument();
      expect(screen.getByText('1500 Münzen')).toBeInTheDocument();
    });

    it('should show logout button when authenticated', () => {
      render(
        <TestWrapper isAuthenticated={true} user={mockUser}>
          <Header />
        </TestWrapper>
      );

      expect(screen.getByText('Abmelden')).toBeInTheDocument();
    });

    it('should not show login/register links when authenticated', () => {
      render(
        <TestWrapper isAuthenticated={true} user={mockUser}>
          <Header />
        </TestWrapper>
      );

      expect(screen.queryByText('Anmelden')).not.toBeInTheDocument();
      expect(screen.queryByText('Registrieren')).not.toBeInTheDocument();
    });

    it('should show admin link for admin users', () => {
      const adminUser = { ...mockUser, role: 'ADMIN' };
      
      render(
        <TestWrapper isAuthenticated={true} user={adminUser}>
          <Header />
        </TestWrapper>
      );

      expect(screen.getByText('Admin')).toBeInTheDocument();
    });

    it('should not show admin link for regular users', () => {
      render(
        <TestWrapper isAuthenticated={true} user={mockUser}>
          <Header />
        </TestWrapper>
      );

      expect(screen.queryByText('Admin')).not.toBeInTheDocument();
    });

    it('should call logout when logout button is clicked', () => {
      render(
        <TestWrapper isAuthenticated={true} user={mockUser}>
          <Header />
        </TestWrapper>
      );

      const logoutButton = screen.getByText('Abmelden');
      fireEvent.click(logoutButton);

      expect(mockLogout).toHaveBeenCalledTimes(1);
    });
  });

  describe('navigation active states', () => {
    it('should highlight active navigation link', () => {
      render(
        <TestWrapper initialEntries={['/lobby']}>
          <Header />
        </TestWrapper>
      );

      const homeLink = screen.getByText('Home').closest('a');
      const lobbyLink = screen.getByText('Lobbies').closest('a');

      expect(homeLink).not.toHaveClass('active');
      expect(lobbyLink).toHaveClass('active');
    });

    it('should highlight home as active on root path', () => {
      render(
        <TestWrapper initialEntries={['/']}>
          <Header />
        </TestWrapper>
      );

      const homeLink = screen.getByText('Home').closest('a');
      expect(homeLink).toHaveClass('active');
    });
  });

  describe('responsive behavior', () => {
    it('should have proper CSS classes for styling', () => {
      render(
        <TestWrapper>
          <Header />
        </TestWrapper>
      );

      const header = screen.getByRole('banner');
      expect(header).toHaveClass('app-header');

      const container = header.querySelector('.header-container');
      expect(container).toBeInTheDocument();

      const nav = screen.getByRole('navigation');
      expect(nav).toHaveClass('main-nav');
    });
  });

  describe('accessibility', () => {
    it('should have proper semantic elements', () => {
      render(
        <TestWrapper>
          <Header />
        </TestWrapper>
      );

      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('should have proper link structure', () => {
      render(
        <TestWrapper>
          <Header />
        </TestWrapper>
      );

      const links = screen.getAllByRole('link');
      expect(links.length).toBeGreaterThan(0);
      
      // Logo link should go to home
      const logoLink = screen.getByText('Football TCG').closest('a');
      expect(logoLink).toHaveAttribute('href', '/');
    });
  });
});