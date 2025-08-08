import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Header from './Header';
import { 
  mockUser,
  mockAdminUser,
  createMockAuthContext
} from '../../test-utils';

// Mock the useAuth hook
const mockLogout = vi.fn();
const mockUseAuth = vi.fn();

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth()
}));

// Test wrapper component
const TestWrapper: React.FC<{ 
  children: React.ReactNode; 
  initialEntries?: string[];
  authContext?: any;
}> = ({ 
  children, 
  initialEntries = ['/'],
  authContext = createMockAuthContext()
}) => {
  // Set up the auth mock for this render
  mockUseAuth.mockReturnValue({
    ...authContext,
    logout: mockLogout
  });

  return (
    <MemoryRouter initialEntries={initialEntries}>
      {children}
    </MemoryRouter>
  );
};

describe('Header Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

      // Check that navigation links are rendered with translation keys as content
      // The global mock returns the key as the translated text
      expect(screen.getByText('navigation.home')).toBeInTheDocument();
      expect(screen.getByText('navigation.lobbies')).toBeInTheDocument();
      expect(screen.getByText('navigation.collection')).toBeInTheDocument();
      expect(screen.getByText('navigation.packs')).toBeInTheDocument();
    });

    it('should show login and register links when not authenticated', () => {
      render(
        <TestWrapper>
          <Header />
        </TestWrapper>
      );

      // Check elements exist with translation key content
      expect(screen.getByText('buttons.login')).toBeInTheDocument();
      expect(screen.getByText('buttons.register')).toBeInTheDocument();
    });

    it('should not show user-specific elements when not authenticated', () => {
      render(
        <TestWrapper>
          <Header />
        </TestWrapper>
      );

      expect(screen.queryByText('buttons.logout')).not.toBeInTheDocument();
      expect(screen.queryByText('1500')).not.toBeInTheDocument();
      expect(screen.queryByText(/👤/)).not.toBeInTheDocument();
    });
  });

  describe('when user is authenticated', () => {
    it('should show user information when authenticated', () => {
      render(
        <TestWrapper authContext={createMockAuthContext(true, mockUser)}>
          <Header />
        </TestWrapper>
      );

      expect(screen.getByText(/👤.*testuser/)).toBeInTheDocument();
      expect(screen.getByText(/💰.*1500/)).toBeInTheDocument();
    });

    it('should show logout button when authenticated', () => {
      render(
        <TestWrapper authContext={createMockAuthContext(true, mockUser)}>
          <Header />
        </TestWrapper>
      );

      expect(screen.getByText('buttons.logout')).toBeInTheDocument();
    });

    it('should not show login/register links when authenticated', () => {
      render(
        <TestWrapper authContext={createMockAuthContext(true, mockUser)}>
          <Header />
        </TestWrapper>
      );

      expect(screen.queryByText('buttons.login')).not.toBeInTheDocument();
      expect(screen.queryByText('buttons.register')).not.toBeInTheDocument();
    });

    it('should show admin link for admin users', () => {
      render(
        <TestWrapper authContext={createMockAuthContext(true, mockAdminUser)}>
          <Header />
        </TestWrapper>
      );
      
      // The admin link contains both emoji and translation key
      expect(screen.getByText(/🔧.*navigation\.admin/)).toBeInTheDocument();
      
      // Verify the admin link has correct CSS class
      const adminLink = screen.getByText(/🔧.*navigation\.admin/).closest('a');
      expect(adminLink).toHaveClass('admin-link');
    });

    it('should not show admin link for regular users', () => {
      render(
        <TestWrapper authContext={createMockAuthContext(true, mockUser)}>
          <Header />
        </TestWrapper>
      );

      expect(screen.queryByText(/🔧.*navigation\.admin/)).not.toBeInTheDocument();
      expect(screen.queryByText('navigation.admin')).not.toBeInTheDocument();
    });

    it('should call logout when logout button is clicked', () => {
      render(
        <TestWrapper authContext={createMockAuthContext(true, mockUser)}>
          <Header />
        </TestWrapper>
      );

      const logoutButton = screen.getByText('buttons.logout');
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

      const homeLink = screen.getByText('navigation.home').closest('a');
      const lobbyLink = screen.getByText('navigation.lobbies').closest('a');

      expect(homeLink).not.toHaveClass('active');
      expect(lobbyLink).toHaveClass('active');
    });

    it('should highlight home as active on root path', () => {
      render(
        <TestWrapper initialEntries={['/']}>
          <Header />
        </TestWrapper>
      );

      const homeLink = screen.getByText('navigation.home').closest('a');
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